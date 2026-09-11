import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Building, User, Mail, Lock, ArrowRight } from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/register', {
        organizationName: orgName,
        fullName,
        email,
        password,
      });
      // Auto login after registration
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Create Organization</h2>
        <p className="mt-1 text-sm text-slate-400">
          Set up a new healthcare workspace with Administrator privileges
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Hospital / Organization Name</label>
          <div className="relative">
            <Building className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. St. Jude Healthcare Network"
              required
              className="w-full rounded-xl bg-slate-900 border border-slate-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Admin Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. Jane Smith"
              required
              className="w-full rounded-xl bg-slate-900 border border-slate-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Work Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@hospital.org"
              required
              className="w-full rounded-xl bg-slate-900 border border-slate-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              minLength={8}
              required
              className="w-full rounded-xl bg-slate-900 border border-slate-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 px-4 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 focus:outline-none transition disabled:opacity-50"
        >
          {loading ? 'Creating Instance...' : 'Register & Launch Workspace'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-cyan-400 hover:text-cyan-300">
          Sign In
        </Link>
      </p>
    </div>
  );
};
