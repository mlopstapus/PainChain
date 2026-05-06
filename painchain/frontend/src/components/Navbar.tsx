import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-left">
        <img
          src="/logos/painchain.png"
          alt="PainChain Logo"
          className="logo"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <Link to="/">
          <h1>PainChain</h1>
        </Link>
      </div>

      <div className="header-right">
        <a
          href="https://github.com/PainChain/PainChain"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link"
        >
          <img
            src="/api/integrations/types/github/logo"
            alt="GitHub"
            className="github-icon"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          GitHub Docs
        </a>
        <Link to="/integrations" className="nav-link">
          Settings
        </Link>

        {/* User Menu */}
        <div className="user-menu-container" ref={menuRef}>
          <button
            className="user-menu-trigger"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="user-avatar">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName || ''} />
              ) : (
                <span>
                  {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <svg
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{
                transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showUserMenu && (
            <div className="user-menu-dropdown">
              <div className="user-menu-header">
                <p className="user-menu-name">{user?.displayName || user?.email?.split('@')[0]}</p>
                <p className="user-menu-email">{user?.email}</p>
                <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
              </div>
              <div className="user-menu-divider" />
              <div className="user-menu-org">
                <span className="user-menu-org-label">Organization</span>
                <span className="user-menu-org-name">{user?.tenant?.name}</span>
              </div>
              <div className="user-menu-divider" />
              <button className="user-menu-item" onClick={handleLogout}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
