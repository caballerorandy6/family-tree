import NextAuth from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { Provider } from 'next-auth/providers';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { api } from './api';
import type { AuthTokens, UserWithoutPassword } from '@familytree/types/auth.types';

// Check if Google OAuth is properly configured
const isGoogleOAuthConfigured =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id' &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_SECRET !== 'your-google-client-secret';

export { isGoogleOAuthConfigured };

interface CustomJWT extends JWT {
  accessToken?: string;
  refreshToken?: string;
  user?: UserWithoutPassword;
  expiresAt?: number;
}

declare module 'next-auth' {
  interface Session {
    accessToken: string;
    user: UserWithoutPassword;
  }

  interface User {
    accessToken: string;
    refreshToken: string;
    user: UserWithoutPassword;
  }
}

// Build providers array conditionally
const providers: Provider[] = [
  Credentials({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const response = await api<{ user: UserWithoutPassword; tokens: AuthTokens }>('/auth/login', {
        method: 'POST',
        body: {
          email: credentials.email,
          password: credentials.password,
        },
      });

      if (!response.success) {
        return null;
      }

      return {
        id: response.data.user.id,
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken,
        user: response.data.user,
      };
    },
  }),
];

// Only add Google provider if properly configured
if (isGoogleOAuthConfigured) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}

const nextAuth = NextAuth({
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      const customToken = token as CustomJWT;

      if (user && account?.provider === 'credentials') {
        return {
          ...customToken,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          user: user.user,
          expiresAt: Date.now() + 55 * 60 * 1000, // 55 minutes (5 min buffer before 1h expiry)
        } as CustomJWT;
      }

      if (user && account?.provider === 'google') {
        const response = await api<{ user: UserWithoutPassword; tokens: AuthTokens }>('/auth/google', {
          method: 'POST',
          body: { idToken: account.id_token },
        });

        if (response.success) {
          return {
            ...customToken,
            accessToken: response.data.tokens.accessToken,
            refreshToken: response.data.tokens.refreshToken,
            user: response.data.user,
            expiresAt: Date.now() + 55 * 60 * 1000, // 55 minutes
          } as CustomJWT;
        }
      }

      // Return existing token if not expired
      if (customToken.expiresAt && Date.now() < customToken.expiresAt) {
        return customToken;
      }

      // Refresh the token
      if (customToken.refreshToken) {
        try {
          const response = await api<AuthTokens>('/auth/refresh', {
            method: 'POST',
            body: { refreshToken: customToken.refreshToken },
          });

          if (response.success) {
            return {
              ...customToken,
              accessToken: response.data.accessToken,
              refreshToken: response.data.refreshToken,
              expiresAt: Date.now() + 55 * 60 * 1000, // 55 minutes
            } as CustomJWT;
          }
        } catch {
          // Refresh failed, return token to trigger re-login
          return { ...customToken, expiresAt: 0 };
        }
      }

      // Token expired and no refresh token, force re-login
      return { ...customToken, expiresAt: 0 };
    },
    async session({ session, token }) {
      const customToken = token as CustomJWT;
      if (customToken.accessToken) {
        session.accessToken = customToken.accessToken;
      }
      if (customToken.user) {
        // Merge user data into session user
        Object.assign(session.user, customToken.user);
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
});

// Re-export as separate functions to avoid pnpm hoisting type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handlers: any = nextAuth.handlers;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signIn: any = nextAuth.signIn;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signOut: any = nextAuth.signOut;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: any = nextAuth.auth;
