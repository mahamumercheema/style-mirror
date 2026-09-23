import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

export interface EmailVerificationRecord {
  email: string;
  code_hash: string;
  pending_password_hash: string;
  name: string;
  expires_at: number; // 10-minute validity
  attempts: number; // max 5 allowed
  created_at: number;
  last_sent_at: number; // 60-second rate limiting
}

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  is_verified: boolean;
  created_at: string;
}

// In-memory persistent database collections
const emailVerifications = new Map<string, EmailVerificationRecord>();
const users = new Map<string, UserRecord>();

// Pre-seed demo users (password: password123)
(async () => {
  const demoHash = await bcrypt.hash("password123", 10);
  users.set("demo@stylemirror.com", {
    id: "usr_demo",
    email: "demo@stylemirror.com",
    password_hash: demoHash,
    name: "Demo User",
    is_verified: true,
    created_at: new Date().toISOString(),
  });
  users.set("amna.laaj21@gmail.com", {
    id: "usr_amna",
    email: "amna.laaj21@gmail.com",
    password_hash: demoHash,
    name: "Amna",
    is_verified: true,
    created_at: new Date().toISOString(),
  });
})();

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
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

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
  const from = process.env.SMTP_FROM || '"Virtual Try Room" <noreply@virtualtryroom.com>';
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
  console.log(`[EMAIL DISPATCH] 6-Digit OTP Code: [${otpCode}]`);
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
 * Endpoint 1: Register Intent
 * Triggered on Step 1 submit
 */
export async function handleRegisterIntent(body: {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const email = sanitizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : password;
  const name =
    typeof body.name === "string" && body.name ? body.name : email.split("@")[0] || "User";

  // 1. Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return {
      status: 400,
      body: { success: false, error: "Please provide a valid email address." },
    };
  }

  // 2. Validate password
  if (!password || password.length < 6) {
    return {
      status: 400,
      body: {
        success: false,
        error: "Password must be at least 6 characters long.",
      },
    };
  }

  if (password !== confirmPassword) {
    return {
      status: 400,
      body: {
        success: false,
        error: "Passwords do not match. Please verify and try again.",
      },
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

  // 4. Check rate limit on existing verification attempts (60s limit)
  const existingVerification = emailVerifications.get(email);
  const now = Date.now();
  if (existingVerification && now - existingVerification.last_sent_at < 60000) {
    const waitSec = Math.ceil((60000 - (now - existingVerification.last_sent_at)) / 1000);
    return {
      status: 429,
      body: {
        success: false,
        error: `Please wait ${waitSec} seconds before requesting another code.`,
        retryAfter: waitSec,
      },
    };
  }

  // 5. Generate cryptographically secure 6-digit OTP code using crypto.randomInt(100000, 1000000)
  const otpCode = crypto.randomInt(100000, 1000000).toString();

  // 6. Hash code and password before storing
  const codeHash = await bcrypt.hash(otpCode, 10);
  const passwordHash = await bcrypt.hash(password, 10);

  // 7. Store in email_verifications table/map
  emailVerifications.set(email, {
    email,
    code_hash: codeHash,
    pending_password_hash: passwordHash,
    name,
    expires_at: now + 10 * 60 * 1000, // 10-minute validity
    attempts: 0,
    created_at: now,
    last_sent_at: now,
  });

  // 8. Send plain-text OTP code via email service
  await sendOtpEmail(email, otpCode);

  const hasSmtp = Boolean(getTransporter());

  // 9. Return success response (provides devOtpCode when external SMTP is not active)
  return {
    status: 200,
    body: {
      success: true,
      message: hasSmtp
        ? "Verification code sent to your email"
        : "Verification code ready (preview mode)",
      email,
      isSandbox: !hasSmtp,
      devOtpCode: !hasSmtp ? otpCode : undefined,
    },
  };
}

/**
 * Endpoint 2: Verify Code
 * Triggered on Step 2 submit
 */
export async function handleVerifyCode(body: {
  email?: string;
  code?: string;
}): Promise<{ status: number; body: Record<string, unknown> }> {
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
  // Create / activate user account
  const userId = "usr_" + crypto.randomBytes(6).toString("hex");
  const newUser: UserRecord = {
    id: userId,
    email: record.email,
    password_hash: record.pending_password_hash,
    name: record.name,
    is_verified: true,
    created_at: new Date().toISOString(),
  };

  users.set(record.email, newUser);

  // Clear verification entry from email_verifications
  emailVerifications.delete(record.email);

  // Issue session auth token
  const token = "vtr_tok_" + crypto.randomBytes(24).toString("hex");

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
 * Triggered by "Resend Code" button
 */
export async function handleResendCode(body: {
  email?: string;
}): Promise<{ status: number; body: Record<string, unknown> }> {
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

  // Enforce 60-second rate limit
  const now = Date.now();
  const timeElapsed = now - record.last_sent_at;
  if (timeElapsed < 60000) {
    const secondsLeft = Math.ceil((60000 - timeElapsed) / 1000);
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

  const hasSmtp = Boolean(getTransporter());

  return {
    status: 200,
    body: {
      success: true,
      message: hasSmtp
        ? "Verification code sent to your email"
        : "Verification code ready (preview mode)",
      email,
      isSandbox: !hasSmtp,
      devOtpCode: !hasSmtp ? newOtpCode : undefined,
    },
  };
}

/**
 * Login Handler (Password verification against hashed credentials)
 */
export async function handleLogin(body: {
  email?: string;
  password?: string;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const email = sanitizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return {
      status: 400,
      body: { success: false, error: "Please provide both email and password." },
    };
  }

  const user = users.get(email);
  if (!user) {
    return {
      status: 401,
      body: {
        success: false,
        error: "No account found with this email. Please sign up first.",
      },
    };
  }

  if (!user.is_verified) {
    return {
      status: 403,
      body: {
        success: false,
        error: "This account has not been verified yet. Please complete verification.",
      },
    };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    return {
      status: 401,
      body: {
        success: false,
        error: "Incorrect password. Please verify your credentials and try again.",
      },
    };
  }

  const token = "vtr_tok_" + crypto.randomBytes(24).toString("hex");

  return {
    status: 200,
    body: {
      success: true,
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
