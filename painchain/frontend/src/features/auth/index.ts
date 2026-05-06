// Auth feature exports

// Context
export { AuthProvider, useAuth } from './context/AuthContext';

// Components
export { LoginPage } from './components/LoginPage';
export { RegisterPage } from './components/RegisterPage';
export { ProtectedRoute } from './components/ProtectedRoute';
export { OIDCCallback } from './components/OIDCCallback';
export { TeamsTab } from './components/TeamsTab';

// Hooks
export { useAuthMethods } from './hooks/useAuthMethods';
export { useInvitation } from './hooks/useInvitation';
export { useInvitations } from './hooks/useInvitations';
export { useTeamMembers } from './hooks/useTeamMembers';

// Types
export type {
  User,
  Tenant,
  AuthMethods,
  OIDCProvider,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  Invitation,
  InvitationDetails,
  TeamMember,
  CreateInvitationData,
  Session,
} from './types/auth.types';
