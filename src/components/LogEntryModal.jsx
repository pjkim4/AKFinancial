import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import SearchableSelect from './ui/SearchableSelect';

const LogEntryModal = ({ isOpen, onClose }) => {
  const { 
    accounts,
    addTransaction,
    transferFunds,
    householdMembers,
    t
  } = useFinance();


  const [modalType, setModalType] = useState('expense'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    account_id: accounts[0]?.id || '',
    to_account_id: accounts[1]?.id || '',
    category: '',
    customCategory: '',
    date: getToday(),
    member_id: ''
  });

  useEffect(() => {
    if (accounts.length > 0 && !formData.account_id) {
      setFormData(prev => ({ ...prev, account_id: accounts[0].id }));
    }
  }, [accounts]);

  const categories = {
    income: [
      { id: 'Salary', name: t('cat_salary') },
      { id: 'Bonus', name: t('cat_bonus') },
      { id: 'Investment', name: t('cat_investment') },
      { id: 'Gift', name: t('cat_gift') },
      { id: 'Other', name: t('cat_other') }
    ],

    expense: [
      { id: 'Food', name: t('cat_food') },
      { id: 'Rent', name: t('cat_rent') },
      { id: 'Transport', name: t('cat_transport') },
      { id: 'Entertainment', name: t('cat_entertainment') },
      { id: 'Utilities', name: t('cat_utilities') },
      { id: 'Shopping', name: t('cat_shopping') },
      { id: 'Health', name: t('cat_health') },
      { id: 'Other', name: t('cat_other') }
    ],

    transfer: []
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const finalCategory = formData.category === 'Other' ? formData.customCategory : formData.category;
    
    let result;
    if (modalType === 'transfer') {
      result = await transferFunds(formData.account_id, formData.to_account_id, formData.amount);
    } else {
      result = await addTransaction({
        amount: parseFloat(formData.amount),
        type: modalType.charAt(0).toUpperCase() + modalType.slice(1),
        description: formData.description,
        account_id: formData.account_id,
        category: finalCategory,
        date: formData.date,
        member_id: formData.member_id
      });
    }

    setLoading(false);
    if (result?.error) {
      setError(result.error.message);
    } else {
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '', 
      description: '', 
      account_id: accounts[0]?.id || '', 
      to_account_id: accounts[1]?.id || '',
      category: '', 
      customCategory: '', 
      date: getToday(),
      member_id: ''
    });
    setError('');
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-max flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="card w-full max-w-xl shadow-2xl animate-slide-up border-white/10 bg-card p-6 md:p-10">
        <div className="flex justify-between items-center mb-6 md:mb-10">
          <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter">
            {modalType === 'transfer' ? 'Asset Transfer' : `Log ${modalType}`}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={24} /></button>
        </div>
        
        {error && <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-xs font-black">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          <div className="flex bg-white/5 p-1 rounded-2xl w-full">
            <button 
              type="button"
              onClick={() => setModalType('expense')}
              className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${modalType === 'expense' ? 'bg-danger text-white shadow-lg' : 'text-text-muted hover:text-white'}`}
            >
              {t('expense')}
            </button>
            <button 
              type="button"
              onClick={() => setModalType('income')}
              className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${modalType === 'income' ? 'bg-success text-white shadow-lg' : 'text-text-muted hover:text-white'}`}
            >
              {t('income')}
            </button>
            <button 
              type="button"
              onClick={() => setModalType('transfer')}
              className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${modalType === 'transfer' ? 'bg-primary text-black shadow-lg' : 'text-text-muted hover:text-white'}`}
            >
              {t('transfer')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="text-xs text-text-muted uppercase tracking-widest font-black block mb-2 md:mb-3">{t('amount')}</label>
              <input type="number" step="0.01" required className="h-12 md:h-14 text-base md:text-lg font-black" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-text-muted uppercase tracking-widest font-black block mb-2 md:mb-3">{t('date') || 'Date'}</label>
              <input type="date" required className="h-12 md:h-14 text-sm font-bold" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted uppercase tracking-widest font-black block mb-2 md:mb-3">{t('description')}</label>
            <input type="text" required className="h-12 md:h-14 text-sm font-black" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className="space-y-4 md:space-y-6">
            <div>
              <label className="text-xs text-text-muted uppercase tracking-[0.2em] font-black block mb-2">
                {modalType === 'transfer' ? t('from_wallet') : t('wallet')}
              </label>
              <SearchableSelect 
                options={accounts?.map(acc => ({ id: acc.id, name: acc.name }))} 
                value={formData.account_id} 
                onChange={(val) => setFormData({...formData, account_id: val})} 
                placeholder={t('tx_wallet') + '...'} 
              />
            </div>
            
            {modalType !== 'transfer' && (
              <div>
                <label className="text-xs text-text-muted uppercase tracking-[0.2em] font-black block mb-2">{t('category')}</label>
                <SearchableSelect 
                  options={categories[modalType] || []} 
                  value={formData.category} 
                  onChange={(val) => setFormData({...formData, category: val})} 
                  placeholder={t('tx_search_cat') || "Search Category..."} 
                />
              </div>
            )}
            
            {modalType === 'transfer' && (
              <div>
                <label className="text-xs text-text-muted uppercase tracking-[0.2em] font-black block mb-2">{t('to_wallet')}</label>
                <SearchableSelect 
                  options={accounts?.map(acc => ({ id: acc.id, name: acc.name }))} 
                  value={formData.to_account_id} 
                  onChange={(val) => setFormData({...formData, to_account_id: val})} 
                  placeholder="Search Target Wallet..." 
                />
              </div>
            )}

            {householdMembers.length > 0 && (
              <div className="relative group/member">
                <label className="text-xs text-text-muted uppercase tracking-[0.2em] font-black block mb-2">{t('member')}</label>
                <div className="flex items-center gap-3">
                  {formData.member_id && (
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-black shrink-0 animate-scale-in"
                      style={{ backgroundColor: householdMembers.find(m => m.id === formData.member_id)?.color || '#fff' }}
                    >
                      {householdMembers.find(m => m.id === formData.member_id)?.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <SearchableSelect 
                      options={householdMembers.map(m => ({ id: m.id, name: m.name }))} 
                      value={formData.member_id} 
                      onChange={(val) => setFormData({...formData, member_id: val})} 
                      placeholder={t('member') + '...'} 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading || !formData.amount}
            className={`btn w-full h-16 rounded-2xl text-black font-black uppercase tracking-[0.2em] shadow-xl ${modalType === 'expense' ? 'bg-danger text-white' : modalType === 'income' ? 'bg-success text-white' : 'bg-primary'} disabled:opacity-50 mt-4`}
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : t('save')}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default LogEntryModal;
