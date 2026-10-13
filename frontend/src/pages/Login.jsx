import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth ? useAuth() : {};
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
    <div className="auth-container">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🖥️</div>
          <h1>IT Asset Manager</h1>
          <p>Ticket & Asset Management System</p>
        </div>

        <h2>Welcome back</h2>
        <p className="auth-subtitle">Sign in to your account to continue</p>



        {/* Error Alert */}
        {errorMessage && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
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

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
            style={{ marginTop: '1.25rem' }}
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          Don't have an account?{' '}
          <Link to="/signup">Create one</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
