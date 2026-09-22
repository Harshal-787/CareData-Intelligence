import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <p className="text-[11px] font-bold uppercase tracking-[.16em] text-cyan-600">
        Welcome back
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-[-.05em]">
        Sign in to CareData
      </h2>
      <p className="mt-3 text-sm text-slate-400">
        Continue to your clinical intelligence workspace.
      </p>

      {error && (
        <div className="mt-6 p-3 rounded-2xl bg-red-50 border border-red-100 text-xs font-medium text-red-600">
          {error}
        </div>
      )}

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-slate-600">
            Work email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            placeholder="you@hospital.org"
          />
        </label>
        
        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-slate-600">
            Password
          </span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 pr-11 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>

        <div className="flex justify-end">
          <button type="button" className="text-xs font-semibold text-cyan-600 hover:text-cyan-700">
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-xs font-bold text-white shadow-sm shadow-cyan-200 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {loading ? 'Authenticating...' : 'Continue to workspace'}
          <ArrowRight className="size-4" />
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-slate-400">
        New to CareData?{' '}
        <Link to="/register" className="font-bold text-cyan-600 hover:text-cyan-700">
          Create an account
        </Link>
      </p>
    </>
  );
};
