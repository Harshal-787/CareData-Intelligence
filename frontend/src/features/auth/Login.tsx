import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, ArrowRight, Lock, Mail, ShieldAlert } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role === 'SUPER_ADMIN') {
        navigate('/superadmin/organizations');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (!err.response || err.response.status === 504 || err.response.status === 502) {
        setError('Network Connection Timeout: Verification with core API failed. Please retry.');
      } else {
        setError(err.response?.data?.error || 'Invalid credentials. Please verify your work email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">


      <h2 className="text-3xl font-bold tracking-tight text-slate-900">
        Sign in to CareData
      </h2>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
        Access your healthcare intelligence lakehouse, clinical records, and real-time telemetry.
      </p>

      {error && (
        <div className="mt-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-start gap-2.5">
          <ShieldAlert className="size-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-800">
            Work Email Address
          </span>
          <div className="relative">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3.5 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100 placeholder-slate-400"
              placeholder="clinical.analyst@hospital.org"
            />
            <Mail className="absolute left-3.5 top-3.5 size-4 text-slate-400 pointer-events-none" />
          </div>
        </label>
        
        <label className="block">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Workstation Password
            </span>
            <button type="button" className="text-xs font-semibold text-cyan-600 hover:text-cyan-800 transition-colors">
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-11 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100 placeholder-slate-400"
              placeholder="••••••••••••"
            />
            <Lock className="absolute left-3.5 top-3.5 size-4 text-slate-400 pointer-events-none" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-xs text-slate-600 font-medium">Remember this workstation</span>
          </label>
          <span className="text-[11px] font-mono text-slate-400">HIPAA Compliant</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-dark w-full h-11 text-sm shadow-md mt-2 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Authenticating Session...</span>
            </>
          ) : (
            <>
              <span>Sign in to Workspace</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-2">
        <p className="text-xs text-slate-500">
          Need clinical platform access?{' '}
          <Link to="/register" className="font-bold text-cyan-700 hover:text-cyan-900 transition-colors">
            Register new hospital organization
          </Link>
        </p>
        <p className="text-[11px] text-slate-400">
          CareData Intelligence Core v1.0.0 • Protected by 256-bit encryption
        </p>
      </div>
    </div>
  );
};
