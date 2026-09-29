import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Role } from '../../types/auth';

export const Register: React.FC = () => {
  // Variables removed

  // Wizard State
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role] = useState<Role>('VIEWER');
  
  // Professional State
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [npiNumber, setNpiNumber] = useState('');
  const [phone, setPhone] = useState('');
  
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
          jobTitle, department, npiNumber, phone
        });
      } else {
        await api.post('/auth/register/user', {
          organizationId: inviteCode, // Temporarily treating inviteCode as OrgID
          fullName,
          email,
          password,
          role,
          jobTitle, department, npiNumber, phone
        });
      }
      setStep(4);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {step < 4 && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-cyan-600">
            Workspace Setup
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-.05em]">
            {step === 1 && "Create your workspace"}
            {step === 2 && "Professional Details"}
            {step === 3 && "Join organization"}
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            {step === 1 && "Start building a clearer clinical data foundation."}
            {step === 2 && "Help us customize your healthcare experience."}
            {step === 3 && "Connect to your hospital network workspace."}
          </p>

          {/* Progress Bar */}
          <div className="mt-6 flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 rounded-full flex-1 transition-colors ${step >= s ? 'bg-cyan-500' : 'bg-slate-200'}`} />
            ))}
          </div>
        </>
      )}

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
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-slate-600">Job Title</span>
              <input type="text" required value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" placeholder="e.g. Chief Medical Officer" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-slate-600">Department</span>
              <input type="text" required value={department} onChange={e => setDepartment(e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" placeholder="e.g. Cardiology" />
            </label>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-600">NPI Number (Optional)</span>
            <input type="text" value={npiNumber} onChange={e => setNpiNumber(e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" placeholder="10-digit National Provider Identifier" />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-600">Work Phone</span>
            <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" placeholder="+1 (555) 000-0000" />
          </label>

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

      {step === 4 && (
        <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
            <CheckCircle2 className="size-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Registration Submitted</h2>
          <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
            Your account has been created and is currently pending verification. An Organization Administrator must approve your request before you can log in.
          </p>
          <Link
            to="/login"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-8 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            Return to Sign In
          </Link>
        </div>
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
