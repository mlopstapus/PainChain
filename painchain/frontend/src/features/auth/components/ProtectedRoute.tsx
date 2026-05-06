import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'owner' | 'admin' | 'member' | 'viewer';
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Still loading auth state
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f1419',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #2a3142',
            borderTopColor: '#00E8A0',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#808080', margin: 0 }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    // Store intended destination
    sessionStorage.setItem('intendedPath', location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  // Role check
  if (requireRole) {
    const roleHierarchy = ['viewer', 'member', 'admin', 'owner'];
    const userRoleIndex = roleHierarchy.indexOf(user.role);
    const requiredRoleIndex = roleHierarchy.indexOf(requireRole);

    if (userRoleIndex < requiredRoleIndex) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f1419',
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '400px',
            padding: '40px',
            background: 'rgba(26, 31, 46, 0.8)',
            borderRadius: '12px',
            border: '1px solid #2a3142',
          }}>
            <svg
              width="48"
              height="48"
              fill="none"
              stroke="#f85149"
              viewBox="0 0 24 24"
              style={{ margin: '0 auto 16px' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 style={{ color: '#f85149', fontSize: '1.25rem', margin: '0 0 8px' }}>
              Access Denied
            </h2>
            <p style={{ color: '#808080', margin: '0 0 24px' }}>
              You don't have permission to access this page.
              This page requires <strong style={{ color: '#c9d1d9' }}>{requireRole}</strong> access.
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block',
                background: '#00E8A0',
                color: '#0f1419',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
