import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";
import { AppError } from "../../utils/errors.js";
import { logAudit } from "../../middleware/audit.js";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl: string | null;
  };
}

export async function loginWithGoogle(
  idToken: string,
  ip?: string,
): Promise<AuthTokens> {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw AppError.unauthorized("Invalid Google token");
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { googleId: payload.sub },
  });

  if (!user) {
    // Check if user exists by email (maybe created as demo, or pre-registered)
    user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (user) {
      // Link Google account to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: payload.sub,
          avatarUrl: payload.picture ?? user.avatarUrl,
        },
      });
    } else {
      // Brand new user
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name ?? payload.email.split("@")[0],
          googleId: payload.sub,
          avatarUrl: payload.picture,
          role: "EMPLOYEE", // default role for new signups
        },
      });
    }
  }

  if (!user.isActive) {
    throw AppError.forbidden("Account is deactivated");
  }

  const tokens = await issueTokens(user.id, user.email, user.role);

  await logAudit({
    userId: user.id,
    action: "user.login",
    entity: `User:${user.id}`,
    diff: { method: "google" },
    ip,
  });

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
  };
}

export async function loginWithDemo(
  email: string,
  ip?: string,
): Promise<AuthTokens> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isDemo) {
    throw AppError.unauthorized("Invalid demo account");
  }

  const tokens = await issueTokens(user.id, user.email, user.role);

  await logAudit({
    userId: user.id,
    action: "user.login",
    entity: `User:${user.id}`,
    diff: { method: "demo" },
    ip,
  });

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
  };
}

export async function refreshAccessToken(
  oldRefreshToken: string,
  _ip?: string,
): Promise<AuthTokens> {
  try {
    verifyRefreshToken(oldRefreshToken);
  } catch {
    throw AppError.unauthorized("Invalid refresh token");
  }

  const tokenHash = hashToken(oldRefreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    // Token reuse detected or expired — revoke all tokens for this user
    if (storedToken) {
      await prisma.refreshToken.deleteMany({
        where: { userId: storedToken.userId },
      });
    }
    throw AppError.unauthorized("Refresh token expired or reused");
  }

  const user = storedToken.user;
  if (!user.isActive) {
    throw AppError.forbidden("Account is deactivated");
  }

  // Delete old token (rotation)
  await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  const tokens = await issueTokens(user.id, user.email, user.role);

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
  };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken
    .delete({ where: { tokenHash } })
    .catch(() => {
      /* already deleted, fine */
    });
}

// ── Helpers ──────────────────────────────────────────────────

async function issueTokens(
  userId: string,
  email: string,
  role: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({ userId, role, email });

  // Create a new refresh token
  const tokenId = crypto.randomUUID();
  const refreshToken = signRefreshToken(tokenId);
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return { accessToken, refreshToken };
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
