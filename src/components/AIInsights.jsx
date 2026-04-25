import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  BrainCircuit, 
  Sparkles, 
  TrendingDown, 
  TrendingUp, 
  Target, 
  Zap,
  Lightbulb,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  ShieldCheck,
  Timer
} from 'lucide-react';

const AIInsights = () => {
  const { transactions, accounts, t } = useFinance();
  const [showDetailed, setShowDetailed] = useState(false);

  const insights = useMemo(() => {
    const totalIncome = transactions.filter(tx => tx.type === 'Income').reduce((s, tx) => s + Number(tx.amount), 0);
    const totalExpense = transactions.filter(tx => tx.type === 'Expense' && tx.category !== 'Transfer').reduce((s, tx) => s + Number(tx.amount), 0);
    const totalBalance = accounts.reduce((s, acc) => s + Number(acc.balance), 0);
    
    const savings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    const categories = {};
    transactions.filter(tx => tx.type === 'Expense' && tx.category !== 'Transfer').forEach(tx => {
      categories[tx.category] = (categories[tx.category] || 0) + Number(tx.amount);
    });

    // Detailed Metrics Logic
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthTransactions = transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const monthExpenses = monthTransactions
      .filter(tx => tx.type === 'Expense' && tx.category !== 'Transfer')
      .reduce((s, tx) => s + Number(tx.amount), 0);

    const daysPassed = now.getDate();
    const dailyVelocity = monthExpenses / daysPassed;
    
    // Runway (Days until $0 at current rate)
    const runwayDays = dailyVelocity > 0 ? Math.round(totalBalance / dailyVelocity) : 999;

    // Health Score (0-100)
    let score = 50; // Neutral start
    if (savingsRate > 20) score += 20;
    if (savingsRate > 40) score += 10;
    if (savingsRate < 0) score -= 30;
    if (runwayDays > 180) score += 20;
    if (runwayDays < 30) score -= 20;
    score = Math.min(100, Math.max(0, score));

    // Strategy Logic
    const strategies = [];
    
    if (categories['Rent'] > totalIncome * 0.4) {
      strategies.push({
        title: t('ai_strat_rent_title'),
        description: t('ai_strat_rent_desc'),
        impact: 'High',
        icon: <TrendingDown className="text-danger" />
      });
    }

    if (categories['Shopping'] > 300) {
      strategies.push({
        title: t('ai_strat_shopping_title'),
        description: t('ai_strat_shopping_desc'),
        impact: 'Medium',
        icon: <Zap className="text-warning" />
      });
    }

    if (savingsRate < 20) {
      strategies.push({
        title: t('ai_strat_savings_title'),
        description: t('ai_strat_savings_desc'),
        impact: 'Critical',
        icon: <Target className="text-primary" />
      });
    } else {
      strategies.push({
        title: t('ai_strat_invest_title'),
        description: t('ai_strat_invest_desc'),
        impact: 'Growth',
        icon: <TrendingUp className="text-success" />
      });
    }

    return {
      totalIncome,
      totalExpense,
      savings,
      savingsRate,
      strategies,
      categories,
      dailyVelocity,
      runwayDays,
      healthScore: score
    };
  }, [transactions, accounts, t]);

  const topCategory = useMemo(() => {
    return Object.entries(insights.categories).sort((a,b) => b[1] - a[1])[0] || ['N/A', 0];
  }, [insights.categories]);

  return (
    <div className="space-y-8 animate-slide-up">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BrainCircuit className="text-primary" size={32} />
            <h2 className="text-3xl font-black tracking-tight italic uppercase">{t('ai_header')}</h2>
          </div>
          <p className="text-text-muted text-sm font-bold uppercase tracking-widest">{t('ai_subtitle')}</p>
        </div>
        <button 
          onClick={() => setShowDetailed(!showDetailed)}
          className={`btn flex items-center gap-2 h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${showDetailed ? 'bg-primary text-black shadow-xl shadow-primary/20' : 'bg-white/5 text-text-muted hover:bg-white/10'}`}
        >
          {showDetailed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showDetailed ? 'Close Detailed Audit' : 'Deep Dive Analysis'}
        </button>
      </header>


      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card glass col-span-1 lg:col-span-2 p-8 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Sparkles size={120} />
          </div>
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Sparkles className="text-primary" size={24} />
            </div>
            <h3 className="font-black text-xl uppercase italic tracking-tight">{t('ai_summary_title')}</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/5">
              <span className="text-[10px] uppercase font-black tracking-widest text-text-muted">{t('report_liquidity')}</span>
              <span className="font-black text-lg text-success">${insights.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/5">
              <span className="text-[10px] uppercase font-black tracking-widest text-text-muted">{t('report_capital')}</span>
              <span className="font-black text-lg text-danger">-${insights.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center bg-white/10 p-6 rounded-2xl border border-white/10 mt-6 shadow-xl">
              <span className="text-white font-black uppercase text-xs tracking-widest">{t('report_retention')}</span>
              <span className={`text-2xl font-black ${insights.savings >= 0 ? 'text-primary' : 'text-danger'}`}>
                ${insights.savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="card glass flex flex-col items-center justify-center text-center p-8 border-white/5">
          <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-6">{t('ai_savings_rate')}</p>
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="72" cy="72" r="66" stroke="rgba(255,255,255,0.03)" strokeWidth="10" fill="transparent" />
              <circle cx="72" cy="72" r="66" stroke={insights.savingsRate >= 20 ? "#10b981" : "#ef4444"} strokeWidth="10" fill="transparent" 
                strokeDasharray="414.69" strokeDashoffset={414.69 - (414.69 * (Math.min(100, Math.max(0, insights.savingsRate)) / 100))} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            </svg>
            <span className="absolute text-3xl font-black italic">{isNaN(insights.savingsRate) ? 0 : Math.round(insights.savingsRate)}%</span>
          </div>
          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-6 opacity-60">{t('ai_safe_zone')}</p>
        </div>

        <div className="card glass flex flex-col justify-between p-8 border-white/5">
          <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4">{t('ai_top_expense')}</h4>
          <div className="space-y-2">
             <h3 className="text-2xl font-black tracking-tighter truncate italic uppercase">
               {topCategory[0]}
             </h3>
             <p className="text-danger font-black text-xl">
               ${topCategory[1].toLocaleString(undefined, { minimumFractionDigits: 2 })}
             </p>
          </div>
          <div className="bg-danger/10 text-danger text-[9px] py-2 px-4 rounded-xl font-black uppercase tracking-widest mt-8 inline-block w-fit border border-danger/20">
            {insights.totalExpense > 0 
              ? `${Math.round((topCategory[1] / insights.totalExpense) * 100)}% ${t('ai_budget_label')}` 
              : `0% ${t('ai_budget_label')}`}
          </div>
        </div>
      </div>

      {showDetailed && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-scale-in">
          <div className="card glass p-8 border-primary/20 bg-primary/5">
             <div className="flex items-center gap-3 mb-6">
                <Timer className="text-primary" size={20} />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Financial Runway</h4>
             </div>
             <p className="text-4xl font-black italic">{insights.runwayDays}</p>
             <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mt-2">Days of survival at current burn</p>
          </div>

          <div className="card glass p-8 border-warning/20 bg-warning/5">
             <div className="flex items-center gap-3 mb-6">
                <Activity className="text-warning" size={20} />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-warning">Daily Velocity</h4>
             </div>
             <p className="text-4xl font-black italic">${insights.dailyVelocity.toFixed(2)}</p>
             <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mt-2">Avg spend per day this month</p>
          </div>

          <div className="card glass p-8 border-success/20 bg-success/5">
             <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="text-success" size={20} />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-success">Health Score</h4>
             </div>
             <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black italic">{insights.healthScore}</p>
                <p className="text-lg font-black text-text-muted">/100</p>
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mt-2">Overall financial stability index</p>
          </div>
        </div>
      )}


      {/* Strategies */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
            <Lightbulb className="text-warning" size={24} />
            {t('ai_recommendations')}
          </h3>
          <div className="h-px flex-1 bg-white/5 ml-6"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {insights.strategies.map((s, i) => (
            <div key={i} className="card glass border-l-4 hover:bg-white/10 transition-all cursor-pointer group p-8 border-white/5" style={{ borderLeftColor: s.impact === 'High' || s.impact === 'Critical' ? '#ef4444' : '#3b82f6' }}>
               <div className="flex gap-6">
                 <div className="mt-1 transform group-hover:scale-110 transition-transform">{s.icon}</div>
                 <div>
                   <div className="flex items-center gap-3 mb-2">
                     <h4 className="font-black text-lg uppercase tracking-tight">{s.title}</h4>
                     <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border ${s.impact === 'High' || s.impact === 'Critical' ? 'bg-danger/10 text-danger border-danger/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                       {s.impact}
                     </span>
                   </div>
                   <p className="text-sm text-text-muted group-hover:text-white transition-colors leading-relaxed">{s.description}</p>
                 </div>
               </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card glass bg-success/5 border-success/20 p-8">
         <div className="flex gap-6 items-center">
            <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
               <CheckCircle2 className="text-success" size={28} />
            </div>
            <div>
              <p className="font-black text-lg uppercase tracking-tight text-success">{t('ai_health_title')}</p>
              <p className="text-sm text-text-muted font-medium">{t('ai_health_desc')}</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AIInsights;
