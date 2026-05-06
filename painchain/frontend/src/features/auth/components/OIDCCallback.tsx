import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { tokenStorage } from '../../../api/client';
import { useAuth } from '../context/AuthContext';
import './auth.css';

export function OIDCCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const token = searchParams.get('token');
      const errorParam = searchParams.get('error');

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
        tokenStorage.setToken(token);

        // Refresh user profile
        await refreshUser();

        // Redirect to intended page or dashboard
        const intendedPath = sessionStorage.getItem('intendedPath') || '/';
        sessionStorage.removeItem('intendedPath');
        navigate(intendedPath, { replace: true });
      } catch (err) {
        setError('Failed to complete authentication');
        tokenStorage.removeToken();
      }
    };

    processCallback();
  }, [searchParams, navigate, refreshUser]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <img src="/logos/painchain.png" alt="PainChain" className="auth-logo" />
          <div className="auth-invalid">
            <h2>Authentication Failed</h2>
            <p>{error}</p>
            <Link to="/login" className="btn-primary">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-loading">
          <div className="auth-spinner" />
          <p>Completing sign in...</p>
        </div>
      </div>
    </div>
  );
}
