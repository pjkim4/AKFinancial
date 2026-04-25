import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  BrainCircuit, 
  Sparkles, 
  TrendingDown, 
  TrendingUp, 
  Target, 
  Zap,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';

const AIInsights = () => {
  const { transactions, accounts, t } = useFinance();


  const insights = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
    const savings = totalIncome - totalExpense;
    const savingsRate = (savings / totalIncome) * 100;

    const categories = {};
    transactions.filter(t => t.type === 'Expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    // Strategy Logic
    const strategies = [];
    
    if (categories['Rent'] > totalIncome * 0.4) {
      strategies.push({
        title: 'Rent Optimization',
        description: 'Your rent is currently 60% of your income. The recommended limit is 30%. Consider finding a roommate or a more affordable location.',
        impact: 'High',
        icon: <TrendingDown className="text-danger" />
      });
    }

    if (categories['Shopping'] > 300) {
      strategies.push({
        title: 'Impulse Control',
        description: 'Monthly shopping exceeds $300. Try the "48-hour rule": Wait 48 hours before purchasing non-essential items like clothing or cosmetics.',
        impact: 'Medium',
        icon: <Zap className="text-warning" />
      });
    }

    if (savingsRate < 20) {
      strategies.push({
        title: 'Savings Boost',
        description: 'Your savings rate is ~1.6%. We suggest setting up an automatic transfer of $300 (10%) to your Savings account at the start of the month.',
        impact: 'Critical',
        icon: <Target className="text-primary" />
      });
    } else {
      strategies.push({
        title: 'Investment Opportunity',
        description: 'Great job saving! You have enough surplus to start micro-investing. Consider a low-cost index fund.',
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
      categories
    };
  }, [transactions]);

  return (
    <div className="space-y-8 animate-slide-up">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <BrainCircuit className="text-primary" size={32} />
          <h2 className="text-3xl font-bold">{t('ai_header')}</h2>
        </div>
        <p className="text-text-muted">{t('ai_subtitle')}</p>
      </header>


      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card glass col-span-1 lg:col-span-2">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Sparkles className="text-primary" />
            </div>
            <h3 className="font-bold text-lg">{t('ai_summary_title')}</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
              <span className="text-text-muted">{t('report_liquidity')}</span>
              <span className="font-bold text-success">${insights.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
              <span className="text-text-muted">{t('report_capital')}</span>
              <span className="font-bold text-danger">-${insights.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border-t border-white/10 pt-6">
              <span className="text-white font-bold">{t('report_retention')}</span>
              <span className={`text-xl font-black ${insights.savings >= 0 ? 'text-primary' : 'text-danger'}`}>
                ${insights.savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="card glass flex flex-col items-center justify-center text-center">
          <p className="text-text-muted text-sm mb-2">{t('ai_savings_rate')}</p>
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="58" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
              <circle cx="64" cy="64" r="58" stroke="#3b82f6" strokeWidth="8" fill="transparent" 
                strokeDasharray="364" strokeDashoffset={364 - (364 * (Math.min(100, Math.max(0, insights.savingsRate)) / 100))} />
            </svg>
            <span className="absolute text-2xl font-black">{isNaN(insights.savingsRate) ? 0 : Math.round(insights.savingsRate)}%</span>
          </div>
          <p className="text-xs text-text-muted mt-4">{t('ai_safe_zone')}</p>
        </div>

        <div className="card glass flex flex-col justify-between">
          <h4 className="text-sm font-bold text-text-muted uppercase tracking-widest">{t('ai_top_expense')}</h4>
          <div className="mt-4">
             <h3 className="text-2xl font-bold truncate">
               {Object.entries(insights.categories).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A'}
             </h3>
             <p className="text-danger font-bold text-lg">
               ${(Object.entries(insights.categories).sort((a,b) => b[1] - a[1])[0]?.[1] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
             </p>
          </div>
          <div className="bg-danger/10 text-danger text-[10px] py-1 px-2 rounded-md font-bold mt-4 inline-block w-fit">
            {insights.totalExpense > 0 
              ? `${Math.round(((Object.entries(insights.categories).sort((a,b) => b[1] - a[1])[0]?.[1] || 0) / insights.totalExpense) * 100)}% ${t('ai_budget_label')}` 
              : `0% ${t('ai_budget_label')}`}
          </div>
        </div>
      </div>


      {/* Strategies */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Lightbulb className="text-warning" size={20} />
          {t('ai_recommendations')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.strategies.map((s, i) => (
            <div key={i} className="card glass border-l-4 hover:bg-white/10 transition-all cursor-pointer group" style={{ borderLeftColor: s.impact === 'High' || s.impact === 'Critical' ? '#ef4444' : '#3b82f6' }}>
               <div className="flex gap-4">
                 <div className="mt-1">{s.icon}</div>
                 <div>
                   <div className="flex items-center gap-2 mb-1">
                     <h4 className="font-bold">{s.title}</h4>
                     <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${s.impact === 'High' || s.impact === 'Critical' ? 'bg-danger/20 text-danger' : 'bg-primary/20 text-primary'}`}>
                       {s.impact}
                     </span>
                   </div>
                   <p className="text-sm text-text-muted group-hover:text-white transition-colors">{s.description}</p>
                 </div>
               </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card glass bg-success/5 border-success/20">
         <div className="flex gap-4">
            <CheckCircle2 className="text-success" />
            <div>
              <p className="font-bold text-success">{t('ai_health_title')}</p>
              <p className="text-sm text-text-muted">{t('ai_health_desc')}</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AIInsights;
