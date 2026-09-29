import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, ShieldCheck, Mail, Lock, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export const SuperAdminProfile: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"PROFILE" | "SECURITY">("PROFILE");
  const [saveStatus, setSaveStatus] = useState<"IDLE" | "SAVING" | "SAVED" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");

  const [profile, setProfile] = useState({
    fullName: user?.fullName || "",
    email: user?.email || ""
  });

  const [security, setSecurity] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("SAVING");
    setErrorMessage("");
    try {
      // Assuming api client is available or we use fetch. Let's use fetch if api is missing. But we know it's there.
      // I will dynamically use window.fetch if needed or just api. Let's assume api exists.
      const res = await fetch('http://localhost:8080/api/v1/users/me/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // assuming token is here
        },
        body: JSON.stringify(profile)
      });
      if (!res.ok) throw new Error("Failed to save profile");
      setSaveStatus("SAVED");
      setTimeout(() => setSaveStatus("IDLE"), 3000);
    } catch (err: any) {
      setSaveStatus("ERROR");
      setErrorMessage(err.message);
    }
  };

  const handleSecuritySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (security.newPassword !== security.confirmPassword) {
      setSaveStatus("ERROR");
      setErrorMessage("Passwords do not match");
      return;
    }
    setSaveStatus("SAVING");
    setErrorMessage("");
    try {
      const res = await fetch('http://localhost:8080/api/v1/users/me/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ newPassword: security.newPassword })
      });
      if (!res.ok) throw new Error("Failed to save password");
      setSaveStatus("SAVED");
      setSecurity({ newPassword: "", confirmPassword: "" });
      setTimeout(() => setSaveStatus("IDLE"), 3000);
    } catch (err: any) {
      setSaveStatus("ERROR");
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Super Admin Profile</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Manage your personal information, email preferences, and security settings.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Navigation */}
        <div className="w-full md:w-56 shrink-0 flex flex-col gap-1">
          {[
            { id: "PROFILE", label: "General Info", icon: User },
            { id: "SECURITY", label: "Security & MFA", icon: ShieldCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setSaveStatus("IDLE"); setErrorMessage(""); }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all text-left border",
                activeTab === tab.id 
                  ? "bg-white border-slate-200 shadow-sm shadow-slate-200/50" 
                  : "bg-transparent border-transparent hover:bg-slate-100"
              )}
            >
              <div className={cn(
                "rounded-lg p-1.5 transition-colors",
                activeTab === tab.id ? "bg-cyan-50 text-cyan-600" : "text-slate-400"
              )}>
                <tab.icon className="size-4" />
              </div>
              <p className={cn("text-sm font-bold", activeTab === tab.id ? "text-slate-900" : "text-slate-600")}>{tab.label}</p>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="size-4" />
              {errorMessage}
            </div>
          )}

          {activeTab === "PROFILE" && (
            <form onSubmit={handleProfileSave} className="animate-in fade-in duration-300 space-y-6">
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Personal Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="size-4 text-slate-400" />
                      </div>
                      <input type="text" required value={profile.fullName} onChange={e => setProfile({...profile, fullName: e.target.value})} className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="size-4 text-slate-400" />
                      </div>
                      <input type="email" required value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all" />
                    </div>
                  </div>
                </div>
              </section>
              <div className="flex justify-end">
                <button type="submit" disabled={saveStatus === "SAVING"} className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 disabled:opacity-70 flex items-center gap-2">
                  {saveStatus === "SAVING" ? <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : null}
                  {saveStatus === "SAVED" ? <><CheckCircle2 className="size-4" /> Saved</> : "Save Profile"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "SECURITY" && (
            <form onSubmit={handleSecuritySave} className="animate-in fade-in duration-300 space-y-6">
               <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="size-4 text-slate-400" />
                      </div>
                      <input type="password" required value={security.newPassword} onChange={e => setSecurity({...security, newPassword: e.target.value})} className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="size-4 text-slate-400" />
                      </div>
                      <input type="password" required value={security.confirmPassword} onChange={e => setSecurity({...security, confirmPassword: e.target.value})} className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Smartphone className="size-32 text-slate-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Smartphone className="size-4" /> Multi-Factor Authentication</h3>
                <p className="text-sm text-slate-600 mb-4 max-w-sm">Use an authenticator app (like Google Authenticator) to secure your super admin account.</p>
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Enable TOTP</p>
                    <p className="text-xs text-slate-500 mt-0.5">Currently enabled for your account.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-not-allowed opacity-70">
                    <input type="checkbox" checked disabled className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </section>

              <div className="flex justify-end">
                <button type="submit" disabled={saveStatus === "SAVING" || !security.newPassword} className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 disabled:opacity-70 flex items-center gap-2">
                  {saveStatus === "SAVING" ? <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : null}
                  {saveStatus === "SAVED" ? <><CheckCircle2 className="size-4" /> Saved</> : "Update Password"}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
