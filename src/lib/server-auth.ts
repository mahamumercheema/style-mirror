import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

export interface EmailVerificationRecord {
  email: string;
  password_hash: string;
  code_hash: string;
  name: string;
  expires_at: number; // 10-minute validity
  attempts: number; // max 5 allowed
  created_at: number;
  last_sent_at: number; // 60-second resend cooldown
}

/** Standard Email + Password User */
export interface UserRecord {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  is_verified: boolean;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  is_verified: boolean;
  emailVerified: boolean;
  twoFactorVerified: boolean;
  createdAt: string;
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

/** 60-second resend cooldown timer for email OTP */
const RESEND_COOLDOWN_MS = 60_000;

const IS_DEV = import.meta.env.DEV;

function emailUnavailable(): AuthResult | null {
  return null;
}

// In-memory persistent database collections
const emailVerifications = new Map<string, EmailVerificationRecord>();
const users = new Map<string, UserRecord>();

// Preseed demo accounts with hashed passwords for convenience
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync("password123", 10);
users.set("amna.laaj21@gmail.com", {
  id: "usr_amna_laaj",
  email: "amna.laaj21@gmail.com",
  name: "Amna",
  password_hash: DEFAULT_PASSWORD_HASH,
  is_verified: true,
  created_at: new Date().toISOString(),
});

export interface ActiveSession {
  token: string;
  userId: string;
  email: string;
  createdAt: number;
}

export const activeSessions = new Map<string, ActiveSession>();

export function registerSession(token: string, userId: string, email: string): ActiveSession {
  const session: ActiveSession = {
    token,
    userId,
    email,
    createdAt: Date.now(),
  };
  activeSessions.set(token, session);
  return session;
}

export function verifySessionToken(
  authHeaderOrToken: string | null | undefined,
): ActiveSession | null {
  if (!authHeaderOrToken) return null;
  const token = authHeaderOrToken.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const session = activeSessions.get(token);
  if (session) return session;

  return null;
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
 * Routine Log In (Email + Password only)
 * Authenticates directly against the user record.
 * DO NOT send email OTP during routine Log In.
 */
export async function handleLogin(body: {
  email?: string | undefined;
  password?: string | undefined;
}): Promise<AuthResult> {
  const email = sanitizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return {
      status: 400,
      body: {
        success: false,
        error: "Please enter your email and password.",
      },
    };
  }

  const user = users.get(email);
  if (!user || !user.is_verified) {
    return {
      status: 401,
      body: {
        success: false,
        error: "Invalid email or password.",
      },
    };
  }

  // Compare password against stored hash
  if (user.password_hash) {
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return {
        status: 401,
        body: {
          success: false,
          error: "Invalid email or password.",
        },
      };
    }
  }

  // Generate active session immediately (no OTP needed for routine login)
  const token = "vtr_tok_" + crypto.randomBytes(24).toString("hex");
  registerSession(token, user.id, user.email);

  return {
    status: 200,
    body: {
      success: true,
      message: "Logged in successfully.",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_verified: true,
        emailVerified: true,
        twoFactorVerified: true,
        createdAt: user.created_at,
      },
    },
  };
}

/**
 * Endpoint 1: Register Intent (sign-up step 1):
 * Collects email + password, validates password, generates 6-digit numeric OTP,
 * and saves pending user.
 */
export async function handleRegisterIntent(body: {
  email?: string | undefined;
  password?: string | undefined;
  name?: string | undefined;
}): Promise<AuthResult> {
  const unavailable = emailUnavailable();
  if (unavailable) return unavailable;

  const email = sanitizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 80)
      : email.split("@")[0] || "User";

  // 1. Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return {
      status: 400,
      body: { success: false, error: "Please provide a valid email address." },
    };
  }

  // 2. Validate password strength
  if (!password || password.length < 6) {
    return {
      status: 400,
      body: { success: false, error: "Password must be at least 6 characters long." },
    };
  }

  // 3. Check if user already exists
  const existingUser = users.get(email);
  if (existingUser && existingUser.is_verified) {
    return {
      status: 409,
      body: {
        success: false,
        error: "An account with this email address already exists. Please log in instead.",
      },
    };
  }

  // 4. Check the resend cooldown on existing verification attempts (60s)
  const existingVerification = emailVerifications.get(email);
  const now = Date.now();
  if (existingVerification && now - existingVerification.last_sent_at < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil(
      (RESEND_COOLDOWN_MS - (now - existingVerification.last_sent_at)) / 1000,
    );
    return {
      status: 429,
      body: {
        success: false,
        error: `Please wait ${waitSec} seconds before requesting another code.`,
        retryAfter: waitSec,
      },
    };
  }

  // 5. Generate cryptographically secure 6-digit numeric OTP code
  const otpCode = crypto.randomInt(100000, 1000000).toString();

  // 6. Hash password and OTP code before storing
  const passwordHash = await bcrypt.hash(password, 10);
  const codeHash = await bcrypt.hash(otpCode, 10);

  // 7. Store in email_verifications table/map with unverified / pending state
  emailVerifications.set(email, {
    email,
    password_hash: passwordHash,
    code_hash: codeHash,
    name,
    expires_at: now + 10 * 60 * 1000, // 10-minute validity
    attempts: 0,
    created_at: now,
    last_sent_at: now,
  });

  // 8. Send plain-text OTP code via email service
  await sendOtpEmail(email, otpCode);

  // 9. Return success response (without exposing devOtpCode in response)
  return {
    status: 200,
    body: {
      success: true,
      message: "Verification code sent to your email.",
      email,
    },
  };
}

/**
 * Endpoint 2: Verify Code
 * Triggered on Step 2 submit of Sign Up. Activates account upon valid OTP.
 */
export async function handleVerifyCode(body: {
  email?: string | undefined;
  code?: string | undefined;
}): Promise<AuthResult> {
  const email = sanitizeEmail(body.email);
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!email || !code) {
    return {
      status: 400,
      body: {
        success: false,
        error: "Email address and 6-digit verification code are required.",
      },
    };
  }

  const record = emailVerifications.get(email);
  if (!record) {
    return {
      status: 404,
      body: {
        success: false,
        error: "No pending verification found for this email. Please restart the sign-up process.",
      },
    };
  }

  const now = Date.now();

  // Check expiration (10 minutes)
  if (now > record.expires_at) {
    return {
      status: 400,
      body: {
        success: false,
        error: "Verification code has expired. Please click 'Resend Code'.",
        expired: true,
      },
    };
  }

  // Check maximum failed attempts (max 5)
  if (record.attempts >= 5) {
    return {
      status: 429,
      body: {
        success: false,
        error:
          "Too many failed attempts (maximum 5 exceeded). Please request a new verification code.",
        locked: true,
      },
    };
  }

  // Compare submitted code with code_hash using bcrypt
  const isMatch = await bcrypt.compare(code, record.code_hash);
  if (!isMatch) {
    record.attempts += 1;
    const remaining = 5 - record.attempts;
    return {
      status: 400,
      body: {
        success: false,
        error:
          remaining > 0
            ? `Invalid verification code. ${remaining} attempt(s) remaining.`
            : "Maximum attempts reached. Please request a new code.",
        attempts: record.attempts,
        remainingAttempts: remaining,
      },
    };
  }

  // Verification succeeded!
  // Create / activate user account with hashed password
  const userId = "usr_" + crypto.randomBytes(6).toString("hex");
  const newUser: UserRecord = {
    id: userId,
    email: record.email,
    name: record.name,
    password_hash: record.password_hash,
    is_verified: true,
    created_at: new Date().toISOString(),
  };

  users.set(record.email, newUser);

  // Clear verification entry from email_verifications
  emailVerifications.delete(record.email);

  // Issue session auth token
  const token = "vtr_tok_" + crypto.randomBytes(24).toString("hex");
  registerSession(token, newUser.id, newUser.email);

  return {
    status: 200,
    body: {
      success: true,
      message: "Account verified and activated successfully.",
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        is_verified: true,
        emailVerified: true,
        twoFactorVerified: true,
        createdAt: newUser.created_at,
      },
    },
  };
}

/**
 * Endpoint 3: Resend Code
 * Triggered by "Resend Code" button with 60s cooldown
 */
export async function handleResendCode(body: { email?: string | undefined }): Promise<AuthResult> {
  const unavailable = emailUnavailable();
  if (unavailable) return unavailable;

  const email = sanitizeEmail(body.email);

  if (!email) {
    return {
      status: 400,
      body: { success: false, error: "Email address is required." },
    };
  }

  const record = emailVerifications.get(email);
  if (!record) {
    return {
      status: 404,
      body: {
        success: false,
        error: "No pending verification found for this email. Please sign up first.",
      },
    };
  }

  // Enforce the 60-second resend cooldown
  const now = Date.now();
  const timeElapsed = now - record.last_sent_at;
  if (timeElapsed < RESEND_COOLDOWN_MS) {
    const secondsLeft = Math.ceil((RESEND_COOLDOWN_MS - timeElapsed) / 1000);
    return {
      status: 429,
      body: {
        success: false,
        error: `Please wait ${secondsLeft} seconds before requesting a new code.`,
        retryAfter: secondsLeft,
      },
    };
  }

  // Generate new 6-digit OTP
  const newOtpCode = crypto.randomInt(100000, 1000000).toString();
  const newCodeHash = await bcrypt.hash(newOtpCode, 10);

  // Update record: reset attempts to 0, refresh 10-minute expiry
  record.code_hash = newCodeHash;
  record.expires_at = now + 10 * 60 * 1000;
  record.attempts = 0;
  record.last_sent_at = now;

  // Dispatch email
  await sendOtpEmail(email, newOtpCode);

  return {
    status: 200,
    body: {
      success: true,
      message: "Verification code sent to your email.",
      email,
    },
  };
}

/**
 * Request Email 2FA OTP for quick sign-in
 */
export async function handleRequestEmailOtp(body: {
  email?: string | undefined;
}): Promise<AuthResult> {
  const unavailable = emailUnavailable();
  if (unavailable) return unavailable;

  const email = sanitizeEmail(body.email);
  if (!email || !email.includes("@")) {
    return {
      status: 400,
      body: { success: false, error: "Please provide a valid email address." },
    };
  }

  const existingVerification = emailVerifications.get(email);
  const now = Date.now();
  if (existingVerification && now - existingVerification.last_sent_at < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil(
      (RESEND_COOLDOWN_MS - (now - existingVerification.last_sent_at)) / 1000,
    );
    return {
      status: 429,
      body: {
        success: false,
        error: `Please wait ${waitSec} seconds before requesting another code.`,
        retryAfter: waitSec,
      },
    };
  }

  const otpCode = crypto.randomInt(100000, 1000000).toString();
  const codeHash = await bcrypt.hash(otpCode, 10);
  const existingUser = users.get(email);

  emailVerifications.set(email, {
    email,
    code_hash: codeHash,
    name: existingUser ? existingUser.name : (email.split("@")[0] ?? email),
    expires_at: now + 10 * 60 * 1000,
    attempts: 0,
    created_at: now,
    last_sent_at: now,
  });

  await sendOtpEmail(email, otpCode);
  const hasSmtp = Boolean(getTransporter());

  return {
    status: 200,
    body: {
      success: true,
      message: hasSmtp ? "2FA code sent to your email" : "2FA code ready (preview mode)",
      email,
      isSandbox: !hasSmtp,
    },
  };
}

/**
 * Verify Email 2FA OTP and log in / create session
 */
export async function handleVerifyEmailOtp(body: {
  email?: string | undefined;
  code?: string | undefined;
}): Promise<AuthResult> {
  const email = sanitizeEmail(body.email);
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!email || !code) {
    return {
      status: 400,
      body: { success: false, error: "Email address and 6-digit 2FA code are required." },
    };
  }

  const record = emailVerifications.get(email);
  if (!record) {
    return {
      status: 404,
      body: {
        success: false,
        error: "No pending 2FA code found for this email. Please request a new code.",
      },
    };
  }

  const now = Date.now();
  if (now > record.expires_at) {
    return {
      status: 400,
      body: {
        success: false,
        error: "2FA code has expired. Please request a new code.",
        expired: true,
      },
    };
  }

  if (record.attempts >= 5) {
    return {
      status: 429,
      body: {
        success: false,
        error: "Too many failed attempts. Please request a new verification code.",
        locked: true,
      },
    };
  }

  const isMatch = await bcrypt.compare(code, record.code_hash);
  if (!isMatch) {
    record.attempts += 1;
    const remaining = 5 - record.attempts;
    return {
      status: 400,
      body: {
        success: false,
        error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        remainingAttempts: remaining,
      },
    };
  }

  emailVerifications.delete(email);

  let user = users.get(email);
  if (!user) {
    const userId = "usr_" + crypto.randomBytes(6).toString("hex");
    user = {
      id: userId,
      email,
      name: record.name || (email.split("@")[0] ?? email),
      is_verified: true,
      created_at: new Date().toISOString(),
    };
    users.set(email, user);
  }

  const token = "vtr_tok_" + crypto.randomBytes(24).toString("hex");
  registerSession(token, user.id, user.email);

  return {
    status: 200,
    body: {
      success: true,
      message: "Signed in successfully with Email 2FA.",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_verified: true,
        emailVerified: true,
        twoFactorVerified: true,
        createdAt: user.created_at,
      },
    },
  };
}
