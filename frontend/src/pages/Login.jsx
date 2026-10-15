import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function LoginPage() {
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get('expired') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth ? useAuth() : {};
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      if (login) {
        await login(email, password);
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Invalid email or password';
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

          {/* Header Brand */}
          <h2 className="warm-login-brand-title">IT Asset Manager</h2>
          <p className="warm-login-brand-sub">Ticket &amp; Asset Management System</p>
          <div className="warm-login-divider"></div>

          {/* Welcome Text */}
          <h1 className="warm-login-welcome">Welcome back</h1>
          <p className="warm-login-subtitle">Sign in to your account to continue</p>

          {/* Expired Session Notice */}
          {isExpired && !errorMessage && (
            <div className="alert alert-warning" style={{ marginBottom: '1.25rem' }}>
              ℹ️ Your session has expired. Please sign in again to continue.
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            {/* Email Address */}
            <div className="warm-form-field">
              <div className="warm-field-header">
                <label htmlFor="email" className="warm-field-label">Email address</label>
              </div>
              <input
                id="email"
                className="warm-input"
                type="email"
                placeholder="support.anshuman@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Password */}
            <div className="warm-form-field">
              <div className="warm-field-header">
                <label htmlFor="password" className="warm-field-label">Password</label>
                <a
                  href="#forgot"
                  className="warm-forgot-link"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Please contact your IT administrator (admin@company.com) to reset your account password.");
                  }}
                >
                  Forgot password?
                </a>
              </div>
              <div className="warm-input-wrapper">
                <input
                  id="password"
                  className="warm-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••••••••••"
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

            {/* Submit Button (Charcoal / Black matching design) */}
            <button
              type="submit"
              className="warm-btn-charcoal"
              disabled={submitting}
            >
              {submitting ? 'Signing in…' : (
                <>
                  Sign In <span>&rarr;</span>
                </>
              )}
            </button>
          </form>

          {/* Create Account Link */}
          <div className="warm-signin-link-row">
            Don't have an account?{' '}
            <Link to="/signup" className="warm-create-link">Create one</Link>
          </div>
        </div>

        {/* Outer Version Footer */}
        <div className="warm-outer-footer">
          <span className="warm-outer-version">ITSM Support Desk · Capstone Project</span>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
