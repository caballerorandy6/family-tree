export interface User {
  id: string;
  email: string;
  name: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithoutPassword extends User {
  password?: never;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface GoogleAuthPayload {
  idToken: string;
}

export interface AuthSession {
  user: UserWithoutPassword;
  accessToken: string;
  expiresAt: number;
}
