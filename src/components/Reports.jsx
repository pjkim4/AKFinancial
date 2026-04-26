import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  FileText, 
  Download, 
  Printer, 
  PieChart, 
  Table as TableIcon, 
  BrainCircuit, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronRight,
  Target,
  Sparkles,
  Calendar,
  RefreshCw,
  Eye,
  EyeOff,
  Filter
} from 'lucide-react';

import { 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

const Reports = () => {
  const { transactions, accounts, availableHouseholds, currentHouseholdId, t, preferences, toggleBalances } = useFinance();

  // Filter States
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [filterAccount, setFilterAccount] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);

  const currentWorkspaceName = useMemo(() => {
    return availableHouseholds.find(h => h.id === currentHouseholdId)?.name || t('dash_personal_account');
  }, [availableHouseholds, currentHouseholdId]);

  const selectedAccountName = useMemo(() => {
    if (filterAccount === 'all') return 'Total Portfolio';
    return accounts.find(a => a.id === filterAccount)?.name || 'Unknown Account';
  }, [filterAccount, accounts]);


  const reportData = useMemo(() => {
    // Filter transactions by date range AND account
    const filteredTxs = transactions.filter(tx => {
      const matchesDate = tx.date >= startDate && tx.date <= endDate;
      const matchesAccount = filterAccount === 'all' || tx.account_id === filterAccount;
      return matchesDate && matchesAccount;
    });

    const incomes = filteredTxs.filter(t => t.type === 'Income');
    const expenses = filteredTxs.filter(t => t.type === 'Expense');
    
    const totalIncome = incomes.reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = expenses.reduce((s, t) => s + Number(t.amount), 0);
    
    const catData = {};
    expenses.forEach(t => {
      catData[t.category] = (catData[t.category] || 0) + Number(t.amount);
    });

    const pieData = Object.keys(catData).map(name => ({
      name,
      value: catData[name]
    })).sort((a, b) => b.value - a.value);

    // Monthly data logic adjusted for range
    const months = {};
    const monthLabels = [];
    const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Normalize current to start of month
    let current = new Date(start.getFullYear(), start.getMonth(), 1);

    while (current <= end) {
      const mIdx = current.getMonth();
      const mLabel = monthsNames[mIdx];
      const year = current.getFullYear();
      const uniqueLabel = `${mLabel} ${year}`;
      
      months[uniqueLabel] = { 
        name: mLabel, 
        year, 
        income: 0, 
        expense: 0 
      };
      monthLabels.push(uniqueLabel);
      current.setMonth(current.getMonth() + 1);
    }

    filteredTxs.forEach(t => {
      // Use split to avoid timezone shifts
      const [y, m] = t.date.split('-').map(Number);
      const mLabel = monthsNames[m - 1];
      const uniqueLabel = `${mLabel} ${y}`;
      
      if (months[uniqueLabel]) {
        if (t.type === 'Income') months[uniqueLabel].income += Number(t.amount);
        if (t.type === 'Expense') months[uniqueLabel].expense += Number(t.amount);
      }
    });

    return {
      totalIncome,
      totalExpense,
      pieData,
      barData: monthLabels.map(m => months[m])
    };
  }, [transactions, startDate, endDate, filterAccount]);

  const aiStrategy = useMemo(() => {
    const { totalIncome, totalExpense, pieData } = reportData;
    const retention = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (retention / totalIncome) * 100 : 0;
    
    // Identify budget leaks (any category > 20% of expenses)
    const leaks = pieData.filter(c => totalExpense > 0 && (c.value / totalExpense) > 0.20);
    
    // Growth Forecast (simple 12-month projection)
    const annualProjection = retention * 12;

    let assessment = "Your capital retention is stable. Focus on diversifying your asset allocation.";
    if (savingsRate > 30) assessment = "Elite performance. Your savings velocity is optimized for rapid wealth expansion.";
    else if (savingsRate < 10) assessment = "Critical attention required. Operational expenses are encroaching on capital growth potential.";

    return {
      savingsRate: savingsRate.toFixed(1),
      leaks,
      annualProjection,
      assessment,
      healthScore: Math.min(100, Math.max(0, Math.round(savingsRate * 2 + 20)))
    };
  }, [reportData]);

  const COLORS = ['#c1ff72', '#ffffff', '#3d3d3d', '#1a1a1a', '#4ade80', '#fbbf24', '#f87171'];

  const printReport = () => {
    window.print();
  };

  const handleGenerateStrategy = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      window.print();
    }, 1500);
  };

  const exportFullLedger = () => {
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Wallet'];
    const filteredTxs = transactions.filter(tx => {
      const matchesDate = tx.date >= startDate && tx.date <= endDate;
      const matchesAccount = filterAccount === 'all' || tx.account_id === filterAccount;
      return matchesDate && matchesAccount;
    });
    
    const rows = filteredTxs.map(t => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.category,
      t.type,
      t.amount,
      accounts.find(a => a.id === t.account_id)?.name || 'Unknown'
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Ledger_${selectedAccountName.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetDates = () => {
    setStartDate(firstDayOfMonth);
    setEndDate(today);
    setFilterAccount('all');
  };

  return (
    <div className="space-y-8 animate-slide-up pb-20">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 no-print">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="text-primary" size={32} />
            <h2 className="text-3xl font-black tracking-tight uppercase italic">{t('nav_intel')}</h2>
          </div>
          <div className="flex items-center gap-4 no-print">
            <p className="text-text-muted font-bold uppercase text-[10px] tracking-[0.2em]">
              {t('report_analysis_for')} <span className="text-primary">{currentWorkspaceName}</span>
            </p>
            <button 
              onClick={toggleBalances}
              className={`p-2 rounded-lg transition-all ${preferences.hideBalances ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-white bg-white/5'}`}
              title={preferences.hideBalances ? "Show Balances" : "Hide Balances"}
            >
              {preferences.hideBalances ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>

        {/* Date Range Picker */}
        <div className="flex flex-wrap items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 no-print">
           <div className="flex items-center gap-3">
              <Calendar size={16} className="text-primary" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase text-text-muted tracking-widest mb-1">From</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none p-0 text-xs font-black uppercase text-white focus:ring-0 cursor-pointer"
                />
              </div>
           </div>
           <div className="w-px h-8 bg-white/10 mx-2"></div>
           <div className="flex items-center gap-3">
              <Calendar size={16} className="text-primary" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase text-text-muted tracking-widest mb-1">To</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none p-0 text-xs font-black uppercase text-white focus:ring-0 cursor-pointer"
                />
              </div>
           </div>
           <button 
            onClick={resetDates}
            className="p-3 hover:bg-white/10 rounded-xl transition-all text-text-muted hover:text-white"
            title="Reset Filters"
           >
             <RefreshCw size={14} />
           </button>
        </div>

        <div className="flex gap-2 no-print">
          <button onClick={printReport} className="btn bg-white/5 border-white/10 h-14 px-6 hover:bg-white/10">
            <Printer size={18} />
            <span className="font-black text-[10px] uppercase tracking-widest">{t('report_print')}</span>
          </button>
          <button onClick={exportFullLedger} className="btn btn-primary h-14 px-8 text-black shadow-xl shadow-primary/20">
            <Download size={18} />
            <span className="font-black text-[10px] uppercase tracking-widest">{t('report_master')}</span>
          </button>
        </div>
      </header>

      {/* Account Switcher Row */}
      <div className="animate-slide-up no-print" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 w-fit max-w-full group hover:border-primary/30 transition-all">
          <div className="flex items-center gap-2 pl-3 pr-2 border-r border-white/10">
            <Filter size={16} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted hidden sm:block">Filter By Account</span>
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

      {/* Print-only Header */}
      <div className="hidden print:block mb-10 border-b-2 border-black pb-8">
        <h1 className="text-4xl font-black uppercase italic mb-2">Financial Intel Report</h1>
        <div className="flex justify-between items-start text-sm font-bold uppercase tracking-widest">
           <div className="space-y-1">
             <p className="text-primary">{currentWorkspaceName}</p>
             <p className="text-xs text-black/60">{selectedAccountName}</p>
           </div>
           <p className="text-primary pt-1">{startDate} — {endDate}</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
        <div className="card bg-success/10 border-success/20 p-8 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-success mb-4">{t('report_liquidity')}</p>
          <p className="text-4xl font-black tracking-tighter">
            {preferences.hideBalances ? '••••' : `$${reportData.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <div className="flex items-center gap-2 mt-4 text-success/60">
            <ArrowUpRight size={14} />
            <span className="text-[10px] font-bold uppercase">{t('report_synced')}</span>
          </div>
        </div>
        <div className="card bg-danger/10 border-danger/20 p-8 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-danger mb-4">{t('report_capital')}</p>
          <p className="text-4xl font-black tracking-tighter">
            {preferences.hideBalances ? '••••' : `$${reportData.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <div className="flex items-center gap-2 mt-4 text-danger/60">
            <ArrowDownRight size={14} />
            <span className="text-[10px] font-bold uppercase">{t('report_verified')}</span>
          </div>
        </div>
        <div className="card bg-primary/10 border-primary/20 p-8 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">{t('report_retention')}</p>
          <p className="text-4xl font-black tracking-tighter">
            {preferences.hideBalances ? '••••' : `$${(reportData.totalIncome - reportData.totalExpense).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <div className="flex items-center gap-2 mt-4 text-primary/60">
            <Target size={14} />
            <span className="text-[10px] font-bold uppercase">Saving Capacity</span>
          </div>
        </div>
      </div>


      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card bg-white/5 border-white/10 p-8 print:border-black/10 print:shadow-none">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <PieChart className="text-primary" size={18} />
              {t('report_distribution')}
            </h3>
          </div>

          <div className="flex justify-center items-center" style={{ minHeight: '300px', width: '100%' }}>
            {reportData.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={reportData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {reportData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                    formatter={(value) => [preferences.hideBalances ? '••••' : `$${Number(value).toLocaleString()}`, 'Amount']}
                  />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text-muted text-xs uppercase font-black opacity-30">No Data for Selection</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            {reportData.pieData.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-black/20 p-3 rounded-xl">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <div className="flex-1">
                  <p className="text-[8px] text-text-muted uppercase font-black tracking-tighter">{item.name}</p>
                  <p className="text-xs font-bold">{preferences.hideBalances ? '••••' : `$${item.value.toLocaleString()}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card bg-white/5 border-white/10 p-8 print:border-black/10 print:shadow-none">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <TableIcon className="text-primary" size={18} />
              {t('report_momentum')}
            </h3>
          </div>

          <div className="flex justify-center items-center" style={{ minHeight: '300px', width: '100%' }}>
            {reportData.barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    formatter={(value) => [preferences.hideBalances ? '••••' : `$${Number(value).toLocaleString()}`, '']}
                  />
                  <Bar dataKey="income" fill="#c1ff72" radius={[4, 4, 0, 0]} name={t('income')} isAnimationActive={false} />
                  <Bar dataKey="expense" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} name={t('expense')} isAnimationActive={false} />

                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text-muted text-xs uppercase font-black opacity-30">No Sequential Data</p>
            )}
          </div>
        </div>
      </div>

      {/* Strategy Report (Print Only) */}
      <div className="hidden print:block page-break-before mt-20">
         <div className="border-b-4 border-primary pb-6 mb-10">
            <h2 className="text-5xl font-black uppercase italic tracking-tighter">AI Strategic Assessment</h2>
            <p className="text-sm font-bold uppercase tracking-[0.3em] mt-2 opacity-60">Prepared for {currentWorkspaceName}</p>
         </div>

         <div className="grid grid-cols-2 gap-10 mb-16">
            <div className="space-y-6">
               <h4 className="text-xs font-black uppercase tracking-widest text-primary">Financial Health Score</h4>
               <div className="flex items-baseline gap-4">
                  <span className="text-8xl font-black tracking-tighter">{aiStrategy.healthScore}</span>
                  <span className="text-2xl font-bold uppercase opacity-40">/ 100</span>
               </div>
               <p className="text-sm leading-relaxed font-medium italic opacity-80 border-l-4 border-primary/20 pl-6 py-2">
                 "{aiStrategy.assessment}"
               </p>
            </div>
            <div className="bg-black/5 p-8 rounded-3xl border border-black/10">
               <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 opacity-40">Capital Retention Index</h4>
               <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-black uppercase text-text-muted mb-2">Savings Velocity</p>
                    <p className="text-3xl font-black">{aiStrategy.savingsRate}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-text-muted mb-2">12-Month Expansion Forecast</p>
                    <p className="text-3xl font-black text-primary">${aiStrategy.annualProjection.toLocaleString()}</p>
                  </div>
               </div>
            </div>
         </div>

         <div className="space-y-10">
            <div>
               <h4 className="text-sm font-black uppercase tracking-widest mb-6 border-b border-black/10 pb-4">Budget Efficiency Audit</h4>
               <div className="grid grid-cols-1 gap-4">
                  {aiStrategy.leaks.length > 0 ? aiStrategy.leaks.map((leak, i) => (
                    <div key={i} className="flex items-center justify-between p-6 bg-black/5 rounded-2xl">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center">
                             <ArrowDownRight className="text-danger" size={20} />
                          </div>
                          <div>
                             <p className="font-black uppercase text-sm tracking-tight">{leak.name}</p>
                             <p className="text-[10px] font-bold uppercase opacity-40">Exceeds recommended 20% threshold</p>
                          </div>
                       </div>
                       <p className="text-xl font-black">${leak.value.toLocaleString()}</p>
                    </div>
                  )) : (
                    <p className="text-sm font-medium italic opacity-60 text-center py-10 bg-black/5 rounded-3xl">No major operational inefficiencies detected in current period.</p>
                  )}
               </div>
            </div>

            <div className="pt-10">
               <h4 className="text-sm font-black uppercase tracking-widest mb-6 border-b border-black/10 pb-4">Strategic Directives</h4>
               <ul className="space-y-4">
                  <li className="flex gap-4">
                     <span className="text-primary font-black">01</span>
                     <p className="text-sm font-medium">Reallocate surplus from {aiStrategy.leaks[0]?.name || 'low-yield accounts'} into tax-advantaged growth vehicles.</p>
                  </li>
                  <li className="flex gap-4">
                     <span className="text-primary font-black">02</span>
                     <p className="text-sm font-medium">Implement a 10% operational cost reduction target for the next fiscal quarter to boost savings velocity.</p>
                  </li>
                  <li className="flex gap-4">
                     <span className="text-primary font-black">03</span>
                     <p className="text-sm font-medium">Schedule a capital allocation review for Year-End expansion based on current ${aiStrategy.annualProjection.toLocaleString()} growth trajectory.</p>
                  </li>
               </ul>
            </div>
         </div>
      </div>

      {/* AI Strategy Export Section */}
      <div className="card bg-primary/5 border-primary/10 p-10 relative overflow-hidden group no-print">
        <BrainCircuit className="absolute -right-10 -bottom-10 text-primary opacity-5 w-64 h-64 group-hover:scale-110 transition-all duration-700" />
        <div className="relative z-10">
          <h3 className="text-xl font-black uppercase italic tracking-tight mb-4 flex items-center gap-3">
            <Sparkles className={`text-primary ${isGenerating ? 'animate-spin' : ''}`} />
            {t('report_ai_strat')}
          </h3>
          <p className="text-sm text-text-muted mb-8 max-w-xl leading-relaxed">
            {t('report_ai_desc')}
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={handleGenerateStrategy}
              disabled={isGenerating}
              className="btn btn-primary h-14 px-10 text-black font-black uppercase tracking-widest shadow-xl shadow-primary/20 relative disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={18} className="animate-spin mr-3" />
                  Analyzing Data...
                </>
              ) : t('report_gen_pdf')}
            </button>
            <button className="btn bg-white/5 border-white/10 h-14 px-8 text-text-muted hover:text-white uppercase font-black text-[10px] tracking-widest">
              {t('report_email_acc')}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Reports;
