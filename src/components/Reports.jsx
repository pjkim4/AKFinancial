import React, { useMemo } from 'react';
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
  Sparkles
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
  const { transactions, accounts, availableHouseholds, currentHouseholdId, t } = useFinance();


  const currentWorkspaceName = useMemo(() => {
    return availableHouseholds.find(h => h.id === currentHouseholdId)?.name || t('dash_personal_account');
  }, [availableHouseholds, currentHouseholdId]);


  const reportData = useMemo(() => {
    const incomes = transactions.filter(t => t.type === 'Income');
    const expenses = transactions.filter(t => t.type === 'Expense');
    
    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    
    const catData = {};
    expenses.forEach(t => {
      catData[t.category] = (catData[t.category] || 0) + t.amount;
    });

    const pieData = Object.keys(catData).map(name => ({
      name,
      value: catData[name]
    })).sort((a, b) => b.value - a.value);

    // Monthly data (last 6 months)
    const months = {};
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mLabel = d.toLocaleString('default', { month: 'short' });
      months[mLabel] = { name: mLabel, income: 0, expense: 0 };
      last6Months.push(mLabel);
    }

    transactions.forEach(t => {
      const tMonth = new Date(t.date).toLocaleString('default', { month: 'short' });
      if (months[tMonth]) {
        if (t.type === 'Income') months[tMonth].income += t.amount;
        if (t.type === 'Expense') months[tMonth].expense += t.amount;
      }
    });

    return {
      totalIncome,
      totalExpense,
      pieData,
      barData: last6Months.map(m => months[m])
    };
  }, [transactions]);

  const COLORS = ['#c1ff72', '#ffffff', '#3d3d3d', '#1a1a1a', '#4ade80', '#fbbf24', '#f87171'];

  const printReport = () => {
    window.print();
  };

  const exportFullLedger = () => {
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Wallet'];
    const rows = transactions.map(t => [
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
    link.setAttribute("download", `Full_Ledger_${currentWorkspaceName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-slide-up pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="text-primary" size={32} />
            <h2 className="text-3xl font-black tracking-tight uppercase italic">Financial Intel</h2>
          </div>
          <p className="text-text-muted font-bold uppercase text-[10px] tracking-[0.2em]">
            Deep analysis for <span className="text-primary">{currentWorkspaceName}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={printReport} className="btn bg-white/5 border-white/10 h-12 px-6 hover:bg-white/10">
            <Printer size={18} />
            <span className="font-black text-[10px] uppercase tracking-widest">{t('report_print')}</span>
          </button>
          <button onClick={exportFullLedger} className="btn btn-primary h-12 px-6 text-black">
            <Download size={18} />
            <span className="font-black text-[10px] uppercase tracking-widest">{t('report_master')}</span>
          </button>
        </div>

      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
        <div className="card bg-success/10 border-success/20 p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-success mb-4">{t('report_liquidity')}</p>
          <p className="text-4xl font-black tracking-tighter">${reportData.totalIncome.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-4 text-success/60">
            <ArrowUpRight size={14} />
            <span className="text-[10px] font-bold uppercase">Cloud Synced</span>
          </div>
        </div>
        <div className="card bg-danger/10 border-danger/20 p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-danger mb-4">{t('report_capital')}</p>
          <p className="text-4xl font-black tracking-tighter">${reportData.totalExpense.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-4 text-danger/60">
            <ArrowDownRight size={14} />
            <span className="text-[10px] font-bold uppercase">Verified Outflow</span>
          </div>
        </div>
        <div className="card bg-primary/10 border-primary/20 p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">{t('report_retention')}</p>
          <p className="text-4xl font-black tracking-tighter">${(reportData.totalIncome - reportData.totalExpense).toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-4 text-primary/60">
            <Target size={14} />
            <span className="text-[10px] font-bold uppercase">Saving Capacity</span>
          </div>
        </div>
      </div>


      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card bg-white/5 border-white/10 p-8 print:border-black/10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <PieChart className="text-primary" size={18} />
              {t('report_distribution')}
            </h3>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={reportData.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {reportData.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            {reportData.pieData.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-black/20 p-3 rounded-xl">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <div className="flex-1">
                  <p className="text-[8px] text-text-muted uppercase font-black tracking-tighter">{item.name}</p>
                  <p className="text-xs font-bold">${item.value.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card bg-white/5 border-white/10 p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <TableIcon className="text-primary" size={18} />
              {t('report_momentum')}
            </h3>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Bar dataKey="income" fill="#c1ff72" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Strategy Export Section */}
      <div className="card bg-primary/5 border-primary/10 p-10 relative overflow-hidden group">
        <BrainCircuit className="absolute -right-10 -bottom-10 text-primary opacity-5 w-64 h-64 group-hover:scale-110 transition-all duration-700" />
        <div className="relative z-10">
          <h3 className="text-xl font-black uppercase italic tracking-tight mb-4 flex items-center gap-3">
            <Sparkles className="text-primary" />
            AI Strategy Report
          </h3>
          <p className="text-sm text-text-muted mb-8 max-w-xl leading-relaxed">
            Generate a full audit of your financial habits, including category overspending alerts, savings rate optimization, and custom investment pathing.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="btn btn-primary h-14 px-10 text-black font-black uppercase tracking-widest shadow-xl shadow-primary/20">
              Generate PDF Audit
            </button>
            <button className="btn bg-white/5 border-white/10 h-14 px-8 text-text-muted hover:text-white uppercase font-black text-[10px] tracking-widest">
              Email to Accountant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
