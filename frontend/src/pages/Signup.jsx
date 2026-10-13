import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    <div className="auth-container">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🖥️</div>
          <h1>IT Asset Manager</h1>
          <p>Ticket & Asset Management System</p>
        </div>

        {registeredSuccess ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Account Created!</h2>
            <p className="auth-subtitle" style={{ marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Your account for <strong>{successEmail}</strong> has been registered. Please sign in with your email and password to access the system.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => navigate('/login')}
              >
                Go to Sign In
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
            <h2>Create an account</h2>
            <p className="auth-subtitle">Sign up to get started with IT Asset Manager</p>

            {/* Error Alert */}
            {errorMessage && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Signup Form */}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="e.g. alice@company.com or support.alice@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <small style={{ display: 'block', marginTop: '0.35rem', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.8rem' }}>
                  Must end with <strong>@company.com</strong>. Prefix with <strong>support.</strong> for IT Support role.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary, #94a3b8)',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={submitting}
                style={{ marginTop: '1.25rem' }}
              >
                {submitting ? 'Creating account…' : 'Sign Up'}
              </button>
            </form>

            <div className="auth-footer" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              Already have an account?{' '}
              <Link to="/login">Sign in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SignupPage;
