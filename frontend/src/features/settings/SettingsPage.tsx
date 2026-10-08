import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Bell, Moon, Sun, Save, LogOut, Database, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { fetchSnowflakeStatus, updateSnowflakeConfig } from '../../api/analyticsApi';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'appearance' | 'integrations'>('profile');
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');

  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [sfAccount, setSfAccount] = useState('');
  const [sfUser, setSfUser] = useState('');
  const [sfPassword, setSfPassword] = useState('');
  const [sfWarehouse, setSfWarehouse] = useState('');
  const [sfDatabase, setSfDatabase] = useState('');
  const [sfSchema, setSfSchema] = useState('');

  React.useEffect(() => {
    if (activeTab === 'integrations') {
      fetchSnowflakeStatus()
        .then((res) => {
          setIsConnected(res.config?.isConnected || false);
          if (res.config) {
            setSfAccount(res.config.account || '');
            setSfUser(res.config.username || '');
            setSfWarehouse(res.config.warehouse || '');
            setSfDatabase(res.config.database || '');
            setSfSchema(res.config.schema || '');
          }
        })
        .catch(console.error);
    }
  }, [activeTab]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus('idle');
    try {
      await updateSnowflakeConfig({
        account: sfAccount,
        username: sfUser,
        password: sfPassword,
        warehouse: sfWarehouse,
        database: sfDatabase,
        schema: sfSchema
      });
      setTestStatus('success');
    } catch (err) {
      setTestStatus('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConnection = async () => {
    setIsSaving(true);
    try {
      await updateSnowflakeConfig({
        account: sfAccount,
        username: sfUser,
        password: sfPassword,
        warehouse: sfWarehouse,
        database: sfDatabase,
        schema: sfSchema
      });
      setIsConnected(true);
      setTestStatus('success');
    } catch (err) {
      setTestStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage your account settings and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setActiveTab('profile')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === 'profile' ? "bg-cyan-50 text-cyan-700" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <User className="size-4" /> Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === 'security' ? "bg-cyan-50 text-cyan-700" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Lock className="size-4" /> Security
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === 'notifications' ? "bg-cyan-50 text-cyan-700" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Bell className="size-4" /> Notifications
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === 'appearance' ? "bg-cyan-50 text-cyan-700" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Sun className="size-4" /> Appearance
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === 'integrations' ? "bg-cyan-50 text-cyan-700" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Database className="size-4" /> Integrations
            </button>
          </nav>
          
          <div className="mt-4 md:mt-8 border-t border-slate-100 pt-4">
            <button 
              onClick={handleLogout} 
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="size-4" /> Sign Out
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Profile Information</h2>
                  <p className="text-sm text-slate-500">Update your personal details and public profile.</p>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="grid gap-5 max-w-xl">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" 
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" 
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Role</label>
                    <input 
                      type="text" 
                      disabled 
                      value={user?.role?.replace('_', ' ') || ''} 
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 outline-none cursor-not-allowed" 
                    />
                    <p className="text-xs text-slate-400">Your role is managed by your organization administrator.</p>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-cyan-500/20 transition-all hover:bg-cyan-700 hover:shadow-cyan-500/30">
                    <Save className="size-4" /> Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div>
                  <h2 className="text-lg font-semibold text-slate-900">Security</h2>
                  <p className="text-sm text-slate-500">Manage your password and security preferences.</p>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="grid gap-5 max-w-xl">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Current Password</label>
                    <input type="password" placeholder="••••••••" className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">New Password</label>
                    <input type="password" placeholder="••••••••" className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Confirm New Password</label>
                    <input type="password" placeholder="••••••••" className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-slate-800">
                    Update Password
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div>
                  <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
                  <p className="text-sm text-slate-500">Choose what you want to be notified about.</p>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">Email Alerts</h3>
                      <p className="text-xs text-slate-500 mt-1">Receive daily summary reports and critical alerts.</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" className="peer sr-only" defaultChecked />
                      <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">Pipeline Failures</h3>
                      <p className="text-xs text-slate-500 mt-1">Get notified immediately when a data pipeline fails.</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" className="peer sr-only" defaultChecked />
                      <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div>
                  <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
                  <p className="text-sm text-slate-500">Customize the look and feel of the application.</p>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <div className="cursor-pointer rounded-xl border-2 border-cyan-500 bg-slate-50 p-4 text-center transition-all hover:bg-slate-100">
                    <Sun className="mx-auto mb-2 size-6 text-cyan-600" />
                    <span className="text-sm font-medium text-slate-900">Light Mode</span>
                  </div>
                  <div className="cursor-not-allowed rounded-xl border-2 border-slate-100 bg-slate-50 p-4 text-center opacity-50 transition-all">
                    <Moon className="mx-auto mb-2 size-6 text-slate-400" />
                    <span className="text-sm font-medium text-slate-500">Dark Mode <br/><span className="text-[10px]">(Coming Soon)</span></span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Data Integrations</h2>
                  <p className="text-sm text-slate-500">Connect external data warehouses and EHR systems.</p>
                </div>
                <div className="h-px bg-slate-100" />
                
                {/* Snowflake Integration Card */}
                <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-600">
                        <Database className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Snowflake Data Cloud</h3>
                        <p className="text-xs text-slate-500">Connect your Snowflake account to import healthcare data directly.</p>
                      </div>
                    </div>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 className="size-3" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500">
                        Not Connected
                      </span>
                    )}
                  </div>
                  
                  <div className="grid gap-4 mt-4 bg-white p-4 rounded-xl border border-slate-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Account Identifier</label>
                        <input type="text" value={sfAccount} onChange={e => setSfAccount(e.target.value)} placeholder="e.g. xy12345.us-east-1" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Username</label>
                        <input type="text" value={sfUser} onChange={e => setSfUser(e.target.value)} placeholder="SNOWFLAKE_USER" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Password</label>
                        <input type="password" value={sfPassword} onChange={e => setSfPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Warehouse</label>
                        <input type="text" value={sfWarehouse} onChange={e => setSfWarehouse(e.target.value)} placeholder="COMPUTE_WH" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Database</label>
                        <input type="text" value={sfDatabase} onChange={e => setSfDatabase(e.target.value)} placeholder="CARE_DATA_DB" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Schema</label>
                        <input type="text" value={sfSchema} onChange={e => setSfSchema(e.target.value)} placeholder="PUBLIC" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20" />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100">
                      <div>
                        {testStatus === 'success' && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 className="size-4" /> Connection successful
                          </div>
                        )}
                        {testStatus === 'error' && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                            <AlertCircle className="size-4" /> Connection failed
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={handleTestConnection}
                          disabled={isTesting || isSaving}
                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition disabled:opacity-50"
                        >
                          {isTesting && <Loader2 className="size-3.5 animate-spin" />}
                          Test Connection
                        </button>
                        <button 
                          onClick={handleSaveConnection}
                          disabled={isTesting || isSaving || testStatus !== 'success'}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 hover:shadow-blue-500/30 disabled:opacity-50 disabled:hover:bg-blue-600"
                        >
                          {isSaving && <Loader2 className="size-3.5 animate-spin" />}
                          Save Connection
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
