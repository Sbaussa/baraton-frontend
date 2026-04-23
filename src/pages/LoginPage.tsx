import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuthStore } from '../store/auth.store';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setAuth(data.user, data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Credenciales incorrectas');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #FDF7F0 0%, #FAF0E6 100%)' }}>
      {/* Decoración fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full blur-3xl opacity-40" style={{ background: '#FFEDD5' }} />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full blur-3xl opacity-30" style={{ background: '#FED7AA' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-md" style={{ background: '#FFEDD5', border: '2px solid #FED7AA' }}>
            <span className="text-4xl">🍛</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-800">El Baraton</h1>
          <p className="text-orange-500 font-semibold text-sm mt-1">Almuerzos Económicos</p>
        </div>

        {/* Formulario */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-medium text-center text-stone-500">Iniciar sesión</h2>

          {error && (
            <div className="text-sm px-3 py-2 rounded-lg" style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}>
              {error}
            </div>
          )}

          <div>
            <label className="label">Correo electrónico</label>
            <input type="email" className="input" placeholder="usuario@baraton.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>

          <div>
            <label className="label">Contraseña</label>
            <input type="password" className="input" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading} onClick={submit}>
            {loading ? 'Entrando...' : 'Entrar al sistema'}
          </button>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: '#C8BFB4' }}>
          Sistema POS · El Baraton Almuerzos
        </p>
      </div>
    </div>
  );
}