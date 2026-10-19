/**
 * Account sign-up, sign-in, password reset and sessions, stored in MongoDB (see db.ts).
 *
 * - Passwords and emailed codes are stored only as bcrypt hashes.
 * - Sign-in tokens are random 32-byte values; only their SHA-256 hash is stored, so a database
 *   leak can't be used to sign in. Sessions expire after 30 days.
 * - Codes expire after 10 minutes, allow 5 attempts and can be resent every 60 seconds.
 * - 10 wrong passwords in a row pause sign-in for that account for 15 minutes.
 */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

import { collections, type UserDoc } from "./db";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  is_verified: boolean;
  emailVerified: boolean;
  twoFactorVerified: boolean;
  createdAt: string;
  avatarUrl?: string | null;
}

export interface AuthResponseBody {
  success: boolean;
  error?: string | undefined;
  message?: string | undefined;
  email?: string | undefined;
  retryAfter?: number | undefined;
  token?: string | undefined;
  user?: AuthUser | undefined;
  expired?: boolean | undefined;
  locked?: boolean | undefined;
  attempts?: number | undefined;
  remainingAttempts?: number | undefined;
}

export interface AuthResult {
  status: number;
  body: AuthResponseBody;
}

const IS_DEV = import.meta.env.DEV;
const RESEND_COOLDOWN_MS = 60_000;
const CODE_VALIDITY_MS = 10 * 60_000;
/** Pending sign-ups and reset requests are deleted a day after they were last sent */
const RECORD_LIFETIME_MS = 24 * 60 * 60_000;
const MAX_CODE_ATTEMPTS = 5;
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60_000;
const MAX_FAILED_LOGINS = 10;
const LOGIN_LOCK_MS = 15 * 60_000;
const MIN_PASSWORD_LENGTH = 8;

const fail = (
  status: number,
  error: string,
  extra: Partial<AuthResponseBody> = {},
): AuthResult => ({
  status,
  body: { success: false, error, ...extra },
});

function toAuthUser(user: UserDoc): AuthUser {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    is_verified: true,
    emailVerified: true,
    twoFactorVerified: true,
    createdAt: user.created_at.toISOString(),
  };
}

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/** Starts a 30-day session for the user and returns its token (only its hash is stored). */
async function createSession(userId: string) {
  const { sessions } = await collections();
  const token = "vtr_" + crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  await sessions.insertOne({
    _id: hashToken(token),
    user_id: userId,
    created_at: now,
    expires_at: new Date(now.getTime() + SESSION_LIFETIME_MS),
  });
  return token;
}

function readToken(authHeaderOrToken: string | null | undefined) {
  if (!authHeaderOrToken) return null;
  const token = authHeaderOrToken.replace(/^Bearer\s+/i, "").trim();
  return token.startsWith("vtr_") && token.length <= 200 ? token : null;
}

/** The live session for a token (or "Bearer <token>" header), or null. */
export async function verifySessionToken(
  authHeaderOrToken: string | null | undefined,
): Promise<{ userId: string } | null> {
  const token = readToken(authHeaderOrToken);
  if (!token) return null;
  const { sessions } = await collections();
  const session = await sessions.findOne({ _id: hashToken(token) });
  if (!session || session.expires_at.getTime() <= Date.now()) return null;
  return { userId: session.user_id };
}

/**
 * The signed-in user for a session token, or null when the token is unknown, expired or from an
 * older version of the app.
 */
export async function getSessionUser(
  authHeaderOrToken: string | null | undefined,
): Promise<AuthUser | null> {
  const session = await verifySessionToken(authHeaderOrToken);
  if (!session) return null;
  const { users } = await collections();
  const user = await users.findOne({ _id: session.userId });
  return user ? toAuthUser(user) : null;
}

/** Ends a session (sign out). Unknown tokens are ignored. */
export async function handleLogout(
  authHeaderOrToken: string | null | undefined,
): Promise<AuthResult> {
  const token = readToken(authHeaderOrToken);
  if (token) {
    const { sessions } = await collections();
    await sessions.deleteOne({ _id: hashToken(token) });
  }
  return { status: 200, body: { success: true, message: "Signed out." } };
}

/**
 * Sanitize email input to prevent script/injection attacks
 */
export function sanitizeEmail(email: unknown): string {
  if (typeof email !== "string") return "";
  return email
    .trim()
    .toLowerCase()
    .replace(/[^\w.@+-]/g, "");
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Codes are emailed via SMTP. In production without an email sender, sign-up and password
 * reset can't work, so they're refused with a clear message instead of silently doing nothing.
 */
function emailUnavailable(): AuthResult | null {
  if (getTransporter() || IS_DEV) return null;
  return fail(
    503,
    "Email isn't set up on this server yet, so verification codes can't be sent. Please try again later.",
  );
}

const secondsLeft = (lastSent: Date) =>
  Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - lastSent.getTime())) / 1000);

const newCode = () => crypto.randomInt(100000, 1000000).toString();

/**
 * Create a configured Nodemailer transporter with SMTP or fallback
 */
function getTransporter() {
  const host = process.env["SMTP_HOST"];
  const port = Number(process.env["SMTP_PORT"]) || 587;
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Fallback transporter: logs to server console in dev/sandbox
  return null;
}

/**
 * Sends a real email with the 6-digit OTP code
 */
export async function sendOtpEmail(toEmail: string, otpCode: string): Promise<boolean> {
  const from = process.env["SMTP_FROM"] || '"Virtual Try Room" <noreply@virtualtryroom.com>';
  const subject = "Your 6-Digit Verification Code — Virtual Try Room";
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #faf9f7; color: #1c1917; border-radius: 8px; border: 1px solid #e7e5e4;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h1 style="font-size: 24px; font-weight: 600; margin: 0; color: #1c1917; letter-spacing: -0.02em;">Virtual Try Room</h1>
        <p style="font-size: 13px; color: #78716c; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.1em;">Email Verification</p>
      </div>
      <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 6px; padding: 28px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <p style="font-size: 15px; margin: 0 0 16px; color: #292524;">
          Here is your 6-digit verification code to activate your account:
        </p>
        <div style="display: inline-block; padding: 14px 28px; background-color: #f5f5f4; border: 1px solid #d6d3d1; border-radius: 6px; font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0c0a09; margin: 8px 0 16px;">
          ${otpCode}
        </div>
        <p style="font-size: 13px; color: #78716c; margin: 12px 0 0;">
          This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
        </p>
      </div>
      <div style="margin-top: 24px; text-align: center; font-size: 12px; color: #a8a29e;">
        <p style="margin: 0;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    </div>
  `;

  const textContent = `Virtual Try Room\n\nYour 6-digit verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.\nIf you did not request this verification, please ignore this message.`;

  console.log(`\n============================================================`);
  console.log(`[EMAIL DISPATCH] Destination: <${toEmail}>`);
  if (IS_DEV) console.log(`[EMAIL DISPATCH] 6-Digit OTP Code: [${otpCode}]`);
  console.log(`[EMAIL DISPATCH] Sent At: ${new Date().toISOString()}`);
  console.log(`============================================================\n`);

  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[EMAIL DISPATCH] Successfully delivered email via SMTP to ${toEmail}`);
      return true;
    } catch (err) {
      console.error(`[EMAIL DISPATCH] SMTP delivery failed:`, err);
      return false;
    }
  }

  return true;
}

/**
 * Sends a password reset email with the 6-digit OTP code
 */
export async function sendPasswordResetEmail(toEmail: string, otpCode: string): Promise<boolean> {
  const from = process.env["SMTP_FROM"] || '"Virtual Try Room" <noreply@virtualtryroom.com>';
  const subject = "Password Reset Code — Virtual Try Room";
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #faf9f7; color: #1c1917; border-radius: 8px; border: 1px solid #e7e5e4;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h1 style="font-size: 24px; font-weight: 600; margin: 0; color: #1c1917; letter-spacing: -0.02em;">Virtual Try Room</h1>
        <p style="font-size: 13px; color: #78716c; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.1em;">Password Reset</p>
      </div>
      <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 6px; padding: 28px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <p style="font-size: 15px; margin: 0 0 16px; color: #292524;">
          Here is your 6-digit verification code to reset your account password:
        </p>
        <div style="display: inline-block; padding: 14px 28px; background-color: #f5f5f4; border: 1px solid #d6d3d1; border-radius: 6px; font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0c0a09; margin: 8px 0 16px;">
          ${otpCode}
        </div>
        <p style="font-size: 13px; color: #78716c; margin: 12px 0 0;">
          This code is valid for <strong>10 minutes</strong>. If you did not request this, your account remains secure.
        </p>
      </div>
    </div>
  `;

  const textContent = `Virtual Try Room\n\nYour 6-digit password reset code is: ${otpCode}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this message.`;

  console.log(`\n============================================================`);
  console.log(`[PASSWORD RESET DISPATCH] Destination: <${toEmail}>`);
  if (IS_DEV) console.log(`[PASSWORD RESET DISPATCH] 6-Digit OTP Code: [${otpCode}]`);
  console.log(`[PASSWORD RESET DISPATCH] Sent At: ${new Date().toISOString()}`);
  console.log(`============================================================\n`);

  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[PASSWORD RESET DISPATCH] Successfully delivered email via SMTP to ${toEmail}`);
      return true;
    } catch (err) {
      console.error(`[PASSWORD RESET DISPATCH] SMTP delivery failed:`, err);
      return false;
    }
  }

  return true;
}

/**
 * Sign in with email and password. A wrong email and a wrong password get the same message so
 * the form can't be used to find out who has an account.
 */
export async function handleLogin(body: {
  email?: string | undefined;
  password?: string | undefined;
}): Promise<AuthResult> {
  const email = sanitizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return fail(400, "Please enter your email and password.");

  const { users } = await collections();
  const user = await users.findOne({ email });
  if (!user) {
    // Same work as a real check, so response time doesn't reveal whether the account exists
    await bcrypt.compare(password, DUMMY_HASH);
    return fail(401, "Invalid email or password.");
  }

  if (user.locked_until && user.locked_until.getTime() > Date.now()) {
    const minutes = Math.ceil((user.locked_until.getTime() - Date.now()) / 60_000);
    return fail(
      429,
      `Too many wrong passwords. Sign-in for this account is paused for ${minutes} more minute${minutes === 1 ? "" : "s"}, or reset your password.`,
      { locked: true },
    );
  }

  if (!(await bcrypt.compare(password, user.password_hash))) {
    const failed = user.failed_logins + 1;
    await users.updateOne(
      { _id: user._id },
      failed >= MAX_FAILED_LOGINS
        ? { $set: { failed_logins: 0, locked_until: new Date(Date.now() + LOGIN_LOCK_MS) } }
        : { $set: { failed_logins: failed } },
    );
    return fail(401, "Invalid email or password.");
  }

  if (user.failed_logins || user.locked_until) {
    await users.updateOne({ _id: user._id }, { $set: { failed_logins: 0, locked_until: null } });
  }
  const token = await createSession(user._id);
  return {
    status: 200,
    body: { success: true, message: "Logged in successfully.", token, user: toAuthUser(user) },
  };
}

/** A bcrypt hash of a random value, used to keep failed sign-ins for unknown emails slow too */
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 10);

/**
 * Sign-up: validates the details, creates the account and signs it in straight away (no emailed
 * code). Passwords are stored only as bcrypt hashes.
 */
export async function handleRegister(body: {
  email?: string | undefined;
  password?: string | undefined;
  name?: string | undefined;
}): Promise<AuthResult> {
  const email = sanitizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 80)
      : email.split("@")[0] || "User";

  if (!email || !EMAIL_PATTERN.test(email)) {
    return fail(400, "Please provide a valid email address.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }
  if (password.length > 200) return fail(400, "Password is too long.");

  const exists = fail(
    409,
    "An account with this email address already exists. Please log in instead.",
  );
  const { users } = await collections();
  if (await users.findOne({ email }, { projection: { _id: 1 } })) return exists;

  const user: UserDoc = {
    _id: "usr_" + crypto.randomBytes(12).toString("hex"),
    email,
    name,
    password_hash: await bcrypt.hash(password, 12),
    created_at: new Date(),
    failed_logins: 0,
    locked_until: null,
  };
  try {
    await users.insertOne(user);
  } catch (error) {
    // Duplicate email (unique index): two sign-ups for the same address at once
    if ((error as { code?: number }).code === 11000) return exists;
    throw error;
  }

  const token = await createSession(user._id);
  return {
    status: 200,
    body: { success: true, message: "Account created.", token, user: toAuthUser(user) },
  };
}

/**
 * Password reset step 1: emails a 6-digit code. The reply is the same whether or not the email
 * has an account, so the form can't be used to find out who is registered.
 */
export async function handleRequestPasswordReset(body: {
  email?: string | undefined;
}): Promise<AuthResult> {
  const unavailable = emailUnavailable();
  if (unavailable) return unavailable;

  const email = sanitizeEmail(body.email);
  if (!email || !EMAIL_PATTERN.test(email)) return fail(400, "Please enter a valid email address.");

  const sent: AuthResult = {
    status: 200,
    body: {
      success: true,
      message: "If an account exists for this email, a reset code has been sent to it.",
      email,
    },
  };

  const { users, resets } = await collections();
  const existing = await resets.findOne({ _id: email });
  if (existing && Date.now() - existing.last_sent_at.getTime() < RESEND_COOLDOWN_MS) {
    const wait = secondsLeft(existing.last_sent_at);
    return fail(429, `Please wait ${wait} seconds before requesting another reset code.`, {
      retryAfter: wait,
    });
  }
  if (!(await users.findOne({ email }, { projection: { _id: 1 } }))) return sent;

  const code = newCode();
  const now = new Date();
  await resets.replaceOne(
    { _id: email },
    {
      code_hash: await bcrypt.hash(code, 10),
      expires_at: new Date(now.getTime() + CODE_VALIDITY_MS),
      attempts: 0,
      last_sent_at: now,
      purge_at: new Date(now.getTime() + RECORD_LIFETIME_MS),
    },
    { upsert: true },
  );
  if (!(await sendPasswordResetEmail(email, code))) {
    return fail(502, "We couldn't send the reset email. Please try again shortly.");
  }
  return sent;
}

/**
 * Password reset step 2: checks the code, sets the new password and signs the account out
 * everywhere (all existing sessions end).
 */
export async function handleResetPassword(body: {
  email?: string | undefined;
  code?: string | undefined;
  new_password?: string | undefined;
}): Promise<AuthResult> {
  const email = sanitizeEmail(body.email);
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const newPassword = typeof body.new_password === "string" ? body.new_password : "";

  if (!email || !code) {
    return fail(400, "Email address and 6-digit verification code are required.");
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return fail(400, `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }
  if (newPassword.length > 200) return fail(400, "Password is too long.");

  const { users, resets, sessions } = await collections();
  const record = await resets.findOne({ _id: email });
  if (!record) {
    return fail(
      404,
      "No active password reset request found for this email. Please request a new code.",
    );
  }
  if (Date.now() > record.expires_at.getTime()) {
    return fail(400, "Reset code has expired. Please request a new code.", { expired: true });
  }
  if (record.attempts >= MAX_CODE_ATTEMPTS) {
    return fail(429, "Too many failed attempts. Please request a new reset code.", {
      locked: true,
    });
  }

  if (!(await bcrypt.compare(code, record.code_hash))) {
    const attempts = record.attempts + 1;
    await resets.updateOne({ _id: email }, { $set: { attempts } });
    const remaining = MAX_CODE_ATTEMPTS - attempts;
    return fail(
      400,
      remaining > 0
        ? `Invalid verification code. ${remaining} attempt(s) remaining.`
        : "Maximum attempts reached. Please request a new reset code.",
      { attempts, remainingAttempts: remaining },
    );
  }

  const user = await users.findOne({ email });
  if (!user) return fail(404, "User account not found. Please sign up.");

  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        password_hash: await bcrypt.hash(newPassword, 12),
        failed_logins: 0,
        locked_until: null,
      },
    },
  );
  await Promise.all([resets.deleteOne({ _id: email }), sessions.deleteMany({ user_id: user._id })]);

  return {
    status: 200,
    body: {
      success: true,
      message: "Password updated successfully. Please log in with your new password.",
      email,
    },
  };
}
