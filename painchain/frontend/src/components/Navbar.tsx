import { Link } from 'react-router-dom';

export function Navbar() {
  return (
    <header className="header">
      <div className="header-left">
        <img
          src="/logos/painchain_transparent.png"
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
            src="/logos/github.png"
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
        <button className="btn-primary">Upgrade to Pro</button>
      </div>
    </header>
  );
}
