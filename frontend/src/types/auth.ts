export type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'DATA_ANALYST' | 'VIEWER';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  organizationId: string;
  organization?: Organization;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  severity?: 'INFO' | 'WARNING' | 'SECURITY' | 'CRITICAL';
  module?: string;
  status?: string;
  details: string;
  ipAddress: string;
  integrityHash?: string;
  previousHash?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
