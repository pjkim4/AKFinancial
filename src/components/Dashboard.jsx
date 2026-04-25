import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import SearchableSelect from './ui/SearchableSelect';

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
  Check,
  Zap,
  History,
  ArrowUpDown
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
    updateFrequentPayment,
    deleteFrequentPayment,
    preferences,
    updatePreferences,
    toggleBalances,
    setShowLogModal,
    currentHouseholdId,
    availableHouseholds,
    t,
    addCustomCategory,
    updateCustomCategory,
    deleteCustomCategory,
    user
  } = useFinance();





  const { showInstantMove, showMonthlyTrend, showExpenseDistribution } = preferences;
  
  const [filterAccount, setFilterAccount] = useState('all');
  const [chartPeriod, setChartPeriod] = useState('1M'); // 1M, 3M, 6M, YTD, All
  const [statsPeriod, setStatsPeriod] = useState('1M'); // 1M, 3M, YTD, All
  const [trendPeriod, setTrendPeriod] = useState('6M'); // 6M, 1Y, All
  const [pendingShortcut, setPendingShortcut] = useState(null);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isLogConfirmationOpen, setIsLogConfirmationOpen] = useState(false);
  const [logFormData, setLogFormData] = useState({ amount: '', date: '' });
  
  // Instant Move State
  const [qtSource, setQtSource] = useState(accounts[0]?.id || '');
  const [qtTarget, setQtTarget] = useState('');
  const [qtAmount, setQtAmount] = useState('');
  const [qtDate, setQtDate] = useState(new Date().toISOString().split('T')[0]);
  
  const logAmountRef = useRef(null);
  const logDateRef = useRef(null);

  useEffect(() => {
    if (isLogConfirmationOpen) {
      const amountVal = Number(logFormData.amount);
      if (!amountVal || amountVal === 0) {
        setTimeout(() => logAmountRef.current?.focus(), 100);
      } else {
        setTimeout(() => logDateRef.current?.focus(), 100);
      }
    }
  }, [isLogConfirmationOpen]);

  const expenseCategories = [
    { id: 'Food', name: t('cat_food') },
    { id: 'Rent', name: t('cat_rent') },
    { id: 'Transport', name: t('cat_transport') },
    { id: 'Entertainment', name: t('cat_entertainment') },
    { id: 'Utilities', name: t('cat_utilities') },
    { id: 'Shopping', name: t('cat_shopping') },
    { id: 'Health', name: t('cat_health') },
    { id: 'Other', name: t('cat_other') },
    ...(preferences.customCategories?.expense || []).map(c => ({ ...c, isCustom: true }))
  ];

  const incomeCategories = [
    { id: 'Salary', name: t('cat_salary') || 'Salary' },
    { id: 'Investment', name: t('cat_investment') || 'Investment' },
    { id: 'Gift', name: t('cat_gift') || 'Gift' },
    { id: 'Other', name: t('cat_other') },
    ...(preferences.customCategories?.income || []).map(c => ({ ...c, isCustom: true }))
  ];


  
  // Shortcut Modal State
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isShortcutsEditMode, setIsShortcutsEditMode] = useState(false);
  const [linkingShortcut, setLinkingShortcut] = useState(null);
  const [newShortcut, setNewShortcut] = useState({ 
    name: '', 
    amount: '', 
    category: 'Entertainment', 
    type: 'Expense',
    color: '#10b981',
    account_id: ''
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
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const periodTransactions = filteredTransactions.filter(t => {
      const txDate = new Date(t.date);
      if (statsPeriod === '1M') {
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      }
      if (statsPeriod === '3M') {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(now.getDate() - 90);
        return txDate >= ninetyDaysAgo;
      }
      if (statsPeriod === 'YTD') {
        return txDate.getFullYear() === currentYear;
      }
      return true; // 'All'
    });

    const income = periodTransactions
      .filter(t => t.type === 'Income' && t.category !== 'Transfer')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = periodTransactions
      .filter(t => t.type === 'Expense' && t.category !== 'Transfer')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const balance = filterAccount === 'all' 
      ? accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)
      : accounts.find(a => a.id === filterAccount)?.balance || 0;
    
    return { income, expenses, balance };
  }, [filteredTransactions, accounts, filterAccount, statsPeriod]);

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    
    // Generate last N months based on trendPeriod
    let monthsToFetch = 6;
    if (trendPeriod === '1Y') monthsToFetch = 12;
    if (trendPeriod === 'All') monthsToFetch = 36; // Cap at 3 years for performance

    const result = [];
    for (let i = monthsToFetch - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = months[d.getMonth()];
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      
      const monthTxs = transactions.filter(t => {
        const [ty, tm] = t.date.split('-').map(Number);
        return ty === year && tm === monthNum && t.category !== 'Transfer';
      });

      const income = monthTxs.filter(t => t.type === 'Income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = monthTxs.filter(t => t.type === 'Expense').reduce((s, t) => s + Number(t.amount), 0);
      
      result.push({ 
        name: monthsToFetch > 12 ? `${mName} ${String(year).slice(-2)}` : mName, 
        income, 
        expense 
      });
    }

    return result;
  }, [transactions, trendPeriod]);

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
    
    let finalAccountId = item.account_id;
    const accountExists = accounts.some(a => String(a.id) === String(finalAccountId));

    if (!finalAccountId || !accountExists) {
      setPendingShortcut(item);
      setIsAccountPickerOpen(true);
      return;
    }

    const account = accounts.find(a => String(a.id) === String(finalAccountId)) || accounts[0];
    
    // Set up confirmation modal instead of prompt/confirm
    setPendingShortcut({ ...item, account_id: finalAccountId });
    setLogFormData({ 
      amount: item.amount || '', 
      date: new Date().toISOString().split('T')[0] 
    });
    setIsLogConfirmationOpen(true);
  };

  const executeLogShortcut = async () => {
    if (!pendingShortcut || loading) return;
    
    const finalAmount = logFormData.amount;
    const finalDate = logFormData.date;

    if (!finalAmount || Number(finalAmount) === 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      const result = await addTransaction({
        amount: finalAmount,
        type: pendingShortcut.type || 'Expense',
        description: `${pendingShortcut.name}`,
        account_id: pendingShortcut.account_id || accounts[0].id,
        category: pendingShortcut.category,
        date: finalDate,
        member_id: user?.id
      });

      if (result?.error) {
        alert('Failed to log: ' + result.error.message);
      } else {
        setIsLogConfirmationOpen(false);
        setPendingShortcut(null);
      }
    } catch (err) {
      console.error('Log failed:', err);
      alert('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };



  const handlePickAccount = (accId) => {
    setIsAccountPickerOpen(false);
    if (pendingShortcut) {
      handleFrequentPayment({ ...pendingShortcut, account_id: accId });
    }
  };




  const handleQuickTransfer = async () => {
    if (!qtSource || !qtTarget || !qtAmount || loading) return;
    if (qtSource === qtTarget) return;
    setLoading(true);
    await transferFunds(qtSource, qtTarget, qtAmount, qtDate);
    setQtAmount('');
    setLoading(false);
  };

  const handleAddShortcut = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Convert empty amount to 0 for database compatibility
    const submissionData = {
      ...newShortcut,
      amount: newShortcut.amount === '' ? 0 : newShortcut.amount
    };
    
    const result = await addFrequentPayment(submissionData);
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
          <h2 className="text-xl md:text-3xl font-black tracking-tighter">Financial Overview</h2>

          <p className="text-[10px] text-primary uppercase font-black tracking-widest mt-1">
            {t('dash_active_workspace')}: {availableHouseholds.find(h => h.id === currentHouseholdId)?.name || t('dash_personal_account')}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-1.5 h-1.5 rounded-full ${accounts.length > 0 ? 'bg-success' : 'bg-warning animate-pulse'}`}></div>
            <p className="text-[8px] text-text-muted uppercase font-black tracking-[0.2em]">
              {t('dash_cloud_sync')}: {accounts.length} {t('dash_wallets_active')}
            </p>
          </div>
        </div>


        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowLogModal(true)}
            className="btn btn-primary h-12 px-6 text-black font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20"
          >
            <Plus size={18} strokeWidth={3} />
            {t('dash_add_transaction')}
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

          <div className="flex flex-wrap items-center gap-3 md:gap-4 ml-auto w-full md:w-auto justify-end">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
              {['1M', '3M', 'YTD', 'All'].map(p => (
                <button 
                  key={p}
                  onClick={() => setStatsPeriod(p)}
                  className={`px-2 sm:px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${statsPeriod === p ? 'bg-primary text-black' : 'text-text-muted hover:text-white'}`}
                >
                  {p}
                </button>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Account Switcher Row */}
      <div className="mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 w-fit max-w-full group hover:border-primary/30 transition-all">
          <div className="flex items-center gap-2 pl-3 pr-2 border-r border-white/10">
            <Filter size={16} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted hidden sm:block">Portfolio filter</span>
          </div>
          <select 
            value={filterAccount} 
            onChange={(e) => setFilterAccount(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-white font-black uppercase italic tracking-tight text-sm h-10 px-4 cursor-pointer hover:text-primary transition-colors min-w-[200px]"
          >
            <option value="all" className="bg-[#181818] text-white">Total Portfolio</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id} className="bg-[#181818] text-white">{acc.name}</option>
            ))}
          </select>
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
                <p className="text-text-muted text-[10px] uppercase tracking-[0.2em] font-black">{t('dash_total_assets')}</p>
                <button 
                  onClick={toggleBalances}
                  className="p-1 hover:bg-white/10 rounded-md text-text-muted hover:text-white transition-all"
                  title={preferences.hideBalances ? "Show Balances" : "Hide Balances"}
                >
                  {preferences.hideBalances ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
              </div>
              <h3 className="text-2xl md:text-3xl font-black">
                {preferences.hideBalances ? '••••••' : `$${Number(stats.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </h3>

            </div>
          </div>
          
          <div className="border-t border-white/5 pt-4 mt-4">
            {/* Accounts breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6">
              {accounts.map(acc => (
                <div key={acc.id} className="flex justify-between items-center bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                  <span className="text-[8px] text-text-muted uppercase font-black tracking-widest">{acc.name}</span>
                  <span className="text-[10px] font-black text-white ml-4">
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
              <p className="text-text-muted text-[10px] uppercase tracking-[0.2em] font-black mb-1">{t('dash_monthly_income')} ({statsPeriod})</p>
              <h3 className="text-xl md:text-2xl font-black text-success">
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
              <p className="text-text-muted text-[10px] uppercase tracking-[0.2em] font-black mb-1">{t('dash_monthly_expense')} ({statsPeriod})</p>
              <h3 className="text-xl md:text-2xl font-black text-white">
                {preferences.hideBalances ? '••••••' : `-$${Number(stats.expenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Shortcuts & Instant Move */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card bg-card border-white/5 lg:col-span-2">
          <div className="flex items-center justify-between mb-8 px-1">
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-warning" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em]">{t('dash_quick_actions')}</h3>
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
          <div className="space-y-6">

            {accounts.map((acc) => {
              const shortcuts = frequentPayments
                .filter(p => p.account_id && String(p.account_id) === String(acc.id))
                .sort((a, b) => a.name.localeCompare(b.name));
              if (shortcuts.length === 0) return null;

              
              return (
                <div 
                  key={acc.id} 
                  style={{ border: '2px solid rgba(16, 185, 129, 0.4)', backgroundColor: 'rgba(0,0,0,0.4)', padding: '24px', borderRadius: '32px', marginBottom: '24px' }}
                  className="space-y-5 shadow-2xl"
                >






                  <div className="flex items-center gap-3 px-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{acc.name} (GROUP)</h5>

                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9 gap-2">


                    {shortcuts.map((item) => (
                        <div 
                          key={item.id} 
                          className="relative group p-2 bg-white/5 rounded-xl hover:bg-primary transition-all cursor-pointer border border-white/5 hover:border-transparent flex flex-col items-end text-right overflow-visible"
                        >
                        <div onClick={() => !isShortcutsEditMode && handleFrequentPayment(item)} className="w-full h-full flex flex-col items-end">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 font-black text-base bg-white/10 group-hover:bg-black/20 shrink-0 shadow-sm" style={{ color: item.color }}>
                            {item.type === 'Income' ? <ArrowUpRight size={18} /> : item.name.charAt(0)}
                          </div>
                          <div className="flex-1 flex flex-col items-end justify-center min-h-[36px] w-full px-1">
                             <p className="w-full text-[10px] font-black group-hover:text-black transition-colors truncate leading-tight text-right mb-0.5">{item.name}</p>
                             <p className="text-[9px] font-black text-text-muted group-hover:text-black/60 shrink-0">
                               {item.type === 'Income' ? '+' : ''}${item.amount || '???'}
                             </p>
                          </div>
                          {isShortcutsEditMode && (
                             <button 
                               onClick={(e) => { 
                                 e.stopPropagation(); 
                                 setLinkingShortcut(item);
                               }}
                               className="mt-2 py-1 px-3 bg-primary/20 rounded-full text-[7px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-black transition-all"
                             >
                               Link
                             </button>
                          )}
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
                  </div>
                </div>
              );
            })}

            {/* Handle unassigned shortcuts or catch-all if no accounts matched */}
            {frequentPayments.filter(p => !p.account_id || !accounts.some(acc => String(acc.id) === String(p.account_id))).length > 0 && (
              <div 
                style={{ border: '2px solid rgba(16, 185, 129, 0.4)', backgroundColor: 'rgba(0,0,0,0.4)', padding: '24px', borderRadius: '32px', marginBottom: '24px' }}
                className="space-y-5 shadow-2xl"
              >






                <div className="flex items-center gap-3 px-2">
                  <div className="w-1.5 h-4 bg-gray-500 rounded-full"></div>
                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Other / Unassigned</h5>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9 gap-2">
                  {frequentPayments
                    .filter(p => !p.account_id || !accounts.some(acc => String(acc.id) === String(p.account_id)))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((item) => (
  
                     <div 
                        key={item.id} 
                        className="relative group p-2 bg-white/5 rounded-xl hover:bg-primary transition-all cursor-pointer border border-white/5 hover:border-transparent flex flex-col items-end text-right overflow-visible"
                      >
                        <div onClick={() => !isShortcutsEditMode && handleFrequentPayment(item)} className="w-full h-full flex flex-col items-end">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 font-black text-base bg-white/10 group-hover:bg-black/20 shrink-0 shadow-sm" style={{ color: item.color }}>
                            {item.type === 'Income' ? <ArrowUpRight size={18} /> : item.name.charAt(0)}
                          </div>
                          <div className="flex-1 flex flex-col items-end justify-center min-h-[36px] w-full px-1">
                             <p className="w-full text-[10px] font-black group-hover:text-black transition-colors truncate leading-tight text-right mb-0.5">{item.name}</p>
                             <p className="text-[9px] font-black text-text-muted group-hover:text-black/60 shrink-0">
                               {item.type === 'Income' ? '+' : ''}${item.amount || '???'}
                             </p>
                          </div>
                          {isShortcutsEditMode && (
                             <button 
                               onClick={(e) => { 
                                 e.stopPropagation(); 
                                 setLinkingShortcut(item);
                               }}
                               className="mt-2 py-1 px-3 bg-primary/20 rounded-full text-[7px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-black transition-all"
                             >
                               Link
                             </button>
                          )}
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
                </div>
              </div>
            )}


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
            <div className="space-y-2">
               <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-1">From Wallet (Source)</label>
                  <select 
                    className="font-bold border-white/10"
                    value={qtSource}
                    onChange={(e) => setQtSource(e.target.value)}
                  >
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} — {preferences.hideBalances ? '••••' : `$${acc.balance}`}</option>)}
                  </select>
               </div>
               
               <div className="flex justify-center -my-1 relative z-10">
                  <button 
                   onClick={() => {
                     const temp = qtSource;
                     const newSource = qtTarget || accounts.find(a => a.id !== qtSource)?.id || '';
                     setQtSource(newSource);
                     setQtTarget(temp);
                   }}
                   className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary hover:text-black transition-all shadow-lg"
                  >
                    <ArrowUpDown size={14} />
                  </button>
               </div>

               <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-1">To Wallet (Destination)</label>
                  <select 
                    className="font-bold border-white/10"
                    value={qtTarget}
                    onChange={(e) => setQtTarget(e.target.value)}
                  >
                    <option value="">Select Destination</option>
                    {accounts.filter(acc => acc.id !== qtSource).map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} — {preferences.hideBalances ? '••••' : `$${acc.balance}`}</option>
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
                  <div className="w-32">
                     <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-1">Date</label>
                     <input 
                      type="date" 
                      className="font-bold text-xs"
                      value={qtDate}
                      onChange={(e) => setQtDate(e.target.value)}
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
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs text-text-muted uppercase font-black tracking-widest mb-2 block">Name (e.g. Netflix)</label>
                      <input required value={newShortcut.name} onChange={e => setNewShortcut({...newShortcut, name: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-xs text-text-muted uppercase font-black tracking-widest mb-2 block">Type</label>
                      <div className="flex gap-2">
                        {['Expense', 'Income'].map(t => (
                          <button 
                            key={t}
                            type="button"
                            onClick={() => setNewShortcut({...newShortcut, type: t, category: t === 'Expense' ? 'Entertainment' : 'Salary'})}
                            className={`flex-1 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${newShortcut.type === t ? 'bg-primary border-primary text-black' : 'bg-white/5 border-white/10 text-text-muted'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                   </div>
                 </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-text-muted uppercase font-black tracking-widest mb-2 block">Default Amount</label>
                    <input type="number" step="0.01" value={newShortcut.amount} onChange={e => setNewShortcut({...newShortcut, amount: e.target.value})} placeholder="0.00" />
                    <p className="text-[8px] text-text-muted mt-1 uppercase italic">Leave empty to ask every time</p>
                  </div>

                  <div>
                    <label className="text-xs text-text-muted uppercase font-black tracking-widest mb-2 block">Category</label>
                    <SearchableSelect 
                      options={newShortcut.type === 'Expense' ? expenseCategories : incomeCategories}
                      value={newShortcut.category}
                      onChange={(val) => {
                        const cats = newShortcut.type === 'Expense' ? expenseCategories : incomeCategories;
                        const exists = cats.some(c => c.id === val);
                        if (!exists && val) {
                          addCustomCategory(newShortcut.type === 'Expense' ? 'expense' : 'income', val);
                        }
                        setNewShortcut(prev => ({ ...prev, category: val }));
                      }}
                      onEdit={(id, name) => {
                        const newName = prompt('New category name:', name);
                        if (newName) updateCustomCategory(newShortcut.type === 'Expense' ? 'expense' : 'income', id, newName);
                      }}
                      onDelete={(id) => {
                        if (confirm('Delete category?')) deleteCustomCategory(newShortcut.type === 'Expense' ? 'expense' : 'income', id);
                      }}
                      placeholder="Select Category"
                    />
                  </div>
                </div>
                 <div>
                  <label className="text-xs text-text-muted uppercase font-black tracking-widest mb-2 block">Primary Wallet</label>
                  <select value={newShortcut.account_id} onChange={e => setNewShortcut({...newShortcut, account_id: e.target.value})}>
                    <option value="" className="font-bold text-primary">✨ Ask When Clicked (Unassigned)</option>

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

      {/* Account Picker Modal for Unassigned Shortcuts */}
      {isAccountPickerOpen && createPortal(
        <div className="fixed inset-0 z-max flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="card w-full max-w-md shadow-2xl bg-card border-white/10">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-bold italic tracking-tight">Select Wallet</h3>
               <button onClick={() => setIsAccountPickerOpen(false)}><X size={24} /></button>
             </div>
             <p className="text-sm text-text-muted mb-6">Select a wallet to log <b>{pendingShortcut?.name}</b></p>
             <div className="grid grid-cols-1 gap-3">
               {accounts.map(acc => (
                 <button 
                   key={acc.id}
                   onClick={() => handlePickAccount(acc.id)}
                   className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-primary hover:text-black transition-all border border-white/5 group"
                 >
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-black/20">
                        <Wallet size={20} />
                      </div>
                      <span className="font-black">{acc.name}</span>
                   </div>
                    <span className="font-bold opacity-60">
                      {preferences.hideBalances ? '••••' : `$${acc.balance}`}
                    </span>

                 </button>
               ))}
             </div>
          </div>
        </div>,
        document.body
      )}

      {/* Log Confirmation Modal for Shortcuts (Fixes INP issue) */}
      {isLogConfirmationOpen && createPortal(
        <div className="fixed inset-0 z-max flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="card w-full max-w-sm shadow-2xl bg-card border-white/10 overflow-visible">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-bold">Log Transaction</h3>
               <button onClick={() => setIsLogConfirmationOpen(false)}><X size={20} /></button>
             </div>
             
             <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                   {pendingShortcut?.type === 'Income' ? <ArrowUpRight size={32} /> : <Zap size={32} />}
                </div>
                <h4 className="text-xl font-black">{pendingShortcut?.name}</h4>
                <p className="text-xs text-text-muted mt-1 italic">
                  To: {accounts.find(a => String(a.id) === String(pendingShortcut?.account_id))?.name || 'Primary Wallet'}
                </p>
             </div>

             <div className="space-y-4 mb-8">
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 block text-center">Amount</label>
                   <input 
                    ref={logAmountRef}
                    type="number" 
                    step="0.01" 
                    className="text-3xl font-black text-center bg-transparent border-none focus:ring-0 text-primary"
                    placeholder="0.00"
                    value={logFormData.amount}
                    onChange={e => setLogFormData({...logFormData, amount: e.target.value})}
                   />
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 block text-center">Date</label>
                   <input 
                    ref={logDateRef}
                    type="date" 
                    className="text-center bg-white/5 border-white/10 rounded-xl"
                    value={logFormData.date}
                    onChange={e => setLogFormData({...logFormData, date: e.target.value})}
                   />
                </div>
             </div>

             <button 
                onClick={executeLogShortcut}
                disabled={loading || !logFormData.amount}
                className="btn btn-primary w-full h-14 font-black uppercase tracking-widest text-black"
             >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Confirm Log'}
             </button>
          </div>
        </div>,
        document.body
      )}

      {/* Charts */}


      {(showMonthlyTrend || showExpenseDistribution) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
          {showMonthlyTrend && (
            <div className={`card bg-card border-white/5 min-h-[450px] flex flex-col ${!showExpenseDistribution ? 'lg:col-span-2' : ''}`}>
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black uppercase tracking-widest text-primary">Monthly Trend</h4>
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                  {['6M', '1Y', 'All'].map(p => (
                    <button 
                      key={p}
                      onClick={() => setTrendPeriod(p)}
                      className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${trendPeriod === p ? 'bg-primary text-black' : 'text-text-muted hover:text-white'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 w-full" style={{ minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" fontSize={11} fontWeight={900} />
                    <YAxis 
                      stroke="#666" 
                      fontSize={11} 
                      fontWeight={900} 
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      contentStyle={{ background: '#181818', border: '1px solid #333' }} 
                      formatter={(value) => [`$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar name="Income" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar name="Expense" dataKey="expense" fill="#ff4d4d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {showExpenseDistribution && (
            <div className={`card bg-card border-white/5 min-h-[450px] flex flex-col ${!showMonthlyTrend ? 'lg:col-span-2' : ''}`}>
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black uppercase tracking-widest text-primary">Expense Distribution</h4>
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                  {['1M', '3M', '6M', 'YTD', 'All'].map(p => (
                    <button 
                      key={p}
                      onClick={() => setChartPeriod(p)}
                      className={`px-2 sm:px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${chartPeriod === p ? 'bg-primary text-black' : 'text-text-muted hover:text-white'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 w-full" style={{ minHeight: '300px' }}>
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
                    <Tooltip 
                      contentStyle={{ background: '#181818', border: '1px solid #333' }} 
                      formatter={(value, name) => [`$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]}
                    />
                    <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Account Linking Modal */}
      {linkingShortcut && (
        <div className="fixed inset-0 z-max flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
          <div className="card w-full max-w-sm border-primary/20 bg-card p-10 text-center shadow-2xl animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <Zap className="text-primary" size={32} />
            </div>
            <h3 className="text-xl font-black mb-2 uppercase">Link Account</h3>
            <p className="text-xs text-text-muted mb-8 uppercase tracking-widest font-bold">Select the account for "{linkingShortcut.name}"</p>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto mb-8 pr-2 custom-scrollbar">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={async () => {
                    const result = await updateFrequentPayment(linkingShortcut.id, { account_id: acc.id });
                    if (result?.error) {
                       console.error('Link failure:', result.error);
                    }
                    setLinkingShortcut(null);
                  }}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-primary hover:text-black transition-all flex items-center gap-4 group"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 group-hover:bg-black/20">
                    <Wallet size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase">{acc.name}</p>
                    <p className="text-[10px] font-bold opacity-60">${Number(acc.balance).toLocaleString()}</p>
                  </div>
                </button>
              ))}
            </div>

            <button 
              onClick={() => setLinkingShortcut(null)}
              className="btn btn-secondary w-full h-14 font-black uppercase tracking-widest text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};



export default Dashboard;
