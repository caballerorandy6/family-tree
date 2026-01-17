import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@familytree/database';
import { env } from '../config/env';
import type { JwtPayload, AuthTokens, UserWithoutPassword } from '@familytree/types/auth.types';
import { AppError } from '../middleware/error.middleware';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

function generateTokens(userId: string, email: string): AuthTokens {
  const payload: JwtPayload = { userId, email };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
}

function sanitizeUser(user: {
  id: string;
  email: string;
  name: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}): UserWithoutPassword {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<{ user: UserWithoutPassword; tokens: AuthTokens }> {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new AppError(409, 'EMAIL_EXISTS', 'A user with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const tokens = generateTokens(user.id, user.email);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  return { user: sanitizeUser(user), tokens };
}

export async function login(
  email: string,
  password: string
): Promise<{ user: UserWithoutPassword; tokens: AuthTokens }> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user?.password) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const tokens = generateTokens(user.id, user.email);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  return {
    user: sanitizeUser({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }),
    tokens,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  try {
    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, refreshToken: true },
    });

    if (!user || user.refreshToken !== refreshToken) {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
    }

    const tokens = generateTokens(user.id, user.email);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    return tokens;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
  }
}

export async function logout(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
}

export async function googleAuth(
  idToken: string
): Promise<{ user: UserWithoutPassword; tokens: AuthTokens }> {
  if (!googleClient) {
    throw new AppError(500, 'GOOGLE_NOT_CONFIGURED', 'Google authentication is not configured');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload?.email || !payload?.sub) {
    throw new AppError(400, 'INVALID_GOOGLE_TOKEN', 'Invalid Google ID token');
  }

  let user = await prisma.user.findUnique({
    where: { googleId: payload.sub },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: payload.sub,
          image: payload.picture ?? user.image,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name ?? payload.email.split('@')[0] ?? 'User',
          googleId: payload.sub,
          image: payload.picture,
        },
      });
    }
  }

  const tokens = generateTokens(user.id, user.email);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  return {
    user: sanitizeUser({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }),
    tokens,
  };
}

export async function getUserById(userId: string): Promise<UserWithoutPassword | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user ? sanitizeUser(user) : null;
}
