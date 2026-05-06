// Authentication types

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  createdAt: string;
  lastLoginAt: string | null;
  tenant: Tenant;
  oidcAccounts: OIDCAccount[];
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export interface OIDCAccount {
  id: string;
  providerId: string;
  providerUserId: string;
}

export interface AuthMethods {
  basicAuth: boolean;
  allowRegistration: boolean;
  oidcProviders: OIDCProvider[];
}

export interface OIDCProvider {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  organizationName?: string;
  invitationToken?: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
}

export interface Invitation {
  id: string;
  tenantId: string;
  token: string;
  role: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedBy: string | null;
  usedAt: string | null;
  maxUses: number;
  useCount: number;
  isRevoked: boolean;
  revokedAt: string | null;
  revokedBy: string | null;
  inviteUrl?: string;
}

export interface InvitationDetails {
  token: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  role: string;
  expiresAt: string;
  isValid: boolean;
}

export interface TeamMember {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  createdAt: string;
  lastLoginAt: string | null;
}

export interface CreateInvitationData {
  role?: string;
  expiresInDays?: number;
  maxUses?: number;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
  userAgent: string | null;
  ipAddress: string | null;
}
