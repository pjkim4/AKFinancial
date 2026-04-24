import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Filter,
  Send,
  Loader2,
  Plus,
  Trash2,
  X,
  CreditCard,
  Eye,
  EyeOff,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Edit2,
  Check
} from 'lucide-react';

const Dashboard = () => {
  const { 
    accounts, 
    transactions, 
    frequentPayments, 
    addTransaction, 
    transferFunds, 
    createAccount,
    addFrequentPayment, 

    deleteFrequentPayment,
    preferences,
    updatePreferences,
    toggleBalances,
    setShowLogModal,
    currentHouseholdId,
    availableHouseholds
  } = useFinance();

  const { showInstantMove, showMonthlyTrend, showExpenseDistribution } = preferences;
  
  const [filterAccount, setFilterAccount] = useState('all');
  const [chartPeriod, setChartPeriod] = useState('1M'); // 1M, 3M, 6M, YTD, All
  
  // Instant Move State
  const [qtSource, setQtSource] = useState(accounts[0]?.id || '');
  const [qtTarget, setQtTarget] = useState('');
  const [qtAmount, setQtAmount] = useState('');
  
  // Shortcut Modal State
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isShortcutsEditMode, setIsShortcutsEditMode] = useState(false);
  const [newShortcut, setNewShortcut] = useState({ 
    name: '', 
    amount: '', 
    category: 'Entertainment', 
    color: '#10b981',
    account_id: accounts[0]?.id || ''
  });
  
  const [loading, setLoading] = useState(false);

  // Sync local states when accounts change (e.g. on household switch)
  React.useEffect(() => {
    if (accounts.length > 0) {
      // If current qtSource is no longer in accounts, reset it
      if (!accounts.find(a => a.id === qtSource)) {
        setQtSource(accounts[0].id);
      }
      // Same for newShortcut account preference
      if (!accounts.find(a => a.id === newShortcut.account_id)) {
        setNewShortcut(prev => ({ ...prev, account_id: accounts[0].id }));
      }
    } else {
      setQtSource('');
      setNewShortcut(prev => ({ ...prev, account_id: '' }));
    }
  }, [accounts]);


  const filteredTransactions = useMemo(() => {
    if (filterAccount === 'all') return transactions;
    return transactions.filter(t => t.account_id === filterAccount);
  }, [transactions, filterAccount]);

  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'Income' && t.category !== 'Transfer')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = filteredTransactions
      .filter(t => t.type === 'Expense' && t.category !== 'Transfer')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const balance = filterAccount === 'all' 
      ? accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)
      : accounts.find(a => a.id === filterAccount)?.balance || 0;
    
    return { income, expenses, balance };
  }, [filteredTransactions, accounts, filterAccount]);

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    const grouped = transactions.reduce((acc, t) => {
      // Use string split to avoid timezone-associated date shifting
      const [y, m] = t.date.split('-').map(Number);
      
      if (y === currentYear && t.category !== 'Transfer') {
        const monthName = months[m - 1];
        if (!acc[monthName]) acc[monthName] = { name: monthName, income: 0, expense: 0 };
        if (t.type === 'Income') acc[monthName].income += Number(t.amount);
        else acc[monthName].expense += Number(t.amount);
      }
      return acc;
    }, {});

    return months.slice(0, new Date().getMonth() + 1)
      .map(m => grouped[m] || { name: m, income: 0, expense: 0 })
      .slice(-6);
  }, [transactions]);

  const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'];
  const pieData = useMemo(() => {
    const now = new Date();
    const categories = {};
    
    filteredTransactions
      .filter(t => {
        if (t.type !== 'Expense' || t.category === 'Transfer') return false;
        
        const txDate = new Date(t.date);
        if (chartPeriod === '1M') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          return txDate >= thirtyDaysAgo;
        }
        if (chartPeriod === '3M') {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(now.getDate() - 90);
          return txDate >= ninetyDaysAgo;
        }
        if (chartPeriod === '6M') {
          const halfYearAgo = new Date();
          halfYearAgo.setDate(now.getDate() - 180);
          return txDate >= halfYearAgo;
        }
        if (chartPeriod === 'YTD') {
          return txDate.getFullYear() === now.getFullYear();
        }
        return true; // "All"
      })
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + Number(t.amount);
      });
    return Object.keys(categories).map(cat => ({ name: cat, value: categories[cat] }));
  }, [filteredTransactions, chartPeriod]);

  const handleFrequentPayment = async (item) => {
    if (accounts.length === 0 || loading) return;
    
    if (!window.confirm(`Log ${item.name} for $${item.amount}?`)) return;

    setLoading(true);
    await addTransaction({
      amount: item.amount,
      type: 'Expense',
      description: `${item.name}`,
      account_id: item.account_id || accounts[0].id,
      category: item.category,
      date: new Date().toISOString().split('T')[0]
    });
    setLoading(false);
    alert(`Successfully logged ${item.name} ($${item.amount})`);
  };

  const handleQuickTransfer = async () => {
    if (!qtSource || !qtTarget || !qtAmount || loading) return;
    if (qtSource === qtTarget) return;
    setLoading(true);
    await transferFunds(qtSource, qtTarget, qtAmount);
    setQtAmount('');
    setLoading(false);
  };

  const handleAddShortcut = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await addFrequentPayment(newShortcut);
    if (result.error) {
      alert(`Failed to add shortcut: ${result.error.message || 'Unknown error'}`);
    } else {
      setNewShortcut({ name: '', amount: '', category: 'Entertainment', color: '#10b981', account_id: accounts[0]?.id || '' });
      setIsShortcutModalOpen(false);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6">
        <div className="hidden md:block">
          <h2 className="text-2xl md:text-4xl font-black tracking-tighter">Financial Overview</h2>
          <p className="text-[10px] text-primary uppercase font-black tracking-widest mt-1">
            Active Workspace: {availableHouseholds.find(h => h.id === currentHouseholdId)?.name || 'Personal Account'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-1.5 h-1.5 rounded-full ${accounts.length > 0 ? 'bg-success' : 'bg-warning animate-pulse'}`}></div>
            <p className="text-[8px] text-text-muted uppercase font-black tracking-[0.2em]">
              Cloud Sync: {accounts.length} Wallets Active
            </p>
          </div>
        </div>


        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowLogModal(true)}
            className="btn btn-primary h-12 px-6 text-black font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20"
          >
            <Plus size={18} strokeWidth={3} />
            Log Entry
          </button>

          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => updatePreferences({ showInstantMove: !showInstantMove })}
              className={`p-2 rounded-lg transition-all ${showInstantMove ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-white'}`}
              title="Toggle Instant Move"
            >
              <CreditCard size={18} />
            </button>
            <button 
              onClick={() => updatePreferences({ showMonthlyTrend: !showMonthlyTrend })}
              className={`p-2 rounded-lg transition-all ${showMonthlyTrend ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-white'}`}
              title="Toggle Monthly Trend"
            >
              <BarChartIcon size={18} />
            </button>
            <button 
              onClick={() => updatePreferences({ showExpenseDistribution: !showExpenseDistribution })}
              className={`p-2 rounded-lg transition-all ${showExpenseDistribution ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-white'}`}
              title="Toggle Expense Distribution"
            >
              <PieChartIcon size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto md:ml-0">
            <Filter size={16} className="text-primary hidden sm:block" />
            <select 
              value={filterAccount} 
              onChange={(e) => setFilterAccount(e.target.value)}
              className="w-40 md:w-64 h-12 text-sm font-bold"
            >
              <option value="all">Total Portfolio</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card shadow-2xl bg-gradient-to-br from-card to-[#222] border-primary/20 overflow-hidden min-h-[140px] flex flex-col justify-center">
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Wallet size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-text-muted text-[10px] uppercase tracking-[0.2em] font-black">Total Assets</p>
                <button 
                  onClick={toggleBalances}
                  className="p-1 hover:bg-white/10 rounded-md text-text-muted hover:text-white transition-all"
                  title={preferences.hideBalances ? "Show Balances" : "Hide Balances"}
                >
                  {preferences.hideBalances ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
              </div>
              <h3 className="text-4xl font-black">
                {preferences.hideBalances ? '••••••' : `$${Number(stats.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </h3>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-4 mt-4">
            {/* Accounts breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6">
              {accounts.map(acc => (
                <div key={acc.id} className="flex justify-between items-center bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-text-muted uppercase font-black tracking-widest">{acc.name}</span>
                  <span className="text-xs font-black text-white ml-4">
                    {preferences.hideBalances ? '••••' : `$${Number(acc.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card border-success/20 bg-card min-h-[140px] flex flex-col justify-center">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-success/10 rounded-2xl flex items-center justify-center border border-success/20">
              <ArrowUpRight className="text-success" size={28} />
            </div>
            <div>
              <p className="text-text-muted text-[10px] uppercase tracking-[0.2em] font-black mb-1">Cash Inflow</p>
              <h3 className="text-3xl font-black text-success">
                {preferences.hideBalances ? '••••••' : `+$${Number(stats.income).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </h3>
            </div>
          </div>
        </div>

        <div className="card border-white/5 bg-card min-h-[140px] flex flex-col justify-center">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
              <ArrowDownRight className="text-danger" size={28} />
            </div>
            <div>
              <p className="text-text-muted text-[10px] uppercase tracking-[0.2em] font-black mb-1">Total Expenses</p>
              <h3 className="text-3xl font-black text-white">
                {preferences.hideBalances ? '••••••' : `-$${Number(stats.expenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Shortcuts & Instant Move */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`card ${showInstantMove ? 'lg:col-span-2' : 'lg:col-span-3'} bg-card border-white/5`}>
          <div className="flex items-center justify-between mb-8">
             <div>
                <h4 className="font-black text-lg">One-Tap Shortcuts</h4>
                <p className="text-[10px] text-text-muted uppercase tracking-widest mt-1">Instant transaction logging</p>
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={() => setIsShortcutsEditMode(!isShortcutsEditMode)}
                  className={`p-2 rounded-lg transition-all ${isShortcutsEditMode ? 'bg-danger text-white' : 'bg-white/5 text-text-muted hover:text-white'}`}
                  title={isShortcutsEditMode ? 'Done Editing' : 'Edit Shortcuts'}
                >
                  {isShortcutsEditMode ? <Check size={18} /> : <Edit2 size={18} />}
                </button>
                <button 
                  onClick={() => setIsShortcutModalOpen(true)}
                  className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-black transition-all"
                >
                    <Plus size={18} />
                </button>
             </div>
          </div>
          <div className={`grid grid-cols-2 ${showInstantMove ? 'md:grid-cols-4' : 'md:grid-cols-6'} gap-4`}>
            {frequentPayments.map((item) => (
              <div 
                key={item.id} 
                className="relative group p-4 bg-white/5 rounded-2xl hover:bg-primary transition-all cursor-pointer border border-white/5 hover:border-transparent flex flex-col items-center text-center overflow-visible"
              >
                <div onClick={() => !isShortcutsEditMode && handleFrequentPayment(item)} className="w-full h-full flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 font-black text-2xl bg-white/10 group-hover:bg-black/20" style={{ color: item.color }}>
                    {item.name.charAt(0)}
                  </div>
                  <p className="text-sm font-black group-hover:text-black transition-colors line-clamp-1">{item.name}</p>
                  <p className="text-[10px] font-bold text-text-muted group-hover:text-black/60 mt-1">${item.amount}</p>
                </div>
                
                {isShortcutsEditMode && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteFrequentPayment(item.id); }}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-danger text-white rounded-full flex items-center justify-center shadow-xl z-30 border-2 border-card animate-scale-in"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            {frequentPayments.length === 0 && (
              <div className="col-span-full py-10 border border-dashed border-white/10 rounded-2xl text-center text-text-muted text-xs font-bold">
                No shortcuts found. Add your first one using the + button.
              </div>
            )}
          </div>
        </div>

        {showInstantMove && (
          <div className="card flex flex-col justify-between bg-card border-white/5 overflow-visible">
            <div>
              <h4 className="font-black text-lg mb-1">Instant Move</h4>
              <p className="text-[10px] text-text-muted uppercase tracking-widest mb-6">Internal Asset Transfers</p>
            </div>
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-1">From Wallet</label>
                  <select 
                    className="font-bold border-white/10"
                    value={qtSource}
                    onChange={(e) => setQtSource(e.target.value)}
                  >
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({preferences.hideBalances ? '••••' : `$${acc.balance}`})</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-1">To Wallet</label>
                  <select 
                    className="font-bold border-white/10"
                    value={qtTarget}
                    onChange={(e) => setQtTarget(e.target.value)}
                  >
                    <option value="">Select Destination</option>
                    {accounts.filter(acc => acc.id !== qtSource).map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({preferences.hideBalances ? '••••' : `$${acc.balance}`})</option>
                    ))}
                  </select>
               </div>
               <div className="flex gap-2 items-end">
                  <div className="flex-1">
                     <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-1">Amount</label>
                     <input 
                      type="number" 
                      placeholder="0.00" 
                      className="font-black"
                      value={qtAmount}
                      onChange={(e) => setQtAmount(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleQuickTransfer}
                    disabled={loading || !qtTarget || !qtAmount}
                    className="btn btn-primary px-5 py-3.5 rounded-xl disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin text-black" size={20} /> : <Send size={20} className="text-black" />}
                  </button>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Shortcut Management Modal */}
      {isShortcutModalOpen && createPortal(
        <div className="fixed inset-0 z-max flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="card w-full max-w-md shadow-2xl bg-card border-white/10 relative">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-bold">New Shortcut</h3>
               <button onClick={() => setIsShortcutModalOpen(false)}><X size={24} /></button>
             </div>
             <form onSubmit={handleAddShortcut} className="space-y-6">
                <div>
                   <label className="text-xs text-text-muted uppercase font-black tracking-widest mb-2 block">Name (e.g. Netflix)</label>
                   <input required value={newShortcut.name} onChange={e => setNewShortcut({...newShortcut, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-text-muted uppercase font-black tracking-widest mb-2 block">Default Amount</label>
                    <input type="number" step="0.01" required value={newShortcut.amount} onChange={e => setNewShortcut({...newShortcut, amount: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted uppercase font-black tracking-widest mb-2 block">Category</label>
                    <select value={newShortcut.category} onChange={e => setNewShortcut({...newShortcut, category: e.target.value})}>
                       <option>Food</option>
                       <option>Entertainment</option>
                       <option>Subscription</option>
                       <option>Productivity</option>
                       <option>Health</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase font-black tracking-widest mb-2 block">Primary Wallet</label>
                  <select required value={newShortcut.account_id} onChange={e => setNewShortcut({...newShortcut, account_id: e.target.value})}>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary w-full h-14 uppercase font-black text-black">Add Shortcut</button>
             </form>
          </div>
        </div>,
        document.body
      )}

      {/* Charts */}
      {(showMonthlyTrend || showExpenseDistribution) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
          {showMonthlyTrend && (
            <div className={`card bg-card border-white/5 h-[500px] flex flex-col ${!showExpenseDistribution ? 'lg:col-span-2' : ''}`}>
              <h4 className="text-sm font-black uppercase tracking-widest mb-6 text-primary">Monthly Trend</h4>
              <div className="flex-1 min-h-[350px]">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" fontSize={11} fontWeight={900} />
                    <YAxis stroke="#666" fontSize={11} fontWeight={900} />
                    <Tooltip contentStyle={{ background: '#181818', border: '1px solid #333' }} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar name="Income" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar name="Expense" dataKey="expense" fill="#ff4d4d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {showExpenseDistribution && (
            <div className={`card bg-card border-white/5 h-[500px] flex flex-col ${!showMonthlyTrend ? 'lg:col-span-2' : ''}`}>
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black uppercase tracking-widest text-primary">Expense Distribution</h4>
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                  {['1M', '3M', '6M', 'YTD', 'All'].map(p => (
                    <button 
                      key={p}
                      onClick={() => setChartPeriod(p)}
                      className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${chartPeriod === p ? 'bg-primary text-black' : 'text-text-muted hover:text-white'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-h-[350px]">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart margin={{ bottom: 30 }}>
                    <Pie 
                      data={pieData} 
                      cx="50%" 
                      cy="45%" 
                      innerRadius={55} 
                      outerRadius={85} 
                      paddingAngle={5} 
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#181818', border: '1px solid #333' }} />
                    <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};



export default Dashboard;
