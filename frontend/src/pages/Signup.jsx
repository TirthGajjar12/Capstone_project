import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const derivedRole = email.toLowerCase().trim().startsWith('support.') ? 'SUPPORT' : 'EMPLOYEE';
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');

  const { register } = useAuth ? useAuth() : {};
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (!email.toLowerCase().endsWith('@company.com')) {
      setErrorMessage('Company email required (must end with @company.com)');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    setSubmitting(true);

    try {
      if (register) {
        await register(fullName, email, password, derivedRole);
        setSuccessEmail(email);
        setRegisteredSuccess(true);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Registration failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="warm-auth-container">
      {/* Top Right Floating Minimalist Theme Switcher */}
      <button
        type="button"
        className="warm-theme-toggle-btn"
        onClick={toggleTheme}
        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="warm-auth-page-wrapper">
        <div className="warm-auth-card">
          {/* Top Monitor Icon Badge */}
          <div className="warm-auth-icon-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>

          {/* Header Brand — Identical to Login */}
          <h2 className="warm-login-brand-title">IT Asset Manager</h2>
          <p className="warm-login-brand-sub">Ticket &amp; Asset Management System</p>
          <div className="warm-login-divider"></div>

          {registeredSuccess ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
              <h2 style={{ marginBottom: '0.5rem', fontSize: '20px', fontWeight: 600 }}>Account Created!</h2>
              <p style={{ marginBottom: '1.5rem', lineHeight: '1.5', fontSize: '13px', color: '#78716c' }}>
                Your account for <strong>{successEmail}</strong> has been registered. Please sign in with your email and password to access the system.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="warm-btn-primary"
                  style={{ marginTop: 0 }}
                  onClick={() => navigate('/login')}
                >
                  Go to Sign In &rarr;
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={() => {
                    setRegisteredSuccess(false);
                    setFullName('');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                >
                  Register Another Account
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Heading */}
              <h1 className="warm-login-welcome">Create an account</h1>
              <p className="warm-login-subtitle">Sign up to get started with IT Asset Manager</p>

              {/* Error Alert */}
              {errorMessage && (
                <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Signup Form */}
              <form onSubmit={handleSubmit}>
                {/* Full Name */}
                <div className="warm-form-field">
                  <div className="warm-field-header">
                    <label htmlFor="fullName" className="warm-field-label">Full Name</label>
                    <span className="warm-field-hint">Required</span>
                  </div>
                  <input
                    id="fullName"
                    className="warm-input"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {/* Email Address */}
                <div className="warm-form-field">
                  <div className="warm-field-header">
                    <label htmlFor="email" className="warm-field-label">Email address</label>
                    <span className="warm-field-hint">Corporate</span>
                  </div>
                  <input
                    id="email"
                    className="warm-input"
                    type="email"
                    placeholder="e.g. alice@company.com or support.alice@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <div className="warm-info-note">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b3a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <span>
                      Must end with <strong>@company.com</strong>. Prefix with <span style={{ color: '#8b3a04', fontWeight: 600 }}>support.</span> for IT Support role.
                    </span>
                  </div>
                </div>

                {/* Password */}
                <div className="warm-form-field">
                  <div className="warm-field-header">
                    <label htmlFor="password" className="warm-field-label">Password</label>
                  </div>
                  <div className="warm-input-wrapper">
                    <input
                      id="password"
                      className="warm-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="warm-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="warm-form-field">
                  <div className="warm-field-header">
                    <label htmlFor="confirmPassword" className="warm-field-label">Confirm Password</label>
                  </div>
                  <input
                    id="confirmPassword"
                    className="warm-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="warm-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating account…' : (
                    <>
                      Sign Up <span>&rarr;</span>
                    </>
                  )}
                </button>
              </form>

              {/* Sign In Link */}
              <div className="warm-signin-link-row">
                Already have an account?{' '}
                <Link to="/login" className="warm-signin-link">Sign in</Link>
              </div>

              {/* Trust & Security Badges Footer */}
              <div className="warm-trust-badges">
                <span className="warm-trust-soc2">
                  <span className="soc2-bullet">●</span> SOC2 Type II
                </span>
                <span className="warm-trust-dot">·</span>
                <span>256-bit TLS Encryption</span>
                <span className="warm-trust-dot">·</span>
                <span>SSO Ready</span>
              </div>
            </>
          )}
        </div>

        {/* Outer Legal & Version Footer */}
        <div className="warm-outer-footer">
          <div className="warm-outer-links">
            <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
            <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a>
            <a href="#status" onClick={(e) => e.preventDefault()}>System Status</a>
          </div>
          <span className="warm-outer-version">v2.4.1</span>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
