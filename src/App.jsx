import React, { useState, useEffect } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { 
  BarChart3, 
  Wallet, 
  ArrowLeftRight, 
  History, 
  Settings, 
  BrainCircuit, 
  LogIn, 
  LogOut,
  PlusCircle,
  CreditCard,
  UserPlus,
  CalendarClock,
  Eye,
  EyeOff
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import AccountManager from './components/AccountManager';
import AIInsights from './components/AIInsights';
import AdminSettings from './components/AdminSettings';
import RecurringManager from './components/RecurringManager';
import ErrorBoundary from './components/ErrorBoundary';
import LogEntryModal from './components/LogEntryModal';
import { supabase } from './lib/supabase';

const Logo = ({ size = 24 }) => (
  <div className="flex items-center justify-center rounded-xl bg-primary text-black shadow-lg shadow-primary/20" style={{ width: size * 1.5, height: size * 1.5 }}>
    <Wallet size={size} strokeWidth={3} />
  </div>
);

const AppContent = () => {
  const { 
    user, profile, login, signup, logout, loading, sendPasswordResetEmail, updatePassword, 
    showLogModal, setShowLogModal, availableHouseholds, currentHouseholdId, setCurrentHouseholdId 
  } = useFinance();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login', 'signup', 'forgot', 'reset'
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Listen for the recovery event to trigger the 'reset' mode
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset');
      }
    });

    // Fix for "Supa Auth" localhost connection error on mobile
    const fixSupaLink = () => {
      const supaLink = document.querySelector('a[title="Supa Auth"]');
      if (supaLink && supaLink.href.includes('localhost:54321')) {
        const hostname = window.location.hostname;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
          supaLink.href = supaLink.href.replace('localhost', hostname);
          console.log(`[NETWORK] Patched Supa Auth link to: ${supaLink.href}`);
        }
      }
    };

    // Run fix immediately and on a short interval to catch dynamically injected elements
    fixSupaLink();
    const interval = setInterval(fixSupaLink, 2000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleAuth = async (e, trimmedEmail, pass, uname) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    try {
      if (authMode === 'signup') {
        const { error: authError } = await signup(trimmedEmail, pass, uname);
        if (authError) throw authError;
      } else if (authMode === 'login') {
        const { error: authError } = await login(trimmedEmail, pass);
        if (authError) throw authError;
      } else if (authMode === 'forgot') {
        const { error: authError } = await sendPasswordResetEmail(trimmedEmail);
        if (authError) throw authError;
        setMessage('Recovery link sent! Check your inbox.');
      } else if (authMode === 'reset') {
        const { error: authError } = await updatePassword(pass);
        if (authError) throw authError;
        setMessage('Password updated successfully! Welcome back.');
        // After reset, we are logged in, so it will redirect to dashboard automatically
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (!supabase) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="glass p-8 rounded-3xl border border-danger/20 max-w-md">
          <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="text-danger" size={32} />
          </div>
          <h2 className="text-2xl font-black mb-2">Configuration Missing</h2>
          <p className="text-text-muted text-sm mb-6 leading-relaxed">
            Your Vercel deployment is missing the **Supabase URL** and **Anon Key**.
          </p>
          <div className="bg-white/5 p-4 rounded-xl text-left text-[10px] font-mono space-y-2 mb-6">
            <p className={import.meta.env.VITE_SUPABASE_URL ? "text-success" : "text-danger"}>
              {import.meta.env.VITE_SUPABASE_URL ? "✓ URL Found" : "✗ VITE_SUPABASE_URL Missing"}
            </p>
            <p className={import.meta.env.VITE_SUPABASE_ANON_KEY ? "text-success" : "text-danger"}>
              {import.meta.env.VITE_SUPABASE_ANON_KEY ? "✓ Key Found" : "✗ VITE_SUPABASE_ANON_KEY Missing"}
            </p>
          </div>
          <p className="text-[10px] text-text-muted mb-6">
            Make sure to <b>Redeploy</b> in Vercel after adding these!
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-primary text-background font-black rounded-2xl hover:scale-[1.02] transition-all"
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-black">
        <div className="card glass w-full max-w-md animate-slide-up">
          <div className="flex flex-col items-center mb-8">
            <Logo size={48} />
            <h1 className="text-3xl font-bold mt-6">AK Finance</h1>
            <p className="text-text-muted mt-2">
              {authMode === 'signup' ? 'Create your account' : 
               authMode === 'forgot' ? 'Reset your password' :
               authMode === 'reset' ? 'Set new password' : 'Welcome back'}
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleAuth(e, email.trim().toLowerCase(), password, username); }} className="space-y-4">
            {authMode !== 'reset' && (
              <div>
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                  spellCheck={false}
                />
              </div>
            )}
            
            {authMode === 'signup' && (
              <div>
                <input 
                  type="text" 
                  placeholder="Full Name / Username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full"
                  required
                  autoCapitalize="words"
                  autoComplete="name"
                  spellCheck={false}
                />
              </div>
            )}

            {(authMode === 'login' || authMode === 'signup' || authMode === 'reset') && (
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder={authMode === 'reset' ? "Choose New Password" : "Password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-12"
                  required
                  autoComplete={authMode === 'login' ? "current-password" : "new-password"}
                  spellCheck={false}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            {error && <p className="text-danger text-sm mt-2 font-bold px-1">{error}</p>}
            {message && <p className="text-primary text-sm mt-2 font-bold px-1">{message}</p>}

            <button type="submit" className="btn btn-primary w-full mt-4 h-14">
              {authMode === 'signup' ? <UserPlus size={18} /> : 
               authMode === 'forgot' ? <ArrowLeftRight size={18} /> :
               authMode === 'reset' ? <Settings size={18} /> : <LogIn size={18} />}
              {authMode === 'signup' ? 'Sign Up' : 
               authMode === 'forgot' ? 'Send Reset Link' :
               authMode === 'reset' ? 'Update Password' : 'Login'}
            </button>

            {authMode === 'forgot' && (
              <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <p className="text-[10px] text-text-muted font-bold leading-relaxed">
                  <span className="text-primary uppercase tracking-tighter mr-1">Network Tip:</span> 
                  If using your iPhone, make sure to click "Send Reset Link" from your phone's browser so the link redirects you correctly.
                </p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/5 text-center">
              <p className="text-[9px] text-text-muted/50 uppercase tracking-widest font-mono">
                System Link: {supabase.supabaseUrl?.split('//')[1] || 'Unknown'}
              </p>
            </div>
          </form>
          
          <div className="mt-6 flex flex-col items-center gap-3">
            {authMode === 'login' && (
              <>
                <button 
                  onClick={() => setAuthMode('signup')}
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  Don't have an account? Sign Up
                </button>
                <button 
                  onClick={() => setAuthMode('forgot')}
                  className="text-text-muted text-xs hover:text-white transition-colors"
                >
                  Forgot Password?
                </button>
              </>
            )}
            {(authMode === 'signup' || authMode === 'forgot') && (
              <button 
                onClick={() => setAuthMode('login')}
                className="text-primary text-sm font-semibold hover:underline"
              >
                Back to Login
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'transactions': return <TransactionList />;
      case 'accounts': return <AccountManager />;
      case 'recurring': return <RecurringManager />;
      case 'ai': return <AIInsights />;
      case 'settings': return <AdminSettings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Mobile Top Bar */}
      <header className="flex md:hidden items-center justify-between p-4 glass border-b border-white/5 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Logo size={20} />
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-tight leading-none">AK Finance</span>
            <span className="text-[8px] text-primary uppercase tracking-[0.2em] font-black mt-0.5">
              {profile?.username || user?.email?.split('@')[0]}
            </span>
          </div>
        </div>
        <button onClick={logout} className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-all">
          <LogOut size={18} />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 glass border-r border-white/10 h-screen sticky top-0 z-20 flex-col">
        <div className="p-6 flex items-center gap-3">
          <Logo size={24} />
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight leading-none">AK Finance</span>
            <span className="text-[10px] text-primary uppercase tracking-[0.2em] font-black mt-1">
              {profile?.username || user?.email?.split('@')[0]}
            </span>
          </div>
        </div>

        {availableHouseholds.length > 1 && (
          <div className="px-6 mb-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/5 rounded-xl blur-sm group-hover:bg-primary/10 transition-all"></div>
              <select 
                value={currentHouseholdId || ''}
                onChange={(e) => setCurrentHouseholdId(e.target.value)}
                className="relative w-full bg-white/5 text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl border border-white/10 shadow-lg focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer hover:bg-white/10 transition-all"
              >
                {availableHouseholds.map(hh => (
                  <option key={hh.id} value={hh.id} className="bg-card text-text">
                    {hh.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 px-4 space-y-2 py-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'hover:bg-white/5 text-text-muted hover:text-white'}`}
          >
            <BarChart3 size={20} />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'transactions' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'hover:bg-white/5 text-text-muted hover:text-white'}`}
          >
            <History size={20} />
            Transactions
          </button>
          <button 
            onClick={() => setActiveTab('accounts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'accounts' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'hover:bg-white/5 text-text-muted hover:text-white'}`}
          >
            <CreditCard size={20} />
            Accounts
          </button>
          <button 
            onClick={() => setActiveTab('recurring')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'recurring' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'hover:bg-white/5 text-text-muted hover:text-white'}`}
          >
            <CalendarClock size={20} />
            Recurring
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'ai' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'hover:bg-white/5 text-text-muted hover:text-white'}`}
          >
            <BrainCircuit size={20} />
            AI Planning
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'hover:bg-white/5 text-text-muted hover:text-white'}`}
          >
            <Settings size={20} />
            Settings
          </button>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mt-2 hover:bg-danger/10 text-danger transition-all"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-bg">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Integrated Navigation */}
          <div className="flex md:hidden flex-col gap-6 mb-8">
            <div className="flex items-center gap-4">
              <Logo size={32} />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tighter">
                  {activeTab === 'dashboard' ? 'Overview' : 
                   activeTab === 'transactions' ? 'History' :
                   activeTab === 'accounts' ? 'Wallets' :
                   activeTab === 'recurring' ? 'Recurring' :
                   activeTab === 'ai' ? 'Insights' : 'Settings'}
                </h1>
                
                {availableHouseholds.length > 1 && (
                  <div className="relative group ml-1">
                    <select 
                      value={currentHouseholdId}
                      onChange={(e) => setCurrentHouseholdId(e.target.value)}
                      className="bg-primary text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border-2 border-white shadow-lg focus:ring-0 appearance-none cursor-pointer"
                    >
                      {availableHouseholds.map(hh => (
                        <option key={hh.id} value={hh.id} className="bg-card text-text">
                          {hh.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-black -mt-1">
                {availableHouseholds.find(h => h.id === currentHouseholdId)?.name || 'Personal Account'}
              </p>
            </div>
            </div>
            <nav className="glass border border-white/10 rounded-2xl flex items-center justify-between p-1">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-all ${activeTab === 'dashboard' ? 'text-primary' : 'text-text-muted hover:text-white'}`}
              >
                <BarChart3 size={20} />
                <span className="text-[8px] font-black uppercase tracking-tighter">Home</span>
              </button>
              <button 
                onClick={() => setActiveTab('transactions')}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-all ${activeTab === 'transactions' ? 'text-primary' : 'text-text-muted hover:text-white'}`}
              >
                <History size={20} />
                <span className="text-[8px] font-black uppercase tracking-tighter">History</span>
              </button>
              <button 
                onClick={() => setActiveTab('accounts')}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-all ${activeTab === 'accounts' ? 'text-primary' : 'text-text-muted hover:text-white'}`}
              >
                <CreditCard size={20} />
                <span className="text-[8px] font-black uppercase tracking-tighter">Wallets</span>
              </button>
              <button 
                onClick={() => setActiveTab('recurring')}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-all ${activeTab === 'recurring' ? 'text-primary' : 'text-text-muted hover:text-white'}`}
              >
                <CalendarClock size={20} />
                <span className="text-[8px] font-black uppercase tracking-tighter">Auto</span>
              </button>
              <button 
                onClick={() => setActiveTab('ai')}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-all ${activeTab === 'ai' ? 'text-primary' : 'text-text-muted hover:text-white'}`}
              >
                <BrainCircuit size={20} />
                <span className="text-[8px] font-black uppercase tracking-tighter">Insights</span>
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-all ${activeTab === 'settings' ? 'text-primary' : 'text-text-muted hover:text-white'}`}
              >
                <Settings size={20} />
                <span className="text-[8px] font-black uppercase tracking-tighter">Setup</span>
              </button>
            </nav>
          </div>

          <ErrorBoundary key={activeTab}>
            {renderContent()}
          </ErrorBoundary>
        </div>
      </main>

      {/* Global Log Entry Modal */}
      <LogEntryModal 
        isOpen={showLogModal} 
        onClose={() => setShowLogModal(false)} 
      />
    </div>
  );
};

const App = () => {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
};

export default App;
