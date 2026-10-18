import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ShieldCheck, UserCheck, Baby, Sparkles, LogOut } from 'lucide-react';

const DemoBanner = () => {
  const { user, login, logout } = useAuth();
  const { addToast } = useNotification();

  const handleQuickLogin = async (email, password, label) => {
    try {
      await login(email, password);
      addToast(`Switched account to ${label}!`, 'success');
    } catch (err) {
      addToast(`Failed to switch: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white text-xs py-2 px-4 shadow-sm border-b border-indigo-800">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-indigo-200">Demo Fast-Switch:</span>
          <span className="hidden sm:inline text-slate-300">Test platform roles instantly:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleQuickLogin('admin@littlesteps.com', 'Admin@12345', 'Admin')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              user?.role === 'admin'
                ? 'bg-rose-500 text-white shadow-sm ring-2 ring-white/50'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </button>

          <button
            onClick={() => handleQuickLogin('sarah.provider@littlesteps.com', 'Provider@123', 'Verified Provider (Sarah)')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              user?.role === 'provider' && user?.email === 'sarah.provider@littlesteps.com'
                ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-white/50'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            24/7 Provider (Sarah)
          </button>

          <button
            onClick={() => handleQuickLogin('david.provider@littlesteps.com', 'Provider@123', 'Pending Provider (David)')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              user?.role === 'provider' && user?.email === 'david.provider@littlesteps.com'
                ? 'bg-amber-500 text-white shadow-sm ring-2 ring-white/50'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Pending Provider (David)
          </button>

          <button
            onClick={() => handleQuickLogin('emily.parent@littlesteps.com', 'Parent@123', 'Parent (Emily)')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              user?.role === 'parent'
                ? 'bg-indigo-500 text-white shadow-sm ring-2 ring-white/50'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <Baby className="w-3.5 h-3.5" />
            Parent (Emily)
          </button>

          {user && (
            <button
              onClick={() => {
                logout();
                addToast('Logged out successfully', 'info');
              }}
              className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center gap-1 ml-1"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoBanner;
