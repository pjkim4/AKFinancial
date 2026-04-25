import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  CalendarClock, 
  Plus, 
  Trash2, 
  X, 
  ChevronRight, 
  AlertCircle,
  Calendar,
  FastForward,
  CheckCircle2,
  Clock,
  Pencil
} from 'lucide-react';
import SearchableSelect from './ui/SearchableSelect';


const RecurringManager = () => {
  const { 
    accounts, 
    recurringSchedules, 
    addRecurringSchedule, 
    updateRecurringSchedule,
    deleteRecurringSchedule, 
    skipNextOccurrence,
    calculateNextPaymentDate,
    preferences,
    addCustomCategory,
    updateCustomCategory,
    deleteCustomCategory,
    t
  } = useFinance();



  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newSchedule, setNewSchedule] = useState({
    amount: '',
    type: 'Expense',
    description: '',
    account_id: accounts[0]?.id || '',
    category: 'Subscription',
    frequency: 'Monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });

  const frequencies = [
    'Weekly', 'Bi-weekly', 'Semi-Monthly', 'Monthly', 'Monthly (End of Month)',
    'Quarterly', 'Semi-Yearly', 'Yearly'
  ];

  const expenseCategories = [
    { id: 'Food', name: t('cat_food') },
    { id: 'Rent', name: t('cat_rent') },
    { id: 'Transport', name: t('cat_transport') },
    { id: 'Entertainment', name: t('cat_entertainment') },
    { id: 'Utilities', name: t('cat_utilities') },
    { id: 'Shopping', name: t('cat_shopping') },
    { id: 'Health', name: t('cat_health') },
    { id: 'Subscription', name: 'Subscription' },
    { id: 'Insurance', name: 'Insurance' },
    { id: 'Other', name: t('cat_other') },
    ...(preferences.customCategories?.expense || []).map(c => ({ ...c, isCustom: true }))
  ];

  const incomeCategories = [
    { id: 'Salary', name: t('cat_salary') || 'Salary' },
    { id: 'Investment', name: t('cat_investment') || 'Investment' },
    { id: 'Gift', name: t('cat_gift') || 'Gift' },
    { id: 'Savings', name: 'Savings' },
    { id: 'Other', name: t('cat_other') },
    ...(preferences.customCategories?.income || []).map(c => ({ ...c, isCustom: true }))
  ];


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Sanitize data
    const cleanedSchedule = {
      ...newSchedule,
      end_date: newSchedule.end_date === '' ? null : newSchedule.end_date
    };

    const result = editingId 
      ? await updateRecurringSchedule(editingId, cleanedSchedule)
      : await addRecurringSchedule(cleanedSchedule);

    setLoading(false);
    if (!result.error) {
      setIsModalOpen(false);
      setEditingId(null);
      setNewSchedule({
        amount: '',
        type: 'Expense',
        description: '',
        account_id: accounts[0]?.id || '',
        category: 'Subscription',
        frequency: 'Monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
      });
    } else {
      setError(result.error.message || `Failed to ${editingId ? 'update' : 'create'} schedule.`);
    }
  };

  const handleEditClick = (schedule) => {
    setEditingId(schedule.id);
    setNewSchedule({
      amount: schedule.amount,
      type: schedule.type,
      description: schedule.description,
      account_id: schedule.account_id,
      category: schedule.category,
      frequency: schedule.frequency,
      start_date: schedule.start_date,
      end_date: schedule.end_date || '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'text-success';
      case 'Completed': return 'text-text-muted opacity-50';
      case 'Paused': return 'text-warning';
      default: return 'text-text';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">{t('nav_auto')}</h2>
          <p className="text-text-muted text-sm mt-1">{t('schedule_subtitle') || 'Manage your automated schedules'}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary flex items-center gap-2 px-6 h-12"
        >
          <Plus size={20} />
          {t('schedule_create')}
        </button>
      </header>


      <div className="grid grid-cols-1 gap-4">
        {recurringSchedules.length === 0 ? (
          <div className="card glass p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <CalendarClock size={32} className="text-text-muted" />
            </div>
            <h3 className="text-xl font-bold">No schedules found</h3>
            <p className="text-text-muted mt-2 max-w-sm">
              Create your first recurring payment to automate your bookkeeping.
            </p>
          </div>
        ) : (
          recurringSchedules.map((schedule) => (
            <div key={schedule.id} className={`card glass group transition-all hover:bg-white/5 ${schedule.status === 'Completed' ? 'opacity-60' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${schedule.type === 'Income' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                    {schedule.type === 'Income' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-lg">{schedule.description}</h4>
                      <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-white/5 ${getStatusColor(schedule.status)}`}>
                        {schedule.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                        <Calendar size={14} />
                        Starts {schedule.start_date}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
                        <ChevronRight size={14} />
                        {schedule.frequency}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium uppercase tracking-tighter">
                        Category: {schedule.category}
                      </div>
                      {schedule.status === 'Active' && (
                        <div className="flex items-center gap-1.5 text-xs text-primary font-black uppercase tracking-widest pl-2 border-l border-white/20 bg-primary/5 px-2 py-0.5 rounded-md">
                          <Clock size={12} strokeWidth={3} />
                          Next: {calculateNextPaymentDate(schedule)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-x-8">
                  <div className="text-right">
                    <p className="text-2xl font-black text-white">
                      {schedule.type === 'Income' ? '+' : '-'}{preferences.hideBalances ? '••••' : `$${Number(schedule.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </p>

                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
                      Last Run: {schedule.last_run_date || 'Never'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 relative z-10">
                    <button 
                      onClick={() => handleEditClick(schedule)}
                      className="p-3 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-all text-text-muted"
                      title="Edit schedule"
                    >
                      <Pencil size={20} />
                    </button>
                    {schedule.status === 'Active' && (
                      <button 
                        onClick={() => skipNextOccurrence(schedule)}
                        className="p-3 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-all text-text-muted"
                        title="Skip next occurrence"
                      >
                        <FastForward size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteRecurringSchedule(schedule.id)}
                      className="p-3 rounded-xl bg-white/5 hover:bg-danger/20 hover:text-danger transition-all text-text-muted"
                      title="Delete schedule"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {schedule.end_date && (
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-[11px] text-text-muted opacity-75 italic">
                  <AlertCircle size={12} />
                  Schedule expires on {schedule.end_date}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Schedule Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-max flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="card glass w-full max-w-xl relative divide-y divide-white/5 animate-slide-up">
            <div className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{editingId ? 'Edit Schedule' : 'New Recurring Payment'}</h3>
                <p className="text-text-muted text-xs mt-1">
                  {editingId ? 'Modify your existing automated schedule' : 'Set up an automated transaction schedule'}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-danger/10 border border-danger/30 p-4 rounded-xl flex items-center gap-3 text-danger text-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-text-muted">Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewSchedule({...newSchedule, type: 'Expense'})}
                      className={`flex-1 h-12 rounded-xl border transition-all font-bold ${newSchedule.type === 'Expense' ? 'bg-danger/20 border-danger/50 text-danger' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewSchedule({...newSchedule, type: 'Income'})}
                      className={`flex-1 h-12 rounded-xl border transition-all font-bold ${newSchedule.type === 'Income' ? 'bg-success/20 border-success/50 text-success' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                    >
                      Income
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-text-muted">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                    value={newSchedule.amount}
                    onChange={(e) => setNewSchedule({...newSchedule, amount: e.target.value})}
                    className="w-full h-12 text-lg font-black"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-text-muted">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Netflix Monthly, Office Rent..."
                  required
                  value={newSchedule.description}
                  onChange={(e) => setNewSchedule({...newSchedule, description: e.target.value})}
                  className="w-full h-12"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-text-muted">Frequency</label>
                  <select
                    className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary transition-all text-white appearance-none cursor-pointer"
                    value={newSchedule.frequency}
                    onChange={(e) => setNewSchedule({...newSchedule, frequency: e.target.value})}
                  >
                    {frequencies.map(f => <option key={f} value={f} className="bg-[#181818]">{f}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-text-muted">Category</label>
                  <SearchableSelect 
                    options={newSchedule.type === 'Expense' ? expenseCategories : incomeCategories}
                    value={newSchedule.category}
                    onChange={(val) => {
                      const cats = newSchedule.type === 'Expense' ? expenseCategories : incomeCategories;
                      const exists = cats.some(c => c.id === val);
                      if (!exists && val) {
                        addCustomCategory(newSchedule.type === 'Expense' ? 'expense' : 'income', val);
                      }
                      setNewSchedule(prev => ({ ...prev, category: val }));
                    }}
                    onEdit={(id, name) => {
                      const newName = prompt('New category name:', name);
                      if (newName) updateCustomCategory(newSchedule.type === 'Expense' ? 'expense' : 'income', id, newName);
                    }}
                    onDelete={(id) => {
                      if (confirm('Delete category?')) deleteCustomCategory(newSchedule.type === 'Expense' ? 'expense' : 'income', id);
                    }}

                    placeholder="Select Category"
                  />
                </div>

              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-text-muted">Wallet / Account</label>
                <select
                  className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary transition-all text-white appearance-none cursor-pointer"
                  value={newSchedule.account_id}
                  onChange={(e) => setNewSchedule({...newSchedule, account_id: e.target.value})}
                  required
                >
                  {accounts.map(acc => <option key={acc.id} value={acc.id} className="bg-[#181818]">{acc.name} (${acc.balance})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-text-muted">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newSchedule.start_date}
                    onChange={(e) => setNewSchedule({...newSchedule, start_date: e.target.value})}
                    className="w-full h-12"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-text-muted">End Date (Optional)</label>
                  <input
                    type="date"
                    value={newSchedule.end_date}
                    onChange={(e) => setNewSchedule({...newSchedule, end_date: e.target.value})}
                    className="w-full h-12"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn btn-primary w-full h-14 uppercase font-black text-black mt-4 flex items-center justify-center gap-2"
              >
                {loading ? (editingId ? 'Updating...' : 'Creating...') : (
                  <>
                    {editingId ? <Pencil size={20} /> : <CalendarClock size={20} />}
                    {editingId ? 'Update Schedule' : 'Create Schedule'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default RecurringManager;
