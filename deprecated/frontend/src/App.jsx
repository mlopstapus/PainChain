import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useEffect } from 'react'
import './App.css'
import './Settings.css'
import logo from './assets/logos/painchain_transparent.png'
import githubLogo from './assets/logos/github.png'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import { ToastProvider } from './components/Toast'
import { injectConnectorStyles } from './utils/connectorMetadata'

function App() {
  // Inject dynamic connector styles on mount
  useEffect(() => {
    injectConnectorStyles()
  }, [])

  return (
    <ToastProvider>
      <Router>
        <div className="app">
        <header className="header">
          <div className="header-left">
            <img src={logo} alt="PainChain Logo" className="logo" />
            <h1>PainChain</h1>
          </div>
          <div className="header-right">
            <a className="nav-link github-link" href="https://github.com/PainChain/PainChain" target="_blank" rel="noopener noreferrer">
              <img src={githubLogo} alt="GitHub Docs" className="github-icon" />
              GitHub Docs
            </a>
            <Link className="nav-link" to="/settings">Settings</Link>
            <a className="btn-primary">Upgrade to Pro</a>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </Router>
    </ToastProvider>
  )
}

export default App
