import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Logo2D, IconSun, IconMoon, IconInfo, IconAlert } from '../components/common/Icons';

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
        {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
      </button>

      <div className="warm-auth-page-wrapper">
        <div className="warm-auth-card">
          {/* Top 2D Minimalist Brand Logo Badge */}
          <div className="warm-auth-icon-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Logo2D size={28} color="#6366f1" />
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
            <div className="alert alert-warning" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconInfo size={16} /> Your session has expired. Please sign in again to continue.
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconAlert size={16} /> {errorMessage}
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
