import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', password: '', team: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(form.email, form.name, form.password, 'member', form.team);
      } else {
        await login(form.email, form.password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ animation: 'fadeIn 0.5s ease' }}>
        <div className="login-logo">
          <div className="login-logo-icon">Bg</div>
          <span className="login-logo-text">Brandguard</span>
        </div>

        <h2 style={{ fontSize: 22, marginBottom: 4 }}>
          {isRegister ? 'Create your account' : 'Welcome back'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
          {isRegister ? 'Start protecting your brand' : 'Sign in to your compliance dashboard'}
        </p>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="input-label">Full Name</label>
              <input className="input" placeholder="Sarah Reeves" required
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
          )}

          <div className="form-group">
            <label className="input-label">Email</label>
            <input className="input" type="email" placeholder="you@company.com" required
              value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="input-label">Password</label>
            <input className="input" type="password" placeholder="••••••••" required minLength={6}
              value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="input-label">Team (optional)</label>
              <input className="input" placeholder="e.g. Marketing, Design..."
                value={form.team} onChange={e => setForm(p => ({ ...p, team: e.target.value }))} />
            </div>
          )}

          {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

          <button className="btn btn-primary" type="submit"
            style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: 14 }}
            disabled={loading}>
            {loading ? <div className="spinner" /> : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span
            style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
          >
            {isRegister ? 'Sign in' : 'Register'}
          </span>
        </div>

        {!isRegister && (
          <div style={{
            marginTop: 24, padding: '14px 16px', background: 'var(--bg)', borderRadius: 8,
            fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5,
          }}>
            <strong>Demo credentials:</strong><br />
            Email: sarah@brandguard.io<br />
            Password: password123
          </div>
        )}
      </div>
    </div>
  );
}
