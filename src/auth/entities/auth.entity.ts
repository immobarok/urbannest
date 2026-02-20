import { Role } from '@prisma/client';

// ── Generic message response ─────────────────────────────────
export class MessageResponseEntity {
  message!: string;
}

// ── Register response ────────────────────────────────────────
export class RegisterResponseEntity {
  message!: string;
  role!: Role;
}

// ── User summary returned inside auth tokens ─────────────────
export class AuthUserEntity {
  id!: string;
  email!: string;
  role!: Role;
  firstName!: string;
  lastName!: string;
}

// ── Login / refresh response ─────────────────────────────────
export class AuthTokensEntity {
  access_token!: string;
  refresh_token!: string;
  user!: AuthUserEntity;
}

// ── Profile returned from JWT (GET /auth/me) ─────────────────
export class ProfileEntity {
  id!: string;
  email!: string;
  role!: Role;
  isEmailVerified!: boolean;
}
