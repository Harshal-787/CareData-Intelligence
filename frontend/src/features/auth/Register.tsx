import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { ArrowRight, ArrowLeft, Database, CheckCircle2 } from 'lucide-react';
import { Role } from '../../types/auth';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Wizard State
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('DATA_ANALYST');
  
  // Org State
  const [orgMode, setOrgMode] = useState<'CREATE' | 'JOIN'>('JOIN');
  const [orgName, setOrgName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const nextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (orgMode === 'CREATE') {
        await api.post('/auth/register', {
          organizationName: orgName,
          fullName,
          email,
          password,
        });
      } else {
        await api.post('/auth/register/user', {
          organizationId: inviteCode, // Temporarily treating inviteCode as OrgID
          fullName,
          email,
          password,
          role,
        });
      }
      
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <p className="text-[11px] font-bold uppercase tracking-[.16em] text-cyan-600">
        Workspace Setup
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-[-.05em]">
        {step === 1 && "Create your workspace"}
        {step === 2 && "Select your role"}
        {step === 3 && "Join organization"}
      </h2>
      <p className="mt-3 text-sm text-slate-400">
        {step === 1 && "Start building a clearer clinical data foundation."}
        {step === 2 && "Choose your primary function within the platform."}
        {step === 3 && "Connect to your hospital network workspace."}
      </p>

      {/* Progress Bar */}
      <div className="mt-6 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1.5 rounded-full flex-1 transition-colors ${step >= s ? 'bg-cyan-500' : 'bg-slate-200'}`} />
        ))}
      </div>

      {error && (
        <div className="mt-6 p-3 rounded-2xl bg-red-50 border border-red-100 text-xs font-medium text-red-600">
          {error}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={nextStep} className="mt-8 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-600">Full name</span>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="Dr. Jane Smith"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-600">Work email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="jane@hospital.org"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-600">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="Minimum 8 characters"
            />
          </label>
          <button type="submit" className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-xs font-bold text-white shadow-sm shadow-cyan-200 transition hover:-translate-y-0.5">
            Continue <ArrowRight className="size-4" />
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={nextStep} className="mt-8 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setRole('DATA_ANALYST')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition ${role === 'DATA_ANALYST' ? 'bg-cyan-50 border-cyan-400 shadow-sm shadow-cyan-100' : 'bg-white border-slate-200 hover:border-slate-300'}`}
            >
              <div className={`grid size-10 place-items-center rounded-lg ${role === 'DATA_ANALYST' ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-400'}`}>
                <Database className="h-5 w-5" />
              </div>
              <div>
                <p className={`text-sm font-bold ${role === 'DATA_ANALYST' ? 'text-cyan-900' : 'text-slate-700'}`}>Data Analyst</p>
                <p className="text-xs text-slate-400">Run queries, ML pipelines, and AI reports</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole('VIEWER')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition ${role === 'VIEWER' ? 'bg-blue-50 border-blue-400 shadow-sm shadow-blue-100' : 'bg-white border-slate-200 hover:border-slate-300'}`}
            >
              <div className={`grid size-10 place-items-center rounded-lg ${role === 'VIEWER' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className={`text-sm font-bold ${role === 'VIEWER' ? 'text-blue-900' : 'text-slate-700'}`}>Clinical Viewer</p>
                <p className="text-xs text-slate-400">View dashboards and clinical reports</p>
              </div>
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={prevStep} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 transition w-1/3 shadow-sm">
              <ArrowLeft className="size-4" /> Back
            </button>
            <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 text-xs font-bold text-white shadow-sm shadow-cyan-200 transition hover:-translate-y-0.5 flex-1">
              Continue <ArrowRight className="size-4" />
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex rounded-2xl bg-slate-100 p-1 mb-6">
            <button type="button" onClick={() => setOrgMode('JOIN')} className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition ${orgMode === 'JOIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
              Join Existing
            </button>
            <button type="button" onClick={() => setOrgMode('CREATE')} className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition ${orgMode === 'CREATE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
              Create New
            </button>
          </div>

          {orgMode === 'JOIN' ? (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-slate-600">Organization ID / Invite Code</span>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 font-mono"
                placeholder="e.g. org-1a2b3c4d"
              />
            </label>
          ) : (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-slate-600">New Organization Name</span>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  placeholder="e.g. CareData Health System"
                />
              </label>
              <p className="text-[10px] text-slate-400 font-medium">By creating a new organization, you will be assigned as the Organization Administrator.</p>
            </div>
          )}

          <div className="flex gap-3 pt-6">
            <button type="button" onClick={prevStep} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 transition w-1/3 shadow-sm">
              <ArrowLeft className="size-4" /> Back
            </button>
            <button type="submit" disabled={loading} className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 text-xs font-bold text-white shadow-sm shadow-cyan-200 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 flex-1">
              {loading ? 'Processing...' : (orgMode === 'JOIN' ? 'Join & Launch' : 'Create & Launch')}
            </button>
          </div>
        </form>
      )}

      {step === 1 && (
        <p className="mt-8 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-cyan-600 hover:text-cyan-700">
            Sign in
          </Link>
        </p>
      )}
    </>
  );
};
