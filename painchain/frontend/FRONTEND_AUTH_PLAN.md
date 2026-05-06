# Frontend Authentication Implementation Plan

**Status:** Ready for Implementation
**Backend Status:** ✅ Complete and Tested (including Multi-Tenancy)
**Last Updated:** 2026-01-06

---

## Overview

This document outlines the complete frontend implementation plan for integrating with the PainChain authentication backend. The backend supports:

- ✅ Basic authentication (email/password)
- ✅ User registration (create org OR join via invitation)
- ✅ OIDC authentication (Google, Okta, Azure, Auth0, etc.)
- ✅ JWT-based sessions with revocation
- ✅ Multi-tenant isolation
- ✅ Session management
- ✅ **Invitation system** (create, list, revoke invite links)
- ✅ **Role-based access** (owner, admin, member, viewer)
- ✅ **Domain-based auto-join** (OIDC users auto-join by email domain)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [Implementation Phases](#implementation-phases)
4. [Component Specifications](#component-specifications)
5. [State Management](#state-management)
6. [API Integration](#api-integration)
7. [Routing & Guards](#routing--guards)
8. [User Experience](#user-experience)
9. [Testing Strategy](#testing-strategy)
10. [Security Considerations](#security-considerations)
11. [**Multi-Tenant Registration Flows**](#multi-tenant-registration-flows)
12. [**Teams Management Tab**](#teams-management-tab)
13. [**On-Brand Design System**](#on-brand-design-system)

---

## Architecture Overview

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Not Authenticated                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Login Page     │
                    │  - Basic Auth    │
                    │  - OIDC Cards    │
                    │  - Register Link │
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
          ┌─────────▼────────┐  ┌──────▼────────┐
          │  Basic Auth Form │  │ OIDC Provider │
          │  (Email/Pass)    │  │  (Redirect)   │
          └─────────┬────────┘  └──────┬────────┘
                    │                   │
                    │         ┌─────────▼──────────┐
                    │         │ Provider Auth Page │
                    │         │   (Google, etc)    │
                    │         └─────────┬──────────┘
                    │                   │
                    │         ┌─────────▼──────────┐
                    │         │  Callback Handler  │
                    │         │  Extract JWT Token │
                    │         └─────────┬──────────┘
                    │                   │
          ┌─────────▼───────────────────▼────────┐
          │      Store JWT in localStorage       │
          │      Load User Profile via API       │
          └─────────┬────────────────────────────┘
                    │
                    ▼
          ┌─────────────────────┐
          │  Authenticated User  │
          │  - Dashboard Access  │
          │  - Protected Routes  │
          └─────────────────────┘
```

### Tech Stack

- **Framework:** React (assumed based on existing codebase)
- **State Management:** React Context API or Zustand
- **HTTP Client:** Axios or Fetch API
- **Routing:** React Router v6
- **Form Handling:** React Hook Form (recommended)
- **Styling:** Tailwind CSS (assumed based on existing codebase)

---

## File Structure

```
frontend/src/
├── features/
│   └── auth/
│       ├── components/
│       │   ├── LoginPage.tsx              # Main login page (on-brand)
│       │   ├── RegisterPage.tsx           # Registration form (org or invite)
│       │   ├── BasicAuthForm.tsx          # Email/password form
│       │   ├── OIDCProviderCard.tsx       # OIDC provider button/card
│       │   ├── OIDCCallback.tsx           # Handle OIDC callback
│       │   ├── ProtectedRoute.tsx         # Route guard component
│       │   ├── UserMenu.tsx               # User dropdown menu
│       │   ├── SessionList.tsx            # Active sessions management
│       │   └── LogoutButton.tsx           # Logout functionality
│       │
│       ├── hooks/
│       │   ├── useAuth.ts                 # Main auth hook
│       │   ├── useLogin.ts                # Login mutation
│       │   ├── useRegister.ts             # Register mutation (with invite support)
│       │   ├── useLogout.ts               # Logout mutation
│       │   ├── useAuthMethods.ts          # Fetch available auth methods
│       │   └── useInvitation.ts           # Validate invitation token
│       │
│       ├── context/
│       │   ├── AuthContext.tsx            # Auth state context
│       │   └── AuthProvider.tsx           # Auth state provider
│       │
│       ├── services/
│       │   ├── authApi.ts                 # API service layer
│       │   ├── tokenStorage.ts            # JWT token management
│       │   └── axiosInterceptor.ts        # HTTP interceptor for auth
│       │
│       ├── types/
│       │   └── auth.types.ts              # TypeScript interfaces
│       │
│       └── utils/
│           ├── validateToken.ts           # JWT validation
│           └── redirectAfterLogin.ts      # Post-login navigation
│
│   └── teams/                             # NEW: Team Management
│       ├── components/
│       │   ├── TeamsTab.tsx               # Teams settings tab
│       │   ├── TeamMemberList.tsx         # List team members
│       │   ├── TeamMemberRow.tsx          # Individual member row
│       │   ├── InvitationList.tsx         # Active invitations list
│       │   ├── InvitationRow.tsx          # Individual invitation row
│       │   ├── CreateInviteModal.tsx      # Create new invite modal
│       │   └── RoleSelect.tsx             # Role selector dropdown
│       │
│       ├── hooks/
│       │   ├── useTeamMembers.ts          # Fetch team members
│       │   ├── useInvitations.ts          # Manage invitations (CRUD)
│       │   └── useUpdateMemberRole.ts     # Update member role
│       │
│       └── types/
│           └── teams.types.ts             # Team-related types
│
├── lib/
│   └── api.ts                             # Base API client configuration
│
└── App.tsx                                # App-level auth setup
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1-2)

**Goal:** Set up authentication infrastructure

#### Tasks:
- [ ] Create auth folder structure
- [ ] Define TypeScript interfaces for auth types
- [ ] Set up AuthContext and AuthProvider
- [ ] Create token storage utility
- [ ] Configure axios interceptor for JWT
- [ ] Create base API service layer
- [ ] Implement `useAuth` hook

**Deliverables:**
- Working AuthContext with state management
- Token storage/retrieval working
- API client configured with auth headers

---

### Phase 2: Basic Authentication (Day 2-3)

**Goal:** Implement email/password login and registration

#### Tasks:
- [ ] Create LoginPage component
- [ ] Create BasicAuthForm component
- [ ] Create RegisterPage component
- [ ] Implement `useLogin` hook
- [ ] Implement `useRegister` hook
- [ ] Add form validation
- [ ] Handle loading/error states
- [ ] Redirect after successful login
- [ ] Display user-friendly error messages

**Deliverables:**
- Working login form
- Working registration form
- Error handling and validation

---

### Phase 3: OIDC Integration (Day 3-4)

**Goal:** Add OIDC provider authentication

#### Tasks:
- [ ] Fetch available auth methods from backend
- [ ] Create OIDCProviderCard component
- [ ] Implement OIDC redirect flow
- [ ] Create OIDCCallback component
- [ ] Extract and store JWT from callback URL
- [ ] Handle OIDC errors
- [ ] Test with multiple providers

**Deliverables:**
- OIDC provider cards on login page
- Working callback handler
- Successful OIDC login flow

---

### Phase 4: Protected Routes & Guards (Day 4-5)

**Goal:** Secure application routes

#### Tasks:
- [ ] Create ProtectedRoute component
- [ ] Implement route guards
- [ ] Add loading state during auth check
- [ ] Redirect unauthenticated users to login
- [ ] Preserve intended destination after login
- [ ] Handle token expiration
- [ ] Add auto-redirect for expired sessions

**Deliverables:**
- Protected routes working
- Automatic redirects for unauthorized access
- Preserved navigation state

---

### Phase 5: User Profile & Session Management (Day 5-6)

**Goal:** Add user profile and session controls

#### Tasks:
- [ ] Create UserMenu component (navbar dropdown)
- [ ] Display user profile info
- [ ] Create SessionList component
- [ ] Implement logout functionality
- [ ] Implement logout from all sessions
- [ ] Add session revocation for individual sessions
- [ ] Update UI after logout

**Deliverables:**
- User menu in navbar
- Session management page
- Working logout

---

### Phase 6: Polish & UX (Day 6-7)

**Goal:** Improve user experience

#### Tasks:
- [ ] Add loading spinners
- [ ] Improve error messages
- [ ] Add success notifications
- [ ] Implement "Remember me" option
- [ ] Add password visibility toggle
- [ ] Add "Forgot password" link (placeholder)
- [ ] Mobile-responsive design
- [ ] Accessibility improvements (ARIA labels, keyboard nav)
- [ ] Add animations/transitions

**Deliverables:**
- Polished, production-ready UI
- Mobile-friendly design
- Accessible components

---

### Phase 7: Testing & Documentation (Day 7-8)

**Goal:** Ensure reliability and maintainability

#### Tasks:
- [ ] Write unit tests for hooks
- [ ] Write component tests
- [ ] Write integration tests for auth flow
- [ ] Test error scenarios
- [ ] Test OIDC flow with real provider
- [ ] Document auth integration
- [ ] Create developer guide
- [ ] Update user documentation

**Deliverables:**
- Test coverage >80%
- Documentation complete

---

## Component Specifications

### 1. LoginPage

**Location:** `src/features/auth/components/LoginPage.tsx`

**Responsibilities:**
- Display login options (basic auth + OIDC providers)
- Fetch available auth methods from backend
- Route to appropriate authentication flow

**Props:** None

**State:**
- `authMethods` - Available authentication methods
- `loading` - Whether auth methods are loading
- `error` - Error fetching auth methods

**UI Layout:**
```
┌─────────────────────────────────────┐
│         PainChain Logo              │
│                                     │
│      Sign in to your account        │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Email                         │ │
│  │  [email input]                │ │
│  │                                │ │
│  │  Password                      │ │
│  │  [password input]              │ │
│  │                                │ │
│  │  [Sign In Button]              │ │
│  └───────────────────────────────┘ │
│                                     │
│        ─── or continue with ───     │
│                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐     │
│  │Google│  │ Okta │  │Azure │     │
│  └──────┘  └──────┘  └──────┘     │
│                                     │
│  Don't have an account? Sign up    │
└─────────────────────────────────────┘
```

**Example Code:**
```tsx
export const LoginPage: React.FC = () => {
  const { data: authMethods, isLoading } = useAuthMethods();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Sign in to PainChain</h2>
        </div>

        {/* Basic Auth Form */}
        {authMethods?.basicAuth && <BasicAuthForm />}

        {/* OIDC Providers */}
        {authMethods?.oidcProviders && authMethods.oidcProviders.length > 0 && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {authMethods.oidcProviders.map((provider) => (
                <OIDCProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          </div>
        )}

        {/* Register Link */}
        {authMethods?.allowRegistration && (
          <div className="text-center text-sm">
            <Link to="/register" className="text-blue-600 hover:text-blue-500">
              Don't have an account? Sign up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### 2. BasicAuthForm

**Location:** `src/features/auth/components/BasicAuthForm.tsx`

**Responsibilities:**
- Collect email and password
- Validate inputs
- Submit to login endpoint
- Handle errors and loading states

**Props:** None

**State:**
- `email` - User's email
- `password` - User's password
- `showPassword` - Toggle password visibility
- `errors` - Form validation errors

**Example Code:**
```tsx
export const BasicAuthForm: React.FC = () => {
  const { login, isLoading, error } = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: { email: string; password: string }) => {
    await login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error.message}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            {...register('password', { required: 'Password is required' })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
};
```

---

### 3. OIDCProviderCard

**Location:** `src/features/auth/components/OIDCProviderCard.tsx`

**Responsibilities:**
- Display provider name and logo
- Redirect to OIDC flow on click

**Props:**
```typescript
interface Props {
  provider: {
    id: string;
    name: string;
    iconUrl?: string;
  };
}
```

**Example Code:**
```tsx
export const OIDCProviderCard: React.FC<Props> = ({ provider }) => {
  const handleClick = () => {
    window.location.href = `/api/auth/oidc/${provider.id}`;
  };

  return (
    <button
      onClick={handleClick}
      className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
    >
      {provider.iconUrl && (
        <img src={provider.iconUrl} alt={provider.name} className="h-5 w-5" />
      )}
      <span className="ml-2">{provider.name}</span>
    </button>
  );
};
```

---

### 4. OIDCCallback

**Location:** `src/features/auth/components/OIDCCallback.tsx`

**Responsibilities:**
- Extract JWT token from URL query parameter
- Store token in localStorage
- Load user profile
- Redirect to dashboard or intended page

**Props:** None

**State:**
- `loading` - Whether processing callback
- `error` - Error during callback processing

**Example Code:**
```tsx
export const OIDCCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken, loadUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      const errorParam = params.get('error');

      if (errorParam) {
        setError(decodeURIComponent(errorParam));
        return;
      }

      if (!token) {
        setError('No authentication token received');
        return;
      }

      try {
        // Store token
        setToken(token);

        // Load user profile
        await loadUser();

        // Redirect to intended page or dashboard
        const intendedPath = sessionStorage.getItem('intendedPath') || '/';
        sessionStorage.removeItem('intendedPath');
        navigate(intendedPath);
      } catch (err) {
        setError('Failed to complete authentication');
      }
    };

    processCallback();
  }, [location, navigate, setToken, loadUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Authentication Failed
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link to="/login" className="text-blue-600 hover:text-blue-500">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
};
```

---

### 5. ProtectedRoute

**Location:** `src/features/auth/components/ProtectedRoute.tsx`

**Responsibilities:**
- Check if user is authenticated
- Redirect to login if not authenticated
- Show loading state while checking auth
- Preserve intended destination

**Props:**
```typescript
interface Props {
  children: React.ReactNode;
  requireRole?: string;
}
```

**Example Code:**
```tsx
export const ProtectedRoute: React.FC<Props> = ({ children, requireRole }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Still loading auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    // Store intended destination
    sessionStorage.setItem('intendedPath', location.pathname);
    return <Navigate to="/login" replace />;
  }

  // Role check
  if (requireRole && user.role !== requireRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
```

---

### 6. UserMenu

**Location:** `src/features/auth/components/UserMenu.tsx`

**Responsibilities:**
- Display user avatar and name
- Show dropdown menu with profile/settings/logout
- Handle logout

**Props:** None

**Example Code:**
```tsx
export const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 focus:outline-none"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
            {user.displayName?.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm font-medium">{user.displayName}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            <Link
              to="/profile"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Your Profile
            </Link>
            <Link
              to="/sessions"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Active Sessions
            </Link>
            <button
              onClick={() => logout()}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## State Management

### AuthContext Structure

**Location:** `src/features/auth/context/AuthContext.tsx`

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  loadUser: () => Promise<void>;
  setToken: (token: string) => void;
}

interface User {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: string;
  tenantId: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}
```

**Example Implementation:**
```typescript
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('auth_token'),
    isLoading: true,
    isAuthenticated: false,
  });

  // Load user on mount if token exists
  useEffect(() => {
    if (state.token) {
      loadUser();
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await authApi.getMe();
      setState(prev => ({
        ...prev,
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      }));
    } catch (error) {
      // Token invalid, clear it
      localStorage.removeItem('auth_token');
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const { access_token, user } = response.data;

    localStorage.setItem('auth_token', access_token);
    setState({
      user,
      token: access_token,
      isLoading: false,
      isAuthenticated: true,
    });
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Continue with local logout even if API fails
    }

    localStorage.removeItem('auth_token');
    setState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const setToken = (token: string) => {
    localStorage.setItem('auth_token', token);
    setState(prev => ({ ...prev, token }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        logoutAll,
        loadUser,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
```

---

## API Integration

### API Service Layer

**Location:** `src/features/auth/services/authApi.ts`

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const authApi = {
  // Fetch available auth methods
  getAuthMethods: async () => {
    return axios.get(`${API_URL}/auth/methods`);
  },

  // Login with email/password
  login: async (credentials: { email: string; password: string }) => {
    return axios.post(`${API_URL}/auth/login`, credentials);
  },

  // Register new user
  register: async (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    tenantId?: string;
  }) => {
    return axios.post(`${API_URL}/auth/register`, data);
  },

  // Get current user profile
  getMe: async () => {
    const token = localStorage.getItem('auth_token');
    return axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Logout current session
  logout: async () => {
    const token = localStorage.getItem('auth_token');
    return axios.post(`${API_URL}/auth/logout`, null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Logout all sessions
  logoutAll: async () => {
    const token = localStorage.getItem('auth_token');
    return axios.post(`${API_URL}/auth/logout-all`, null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Get active sessions
  getSessions: async () => {
    const token = localStorage.getItem('auth_token');
    return axios.get(`${API_URL}/auth/sessions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Revoke specific session
  revokeSession: async (sessionId: string) => {
    const token = localStorage.getItem('auth_token');
    return axios.delete(`${API_URL}/auth/sessions/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
```

---

### Axios Interceptor

**Location:** `src/features/auth/services/axiosInterceptor.ts`

```typescript
import axios from 'axios';

// Add request interceptor to include auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## Routing & Guards

### App Router Configuration

**Location:** `src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthProvider';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { LoginPage } from './features/auth/components/LoginPage';
import { RegisterPage } from './features/auth/components/RegisterPage';
import { OIDCCallback } from './features/auth/components/OIDCCallback';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<OIDCCallback />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sessions"
            element={
              <ProtectedRoute>
                <SessionsPage />
              </ProtectedRoute>
            }
          />

          {/* Admin-only routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireRole="owner">
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

---

## User Experience

### Loading States

1. **Initial Auth Check**
   - Show full-page spinner while checking if user is authenticated
   - Avoid flash of login page for authenticated users

2. **Login/Register Forms**
   - Disable submit button during submission
   - Show loading spinner on button
   - Clear errors when user starts typing

3. **OIDC Redirect**
   - Show "Redirecting to [Provider]..." message
   - Smooth transition to provider's page

4. **Callback Processing**
   - Show "Completing sign in..." spinner
   - Handle errors gracefully with clear messages

### Error Handling

1. **Form Validation Errors**
   - Show inline errors below fields
   - Highlight invalid fields with red border
   - Clear errors on input change

2. **API Errors**
   - Display user-friendly messages
   - Map backend error codes to readable messages
   - Provide actionable next steps

3. **Network Errors**
   - Show "Unable to connect" message
   - Provide retry button
   - Indicate offline status

### Success Feedback

1. **Registration Success**
   - Show success message
   - Auto-redirect to dashboard after 2 seconds
   - Or show email verification prompt

2. **Login Success**
   - Smooth redirect to intended page
   - No flash or jarring transitions

3. **Logout**
   - Show "Logged out successfully" toast
   - Immediate redirect to login page

---

## Testing Strategy

### Unit Tests

Test individual hooks and utilities:

```typescript
// Example: useLogin.test.ts
describe('useLogin', () => {
  it('should login successfully with valid credentials', async () => {
    // Test implementation
  });

  it('should handle invalid credentials error', async () => {
    // Test implementation
  });

  it('should store token in localStorage on success', async () => {
    // Test implementation
  });
});
```

### Component Tests

Test component rendering and interactions:

```typescript
// Example: BasicAuthForm.test.tsx
describe('BasicAuthForm', () => {
  it('should render email and password inputs', () => {
    // Test implementation
  });

  it('should show validation errors for invalid email', async () => {
    // Test implementation
  });

  it('should call login on form submit', async () => {
    // Test implementation
  });
});
```

### Integration Tests

Test complete authentication flows:

```typescript
// Example: auth-flow.test.tsx
describe('Authentication Flow', () => {
  it('should complete login flow from login page to dashboard', async () => {
    // 1. Render app
    // 2. Navigate to login
    // 3. Fill form
    // 4. Submit
    // 5. Verify redirect to dashboard
    // 6. Verify user is shown in navbar
  });

  it('should handle OIDC callback and redirect', async () => {
    // Test OIDC callback flow
  });
});
```

---

## Security Considerations

### Token Storage

- ✅ Store JWT in `localStorage` (acceptable for this use case)
- ✅ Alternative: `sessionStorage` for more security (lost on tab close)
- ❌ Avoid storing in cookies (CSRF risk without proper setup)

### CSRF Protection

- ✅ OIDC `state` parameter validated by backend
- ✅ JWT tokens in Authorization header (not cookies)

### XSS Protection

- ✅ React escapes output by default
- ✅ Validate and sanitize user inputs
- ❌ Never use `dangerouslySetInnerHTML` with user content

### Token Expiration

- ✅ Handle 401 responses globally
- ✅ Clear token and redirect to login
- ✅ Show "Session expired" message

### Password Security

- ✅ Validate password strength on frontend
- ✅ Use `type="password"` inputs
- ✅ Add password visibility toggle
- ✅ Never log or expose passwords

### HTTPS

- ✅ Use HTTPS in production
- ✅ Update `APP_URL` and `FRONTEND_URL` to HTTPS
- ✅ Set `Secure` flag on cookies (if using cookies)

---

## Environment Variables

Create `.env` file in frontend:

```bash
# API Configuration
VITE_API_URL=http://localhost:8000/api

# Feature Flags
VITE_ENABLE_REGISTRATION=true
VITE_ENABLE_OIDC=true

# Environment
VITE_ENV=development
```

For production:

```bash
VITE_API_URL=https://api.painchain.com/api
VITE_ENV=production
```

---

## Next Steps After Completion

1. **Email Verification**
   - Add email verification flow
   - Send verification emails
   - Verify email before full access

2. **Password Reset**
   - Implement "Forgot Password" flow
   - Send reset emails
   - Create password reset page

3. **Two-Factor Authentication (2FA)**
   - Add TOTP support
   - QR code setup
   - Backup codes

4. **User Preferences**
   - Theme selection (dark mode)
   - Language preferences
   - Notification settings

5. **Audit Logs**
   - Show login history
   - Display IP addresses and devices
   - Alert on suspicious activity

6. **Social Login**
   - Add GitHub, GitLab OAuth
   - LinkedIn authentication
   - Custom SAML providers

---

## Reference Links

- **Backend API Documentation:** `painchain/backend/src/auth/OIDC_CONFIGURATION.md`
- **Backend Auth Controllers:** `painchain/backend/src/auth/auth.controller.ts`
- **Backend Auth Service:** `painchain/backend/src/auth/auth.service.ts`
- **JWT Strategy:** `painchain/backend/src/auth/strategies/jwt.strategy.ts`

---

## Success Criteria

The frontend auth implementation is complete when:

- [ ] Users can register with email/password
- [ ] Users can login with email/password
- [ ] Users can login with OIDC providers
- [ ] Protected routes redirect unauthenticated users
- [ ] User profile is displayed in navbar
- [ ] Users can view active sessions
- [ ] Users can logout (single session)
- [ ] Users can logout all sessions
- [ ] Token expiration is handled gracefully
- [ ] Errors are displayed clearly
- [ ] Loading states are shown appropriately
- [ ] Mobile responsive design
- [ ] Accessibility requirements met
- [ ] Test coverage >80%

---

## Multi-Tenant Registration Flows

### Registration Modes

The registration page handles two distinct flows based on URL parameters:

```
┌─────────────────────────────────────────────────────────────┐
│                    Registration Page                         │
│                   /register?invite=TOKEN                     │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
    ┌─────────▼─────────┐         ┌──────────▼──────────┐
    │  Has Invite Token │         │  No Invite Token    │
    │  ?invite=abc123   │         │  (Create New Org)   │
    └─────────┬─────────┘         └──────────┬──────────┘
              │                               │
    ┌─────────▼─────────┐         ┌──────────▼──────────┐
    │ Fetch invitation  │         │ Show org name field │
    │ GET /invitations/ │         │ User becomes owner  │
    │     :token        │         │                     │
    └─────────┬─────────┘         └──────────┬──────────┘
              │                               │
    ┌─────────▼─────────┐         ┌──────────▼──────────┐
    │ Show "Join X Org" │         │ POST /register      │
    │ Role: member/etc  │         │ {organizationName}  │
    └─────────┬─────────┘         └──────────┬──────────┘
              │                               │
    ┌─────────▼─────────┐                     │
    │ POST /register    │                     │
    │ {invitationToken} │                     │
    └─────────┬─────────┘                     │
              │                               │
              └───────────────┬───────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Logged In User   │
                    │  Redirect to /    │
                    └───────────────────┘
```

### RegisterPage Component

**Location:** `src/features/auth/components/RegisterPage.tsx`

```tsx
export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  // Fetch invitation details if token present
  const { data: invitation, isLoading: inviteLoading, error: inviteError } = useInvitation(inviteToken);
  const { register, isLoading, error } = useRegister();
  const navigate = useNavigate();

  // Loading invitation
  if (inviteToken && inviteLoading) {
    return <LoadingSpinner message="Loading invitation..." />;
  }

  // Invalid/expired invitation
  if (inviteToken && (inviteError || !invitation?.isValid)) {
    return (
      <div className="auth-page">
        <div className="auth-card glass">
          <div className="auth-error">
            <h2>Invalid Invitation</h2>
            <p>{inviteError?.message || 'This invitation has expired or is no longer valid.'}</p>
            <Link to="/login" className="btn-primary">Back to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: RegisterFormData) => {
    await register({
      ...data,
      invitationToken: inviteToken || undefined,
    });
    navigate('/');
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass">
        <img src="/logos/painchain.png" alt="PainChain" className="auth-logo" />

        {invitation ? (
          // Joining existing org
          <>
            <h1>Join {invitation.tenant.name}</h1>
            <p className="auth-subtitle">
              You've been invited to join as <span className="role-badge">{invitation.role}</span>
            </p>
          </>
        ) : (
          // Creating new org
          <>
            <h1>Create Your Organization</h1>
            <p className="auth-subtitle">Start tracking changes across your infrastructure</p>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" minLength={12} required />
          </div>

          {!invitation && (
            <div className="form-group">
              <label>Organization Name</label>
              <input type="text" name="organizationName" required />
            </div>
          )}

          <button type="submit" className="btn-primary btn-full" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : invitation ? `Join ${invitation.tenant.name}` : 'Create Organization'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};
```

### Invitation Hook

**Location:** `src/features/auth/hooks/useInvitation.ts`

```typescript
export const useInvitation = (token: string | null) => {
  const [data, setData] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(!!token);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchInvitation = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/invitations/${token}`);
        if (!response.ok) throw new Error('Invalid invitation');
        const invitation = await response.json();
        setData(invitation);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  return { data, isLoading, error };
};

interface InvitationDetails {
  token: string;
  tenant: { id: string; name: string; slug: string };
  role: string;
  expiresAt: string;
  isValid: boolean;
}
```

---

## Teams Management Tab

### Overview

The Teams tab in Settings allows owners and admins to:
- View all team members
- Change member roles
- Create invitation links
- Copy/revoke invitation links
- Remove team members (owners only)

### Location in Settings

Add "Team" tab to existing Integrations/Settings page sidebar:

```
┌─────────────────────────────────────────────────────────────┐
│  Settings                                                    │
├─────────────┬───────────────────────────────────────────────┤
│             │                                                │
│  Sidebar    │  Main Content                                  │
│             │                                                │
│  ┌────────┐ │  ┌──────────────────────────────────────────┐ │
│  │Integra-│ │  │  Team Members                             │ │
│  │tions   │ │  │                                           │ │
│  └────────┘ │  │  [Invite Team Member]                     │ │
│             │  │                                           │ │
│  ┌────────┐ │  │  ┌─────────────────────────────────────┐ │ │
│  │ Tags   │ │  │  │ alice@acme.com          Owner   ▼  │ │ │
│  └────────┘ │  │  └─────────────────────────────────────┘ │ │
│             │  │  ┌─────────────────────────────────────┐ │ │
│  ┌────────┐ │  │  │ bob@acme.com            Admin   ▼  │ │ │
│  │ Team ◀─┼─┼──│  └─────────────────────────────────────┘ │ │
│  └────────┘ │  │  ┌─────────────────────────────────────┐ │ │
│             │  │  │ carol@acme.com          Member  ▼  │ │ │
│             │  │  └─────────────────────────────────────┘ │ │
│             │  │                                           │ │
│             │  │  ─────────────────────────────────────── │ │
│             │  │                                           │ │
│             │  │  Active Invitations                       │ │
│             │  │                                           │ │
│             │  │  ┌─────────────────────────────────────┐ │ │
│             │  │  │ member │ Exp: Jan 14 │ 0/5 │ [Copy] │ │ │
│             │  │  └─────────────────────────────────────┘ │ │
│             │  │                                           │ │
│             │  └──────────────────────────────────────────┘ │
└─────────────┴───────────────────────────────────────────────┘
```

### TeamsTab Component

**Location:** `src/features/teams/components/TeamsTab.tsx`

```tsx
export const TeamsTab: React.FC = () => {
  const { user } = useAuth();
  const { data: members, isLoading: membersLoading } = useTeamMembers();
  const { data: invitations, isLoading: invitesLoading, refetch: refetchInvites } = useInvitations();
  const [showInviteModal, setShowInviteModal] = useState(false);

  const canManageTeam = ['owner', 'admin'].includes(user?.role || '');

  return (
    <div className="teams-tab">
      {/* Header */}
      <div className="teams-header">
        <div>
          <h2>Team Members</h2>
          <p className="text-muted">{members?.length || 0} members in {user?.tenant.name}</p>
        </div>
        {canManageTeam && (
          <button className="btn-primary" onClick={() => setShowInviteModal(true)}>
            Invite Team Member
          </button>
        )}
      </div>

      {/* Member List */}
      <div className="team-member-list">
        {membersLoading ? (
          <LoadingSpinner />
        ) : (
          members?.map((member) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              currentUser={user}
              canManage={canManageTeam}
            />
          ))
        )}
      </div>

      {/* Invitations Section (only for owners/admins) */}
      {canManageTeam && (
        <>
          <div className="teams-divider" />
          <div className="teams-header">
            <div>
              <h2>Active Invitations</h2>
              <p className="text-muted">Share links to invite new team members</p>
            </div>
          </div>

          <div className="invitation-list">
            {invitesLoading ? (
              <LoadingSpinner />
            ) : invitations?.length === 0 ? (
              <p className="empty-state">No active invitations</p>
            ) : (
              invitations?.map((invite) => (
                <InvitationRow
                  key={invite.id}
                  invitation={invite}
                  onRevoke={refetchInvites}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Create Invite Modal */}
      {showInviteModal && (
        <CreateInviteModal
          onClose={() => setShowInviteModal(false)}
          onCreated={() => {
            refetchInvites();
            setShowInviteModal(false);
          }}
        />
      )}
    </div>
  );
};
```

### TeamMemberRow Component

```tsx
export const TeamMemberRow: React.FC<Props> = ({ member, currentUser, canManage }) => {
  const { updateRole, isLoading } = useUpdateMemberRole();
  const isCurrentUser = member.id === currentUser?.id;
  const isOwner = member.role === 'owner';

  return (
    <div className="team-member-row">
      <div className="member-info">
        <div className="member-avatar">
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt={member.displayName} />
          ) : (
            <span>{member.displayName?.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="member-details">
          <span className="member-name">
            {member.displayName}
            {isCurrentUser && <span className="you-badge">(you)</span>}
          </span>
          <span className="member-email">{member.email}</span>
        </div>
      </div>

      <div className="member-role">
        {canManage && !isOwner && !isCurrentUser ? (
          <RoleSelect
            value={member.role}
            onChange={(newRole) => updateRole(member.id, newRole)}
            disabled={isLoading}
          />
        ) : (
          <span className={`role-badge role-${member.role}`}>
            {member.role}
          </span>
        )}
      </div>
    </div>
  );
};
```

### InvitationRow Component

```tsx
export const InvitationRow: React.FC<Props> = ({ invitation, onRevoke }) => {
  const { revokeInvitation, isLoading } = useRevokeInvitation();
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/register?invite=${invitation.token}`;
  const isExpired = new Date(invitation.expiresAt) < new Date();
  const isExhausted = invitation.useCount >= invitation.maxUses;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async () => {
    await revokeInvitation(invitation.token);
    onRevoke();
  };

  return (
    <div className={`invitation-row ${isExpired || isExhausted ? 'expired' : ''}`}>
      <div className="invite-info">
        <span className={`role-badge role-${invitation.role}`}>{invitation.role}</span>
        <span className="invite-expiry">
          Expires {formatDate(invitation.expiresAt)}
        </span>
        <span className="invite-uses">
          {invitation.useCount} / {invitation.maxUses} uses
        </span>
      </div>

      <div className="invite-actions">
        <button
          className="btn-secondary btn-sm"
          onClick={handleCopy}
          disabled={isExpired || isExhausted}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button
          className="btn-delete btn-sm"
          onClick={handleRevoke}
          disabled={isLoading}
        >
          Revoke
        </button>
      </div>
    </div>
  );
};
```

### CreateInviteModal Component

```tsx
export const CreateInviteModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const { createInvitation, isLoading } = useCreateInvitation();
  const [role, setRole] = useState('member');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const handleCreate = async () => {
    const result = await createInvitation({ role, expiresInDays, maxUses });
    setCreatedUrl(result.inviteUrl);
  };

  const handleCopyAndClose = async () => {
    if (createdUrl) {
      await navigator.clipboard.writeText(createdUrl);
    }
    onCreated();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Invitation Link</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {createdUrl ? (
          // Success state - show copyable link
          <div className="modal-body">
            <p>Invitation created! Share this link:</p>
            <div className="invite-url-box">
              <input type="text" value={createdUrl} readOnly />
            </div>
            <button className="btn-primary btn-full" onClick={handleCopyAndClose}>
              Copy Link & Close
            </button>
          </div>
        ) : (
          // Creation form
          <div className="modal-body">
            <div className="form-group">
              <label>Role</label>
              <RoleSelect value={role} onChange={setRole} excludeOwner />
            </div>

            <div className="form-group">
              <label>Expires In</label>
              <select value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))}>
                <option value={1}>1 day</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>

            <div className="form-group">
              <label>Max Uses</label>
              <select value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))}>
                <option value={1}>Single use</option>
                <option value={5}>5 uses</option>
                <option value={10}>10 uses</option>
                <option value={100}>Unlimited (100)</option>
              </select>
            </div>

            <button className="btn-primary btn-full" onClick={handleCreate} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Invitation'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
```

### API Hooks

```typescript
// useTeamMembers.ts
export const useTeamMembers = () => {
  // GET /api/users (returns users in current tenant)
  // Requires x-tenant-id header (from auth context)
};

// useInvitations.ts
export const useInvitations = () => {
  // GET /api/auth/invitations
};

// useCreateInvitation.ts
export const useCreateInvitation = () => {
  // POST /api/auth/invitations
  // Body: { role, expiresInDays, maxUses }
};

// useRevokeInvitation.ts
export const useRevokeInvitation = () => {
  // DELETE /api/auth/invitations/:token
};

// useUpdateMemberRole.ts
export const useUpdateMemberRole = () => {
  // PUT /api/users/:id/role (needs backend endpoint)
  // Body: { role }
};
```

---

## On-Brand Design System

### Design Tokens

The login page and team management UI must use these exact design tokens:

```css
/* Colors */
--bg-primary: #0f1419;           /* Page background */
--bg-surface: #1a1f2e;           /* Cards/containers */
--bg-surface-light: #1e2433;     /* Hover states */
--border: #2a3142;               /* Default borders */
--border-light: #3a4152;         /* Lighter borders */
--accent: #00E8A0;               /* Primary action color */
--accent-hover: #00ffb3;         /* Hover state */
--error: #f85149;                /* Error states */
--text-primary: #e1e4e8;         /* Main text */
--text-secondary: #c9d1d9;       /* Secondary text */
--text-muted: #808080;           /* Muted text */
```

### LoginPage Design

**Location:** `src/features/auth/components/LoginPage.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     glass card                       │   │
│  │                                                      │   │
│  │        [PainChain Logo - centered]                  │   │
│  │                                                      │   │
│  │        Sign in to PainChain                         │   │
│  │        Track changes across your infrastructure     │   │
│  │                                                      │   │
│  │   ┌──────────────────────────────────────────────┐  │   │
│  │   │  Email                                        │  │   │
│  │   │  ┌────────────────────────────────────────┐  │  │   │
│  │   │  │ email@example.com                      │  │  │   │
│  │   │  └────────────────────────────────────────┘  │  │   │
│  │   │                                               │  │   │
│  │   │  Password                                     │  │   │
│  │   │  ┌────────────────────────────────────────┐  │  │   │
│  │   │  │ ••••••••••••                       👁  │  │  │   │
│  │   │  └────────────────────────────────────────┘  │  │   │
│  │   │                                               │  │   │
│  │   │  ┌────────────────────────────────────────┐  │  │   │
│  │   │  │           Sign In (accent bg)          │  │  │   │
│  │   │  └────────────────────────────────────────┘  │  │   │
│  │   └──────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │   ──────────────── or continue with ─────────────   │   │
│  │                                                      │   │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐         │   │
│  │   │ [G] Google│  │ [O] Okta │  │ [A] Azure│         │   │
│  │   └──────────┘  └──────────┘  └──────────┘         │   │
│  │                                                      │   │
│  │   Don't have an account? Sign up                    │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### CSS Classes

```css
/* Auth Page Layout */
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f1419;
  padding: 20px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 40px;
  border-radius: 12px;
  background: rgba(26, 31, 46, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid #2a3142;
}

.auth-logo {
  height: 48px;
  margin: 0 auto 24px;
  display: block;
}

.auth-card h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #e1e4e8;
  text-align: center;
  margin-bottom: 8px;
}

.auth-subtitle {
  color: #808080;
  text-align: center;
  margin-bottom: 32px;
}

/* Form Styles */
.auth-card .form-group {
  margin-bottom: 20px;
}

.auth-card label {
  display: block;
  font-size: 0.875rem;
  color: #c9d1d9;
  margin-bottom: 6px;
}

.auth-card input {
  width: 100%;
  padding: 12px 14px;
  background: #0f1419;
  border: 1px solid #2a3142;
  border-radius: 8px;
  color: #e1e4e8;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.auth-card input:focus {
  outline: none;
  border-color: #00E8A0;
}

.auth-card input::placeholder {
  color: #606060;
}

/* Primary Button */
.btn-full {
  width: 100%;
  padding: 14px;
  font-size: 1rem;
}

/* OIDC Divider */
.auth-divider {
  display: flex;
  align-items: center;
  margin: 28px 0;
  color: #606060;
  font-size: 0.85rem;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #2a3142;
}

.auth-divider span {
  padding: 0 16px;
}

/* OIDC Provider Cards */
.oidc-providers {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.oidc-card {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: transparent;
  border: 1px solid #2a3142;
  border-radius: 8px;
  color: #c9d1d9;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.oidc-card:hover {
  border-color: #00E8A0;
  background: rgba(0, 232, 160, 0.05);
}

.oidc-card img {
  height: 20px;
  width: 20px;
}

/* Auth Footer */
.auth-footer {
  text-align: center;
  margin-top: 24px;
  color: #808080;
  font-size: 0.875rem;
}

.auth-footer a {
  color: #00E8A0;
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}

/* Role Badges */
.role-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.role-owner {
  background: rgba(159, 122, 234, 0.2);
  color: #9f7aea;
}

.role-admin {
  background: rgba(0, 232, 160, 0.2);
  color: #00E8A0;
}

.role-member {
  background: rgba(201, 209, 217, 0.2);
  color: #c9d1d9;
}

.role-viewer {
  background: rgba(128, 128, 128, 0.2);
  color: #808080;
}
```

### Teams Tab CSS

```css
/* Teams Tab */
.teams-tab {
  padding: 24px;
}

.teams-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.teams-header h2 {
  font-size: 1.25rem;
  color: #e1e4e8;
  margin-bottom: 4px;
}

.teams-header .text-muted {
  color: #808080;
  font-size: 0.875rem;
}

.teams-divider {
  height: 1px;
  background: #2a3142;
  margin: 32px 0;
}

/* Team Member Row */
.team-member-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #1a1f2e;
  border: 1px solid #2a3142;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: border-color 0.2s;
}

.team-member-row:hover {
  border-color: #3a4152;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #00E8A0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #0f1419;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.member-name {
  font-weight: 500;
  color: #e1e4e8;
}

.member-email {
  color: #808080;
  font-size: 0.875rem;
}

.you-badge {
  color: #00E8A0;
  font-size: 0.75rem;
  margin-left: 8px;
}

/* Invitation Row */
.invitation-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #1a1f2e;
  border: 1px solid #2a3142;
  border-radius: 8px;
  margin-bottom: 8px;
}

.invitation-row.expired {
  opacity: 0.5;
}

.invite-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.invite-expiry,
.invite-uses {
  color: #808080;
  font-size: 0.875rem;
}

.invite-actions {
  display: flex;
  gap: 8px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: 100%;
  max-width: 440px;
  background: #1a1f2e;
  border: 1px solid #2a3142;
  border-radius: 12px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #2a3142;
}

.modal-header h2 {
  font-size: 1.1rem;
  color: #e1e4e8;
}

.modal-close {
  background: none;
  border: none;
  color: #808080;
  font-size: 1.5rem;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.invite-url-box {
  margin: 16px 0;
}

.invite-url-box input {
  width: 100%;
  padding: 12px;
  background: #0f1419;
  border: 1px solid #2a3142;
  border-radius: 6px;
  color: #e1e4e8;
  font-family: monospace;
  font-size: 0.85rem;
}
```

---

## Backend Endpoints for Teams

**Required for team management (may need implementation):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users in current tenant |
| PUT | `/api/users/:id/role` | Update user role (owner/admin only) |
| DELETE | `/api/users/:id` | Remove user from tenant (owner only) |

**Already implemented:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/invitations` | List tenant invitations |
| POST | `/api/auth/invitations` | Create invitation |
| GET | `/api/auth/invitations/:token` | Get invitation details |
| DELETE | `/api/auth/invitations/:token` | Revoke invitation |

---

## Updated Success Criteria

The frontend auth implementation is complete when:

- [ ] **Login Page (On-Brand)**
  - [ ] Glassmorphic card design
  - [ ] PainChain logo
  - [ ] Email/password form
  - [ ] OIDC provider buttons
  - [ ] Sign up link
  - [ ] Error handling

- [ ] **Registration Page (Multi-Tenant)**
  - [ ] Detects `?invite=TOKEN` parameter
  - [ ] Fetches and validates invitation
  - [ ] Shows "Join [Org]" for invitations
  - [ ] Shows "Create Organization" otherwise
  - [ ] Handles expired/invalid invitations

- [ ] **Teams Management Tab**
  - [ ] Listed in Settings sidebar
  - [ ] Shows all team members
  - [ ] Role badges with proper colors
  - [ ] Role change dropdown (owner/admin)
  - [ ] Create invitation modal
  - [ ] Copy invite link functionality
  - [ ] Revoke invitation button
  - [ ] Permission-based visibility

- [ ] **Protected Routes**
  - [ ] Redirect unauthenticated users
  - [ ] Role-based route guards
  - [ ] Preserve intended destination

---

**End of Frontend Authentication Plan**
