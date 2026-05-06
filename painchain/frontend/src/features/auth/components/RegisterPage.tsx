import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthMethods } from '../hooks/useAuthMethods';
import { useInvitation } from '../hooks/useInvitation';
import './auth.css';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const { register } = useAuth();
  const { authMethods, loading: methodsLoading } = useAuthMethods();
  const { invitation, loading: inviteLoading, error: inviteError } = useInvitation(inviteToken);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password length
    if (password.length < 12) {
      setError('Password must be at least 12 characters long');
      return;
    }

    // Validate organization name if not using invitation
    if (!inviteToken && !organizationName.trim()) {
      setError('Organization name is required');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        organizationName: inviteToken ? undefined : organizationName,
        invitationToken: inviteToken || undefined,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading states
  if (methodsLoading || (inviteToken && inviteLoading)) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-loading">
            <div className="auth-spinner" />
            <p>{inviteToken ? 'Loading invitation...' : 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid or expired invitation
  if (inviteToken && (inviteError || !invitation?.isValid)) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <img src="/logos/painchain.png" alt="PainChain" className="auth-logo" />
          <div className="auth-invalid">
            <h2>Invalid Invitation</h2>
            <p>
              {inviteError?.message || 'This invitation has expired or is no longer valid.'}
            </p>
            <Link to="/login" className="btn-primary">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Registration not allowed
  if (!authMethods?.allowRegistration && !inviteToken) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <img src="/logos/painchain.png" alt="PainChain" className="auth-logo" />
          <div className="auth-invalid">
            <h2>Registration Disabled</h2>
            <p>Registration is currently disabled. You need an invitation to join.</p>
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
        <img src="/logos/painchain.png" alt="PainChain" className="auth-logo" />

        {invitation ? (
          <>
            <h1>Join {invitation.tenant.name}</h1>
            <div className="invitation-info-box">
              <p>
                You've been invited to join as a
                <span className={`role-badge role-${invitation.role}`}>
                  {invitation.role}
                </span>
              </p>
            </div>
          </>
        ) : (
          <>
            <h1>Create Your Organization</h1>
            <p className="auth-subtitle">Start tracking changes across your infrastructure</p>
          </>
        )}

        {error && (
          <div className="auth-error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 12 characters"
                required
                minLength={12}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                autoComplete="given-name"
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                autoComplete="family-name"
              />
            </div>
          </div>

          {!invitation && (
            <div className="form-group">
              <label htmlFor="organizationName">Organization Name</label>
              <input
                id="organizationName"
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Acme Corp"
                required
                autoComplete="organization"
              />
            </div>
          )}

          <button type="submit" className="btn-primary btn-full" disabled={isLoading}>
            {isLoading
              ? 'Creating Account...'
              : invitation
              ? `Join ${invitation.tenant.name}`
              : 'Create Organization'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
