import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  Plus, 
  Search, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight,
  X,
  Repeat,
  AlertCircle,
  Loader2,
  Edit2,
  ChevronDown,
  CheckSquare,
  Square,
  Check,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  Wallet
} from 'lucide-react';
import SearchableSelect from './ui/SearchableSelect';

const TransactionList = () => {
  const { 
    transactions, 
    accounts, 
    addTransaction, 
    updateTransaction, 
    deleteTransaction, 
    deleteTransactions, 
    transferFunds,
    preferences,
    toggleBalances,
    householdMembers
  } = useFinance();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWalletHubOpen, setIsWalletHubOpen] = useState(false);
  const [modalType, setModalType] = useState('expense'); 
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Date Filtering State Helpers
  const getToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLastMonthDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(getLastMonthDate());
  const [endDate, setEndDate] = useState(getToday());

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

  const categories = {
    income: ['Salary', 'Bonus', 'Investment', 'Gift', 'Other'],
    expense: ['Food', 'Rent', 'Transport', 'Entertainment', 'Utilities', 'Shopping', 'Health', 'Other'],
    transfer: []
  };

  const filteredTransactions = transactions.filter(t => {
    // 1. Text Search Filter
    const matchesSearch = !searchTerm || 
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Date Range Filter
    const txDate = new Date(t.date);
    const matchesStartDate = !startDate || txDate >= new Date(startDate);
    const matchesEndDate = !endDate || txDate <= new Date(endDate);
    
    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  const handleEditClick = (transaction) => {
    setEditingId(transaction.id);
    setModalType(transaction.type.toLowerCase());
    const typeKey = transaction.type.toLowerCase();
    const availableCategories = categories[typeKey] || [];
    
    setFormData({
      amount: transaction.amount,
      description: transaction.description,
      account_id: transaction.account_id,
      category: availableCategories.includes(transaction.category) ? transaction.category : 'Other',
      customCategory: availableCategories.includes(transaction.category) ? '' : transaction.category,
      date: transaction.date,
      member_id: transaction.member_id || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    
    console.log('[DEBUG] Executing delete for ID:', deleteConfirmId);
    setLoading(true);
    const result = await deleteTransaction(deleteConfirmId);
    setLoading(false);
    
    if (result?.error) {
      alert('Action Denied: ' + result.error.message);
    } else {
      setDeleteConfirmId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setLoading(true);
    console.log('[DEBUG] Executing bulk delete for:', selectedIds);
    const result = await deleteTransactions(selectedIds);
    setLoading(false);

    if (result?.error) {
      alert('Bulk Action Failed: ' + result.error.message);
    } else {
      setSelectedIds([]);
      setShowBulkConfirm(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(t => t.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const finalCategory = formData.category === 'Other' ? formData.customCategory : formData.category;
    
    let result;
    if (editingId) {
      result = await updateTransaction(editingId, {
        amount: parseFloat(formData.amount),
        type: modalType.charAt(0).toUpperCase() + modalType.slice(1),
        description: formData.description,
        account_id: formData.account_id,
        category: finalCategory,
        date: formData.date
      });
    } else if (modalType === 'transfer') {
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
      setIsModalOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '', description: '', account_id: accounts[0]?.id || '', to_account_id: accounts[1]?.id || '',
      category: '', customCategory: '', date: getToday(), member_id: ''
    });
    setEditingId(null);
    setError('');
  };

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const rows = filteredTransactions.map(t => [
      t.date,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      t.type,
      t.amount
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    
    try {
      const encodedUri = "data:text/csv;charset=utf-8,\ufeff" + encodeURIComponent(csvContent);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.setAttribute('href', encodedUri);
      a.setAttribute('download', `Finance_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { if (document.body.contains(a)) document.body.removeChild(a); }, 500);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-slide-up pb-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Transactions</h2>
            <div className="flex items-center gap-3">
              <p className="text-text-muted font-bold">Cloud-synced ledger history.</p>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <button 
                onClick={() => setIsWalletHubOpen(!isWalletHubOpen)}
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Wallet size={12} />
                {isWalletHubOpen ? 'Hide Wallets' : 'Show Wallets'}
              </button>
            </div>
          </div>
          
          <div className="flex gap-3 items-center">
            <button 
              onClick={toggleBalances}
              className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-text-muted hover:text-white transition-all mr-2"
              title={preferences.hideBalances ? "Reveal Amounts" : "Privacy Mode"}
            >
              {preferences.hideBalances ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            <button 
              onClick={() => { 
                  if (accounts.length === 0) return;
                  setModalType('expense'); 
                  setEditingId(null); 
                  setError(''); 
                  setIsModalOpen(true); 
              }}
              className="btn btn-primary text-black font-black uppercase text-xs tracking-widest"
            >
              <Plus size={18} />
              Log Entry
            </button>
            <button 
              onClick={() => { 
                  if (accounts.length === 0) return;
                  setModalType('transfer'); 
                  setEditingId(null); 
                  setError(''); 
                  setIsModalOpen(true); 
              }}
              className="btn btn-secondary border-white/10 font-bold text-xs"
            >
              <Repeat size={18} />
              Transfer
            </button>
          </div>
        </header>
        
        {/* Wallet Hub - Collapsible Section */}
        {isWalletHubOpen && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-3xl animate-scale-in">
             {accounts.map(acc => (
               <div key={acc.id} className="bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-primary/20 transition-all group">
                  <p className="text-[9px] text-text-muted uppercase font-black tracking-widest mb-1 truncate">{acc.name}</p>
                  <p className="text-sm font-black text-white group-hover:text-primary transition-colors">
                    {preferences.hideBalances ? '••••' : `$${Number(acc.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </p>
               </div>
             ))}
             {accounts.length === 0 && (
               <p className="col-span-full py-4 text-center text-text-muted text-[10px] font-bold uppercase tracking-widest">No active wallets sync'd</p>
             )}
          </div>
        )}

        {/* Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-row gap-4">
          <div className="relative flex-1 md:col-span-2 lg:col-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={20} />
            <input 
              type="text" 
              placeholder="Search records..." 
              className="pl-12 bg-card border-white/10 w-full h-14 font-black text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-row gap-4">
            <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/20 p-2 rounded-xl h-14 hover:border-primary/50 transition-all">
              <span className="text-[10px] font-black uppercase text-white px-2">From</span>
              <input 
                type="date" 
                className="bg-transparent border-none p-0 h-auto w-full text-xs font-black focus:shadow-none text-white indicator-white"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/20 p-2 rounded-xl h-14 hover:border-primary/50 transition-all">
              <span className="text-[10px] font-black uppercase text-white px-2">To</span>
              <input 
                type="date" 
                className="bg-transparent border-none p-0 h-auto w-full text-xs font-black focus:shadow-none text-white indicator-white"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-auto">
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); }}
              className="btn btn-secondary border-white/10 h-14 px-4 text-[10px] font-black uppercase flex-1"
              title="Reset Filters"
            >
              Clear/Show All
            </button>

            {selectedIds.length > 0 && (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowBulkConfirm(true); }}
                disabled={loading}
                className="btn bg-danger text-white border border-danger/20 hover:bg-danger/90 h-14 px-6 transition-all animate-scale-in shadow-lg shadow-danger/20 flex-1 lg:flex-none"
              >
                <Trash2 size={18} />
                <span className="font-black text-xs uppercase">Delete ({selectedIds.length})</span>
              </button>
            )}

            <button 
              onClick={exportCSV}
              className="btn btn-secondary border-white/10 px-8 h-14 shrink-0 transition-all active:scale-95 flex-1 lg:flex-none"
            >
              <Download size={18} />
              <span className="font-bold">Export</span>
            </button>
          </div>
        </div>

        {/* Transaction Views */}
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block card p-0 overflow-hidden border-white/10 bg-card shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-text-muted text-[10px] uppercase tracking-[0.2em] bg-white/[0.03]">
                    <th className="pl-8 py-5 w-10">
                       <button 
                         onClick={toggleSelectAll}
                         className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0 ? 'bg-primary text-black' : 'bg-white/5 border border-white/10'}`}
                       >
                         {selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0 ? <Check size={14} strokeWidth={4} /> : <Square size={14} />}
                       </button>
                    </th>
                    <th className="px-8 py-5 font-black">Timestamp</th>
                    <th className="px-8 py-5 font-black">Activity / Classification</th>
                    <th className="px-8 py-5 font-black">Wallet</th>
                    <th className="px-8 py-5 font-black text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTransactions.map(t => (
                    <tr 
                      key={t.id} 
                      className={`hover:bg-white/[0.02] transition-colors group cursor-pointer ${selectedIds.includes(t.id) ? 'bg-primary/[0.05]' : ''}`}
                      onClick={() => toggleSelect(t.id)}
                    >
                      <td className="pl-8 py-5 w-10" onClick={(e) => e.stopPropagation()}>
                         <button 
                           onClick={() => toggleSelect(t.id)}
                           className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${selectedIds.includes(t.id) ? 'bg-primary text-black' : 'bg-white/5 border border-white/10 hover:border-primary/50'}`}
                         >
                           {selectedIds.includes(t.id) ? <Check size={14} strokeWidth={4} /> : <Square size={14} />}
                         </button>
                      </td>
                      <td className="px-8 py-5 text-xs font-black text-text-muted">{t.date}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${t.type === 'Income' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
                            {t.type === 'Income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-black text-[15px] tracking-tight text-white leading-none">{t.description}</p>
                              {t.member_id && (
                                <div 
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-black shrink-0"
                                  style={{ backgroundColor: householdMembers.find(m => m.id === t.member_id)?.color || '#fff' }}
                                  title={householdMembers.find(m => m.id === t.member_id)?.name}
                                >
                                  {householdMembers.find(m => m.id === t.member_id)?.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] text-primary uppercase font-black tracking-widest">{t.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase text-text-muted border border-white/5">
                          {accounts.find(a => a.id === t.account_id)?.name || 'Removed'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-6">
                          <div className={`text-lg font-black ${t.type === 'Income' ? 'text-primary' : 'text-danger'}`}>
                            {t.type === 'Income' ? '+' : '-'}${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                           <div className="flex gap-2 group-hover:opacity-100 opacity-60 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleEditClick(t); }} 
                                className="p-2 hover:bg-white/10 rounded-lg text-text-muted"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(t.id); }} 
                                className="p-2 hover:bg-danger/10 rounded-lg text-danger"
                              >
                                <Trash2 size={16} />
                              </button>
                           </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
             {filteredTransactions.map(t => (
               <div 
                key={t.id} 
                className={`card p-5 border-white/5 bg-card active:scale-[0.98] transition-transform ${selectedIds.includes(t.id) ? 'border-primary/50' : ''}`}
                onClick={() => toggleSelect(t.id)}
               >
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.type === 'Income' ? 'bg-primary/10 text-primary' : 'bg-danger/10 text-danger'}`}>
                        {t.type === 'Income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-sm text-white">{t.description}</p>
                          {t.member_id && (
                            <div 
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black text-black shrink-0"
                              style={{ backgroundColor: householdMembers.find(m => m.id === t.member_id)?.color || '#fff' }}
                            >
                              {householdMembers.find(m => m.id === t.member_id)?.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{t.date}</p>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${t.type === 'Income' ? 'text-primary' : 'text-danger'}`}>
                      {t.type === 'Income' ? '+' : '-'}${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                 </div>
                 
                 <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-[9px] font-black uppercase text-text-muted tracking-widest">
                      {accounts.find(a => a.id === t.account_id)?.name || 'Wallet'} • {t.category}
                    </span>
                    <div className="flex gap-2">
                       <button 
                        onClick={(e) => { e.stopPropagation(); handleEditClick(t); }}
                        className="p-2 rounded-lg bg-white/5 text-text-muted"
                       >
                         <Edit2 size={14} />
                       </button>
                       <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(t.id); }}
                        className="p-2 rounded-lg bg-danger/10 text-danger"
                       >
                         <Trash2 size={14} />
                       </button>
                    </div>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Portals */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-max flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
           <div className="card w-full max-w-sm border-danger/30 bg-card p-10 text-center shadow-2xl animate-scale-in">
              <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-danger/20">
                <Trash2 size={40} className="text-danger" />
              </div>
              <h3 className="text-2xl font-black mb-2 uppercase text-danger">Delete Record?</h3>
              <p className="text-text-muted text-sm font-bold mb-10">This action cannot be undone.</p>
              <div className="flex flex-col gap-4">
                <button onClick={handleDelete} disabled={loading} className="btn bg-white text-danger h-14 font-black uppercase text-sm tracking-widest">
                  {loading ? <Loader2 className="animated-spin" /> : 'Confirm Deletion'}
                </button>
                <button onClick={() => setDeleteConfirmId(null)} className="btn btn-secondary border-white/10 h-14 font-bold uppercase text-xs">
                  Cancel
                </button>
              </div>
           </div>
        </div>,
        document.body
      )}

      {showBulkConfirm && createPortal(
        <div className="fixed inset-0 z-max flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
           <div className="card w-full max-w-sm border-danger/30 bg-card p-10 text-center shadow-2xl animate-scale-in">
              <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-danger/20">
                <Trash2 size={40} className="text-danger" />
              </div>
              <h3 className="text-2xl font-black mb-2 uppercase text-danger">Delete {selectedIds.length} Records?</h3>
              <p className="text-text-muted text-sm font-bold mb-10 leading-relaxed">
                This will batch-process the deletion and automatically reverse all balance impacts. This action is permanent.
              </p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleBulkDelete}
                  disabled={loading}
                  className="btn bg-danger text-white h-16 font-black uppercase text-sm tracking-widest hover:bg-danger/90 disabled:opacity-50 shadow-xl shadow-danger/20"
                >
                  {loading ? <Loader2 className="animate-spin" /> : `Confirm Bulk Delete`}
                </button>
                <button 
                  onClick={() => setShowBulkConfirm(false)}
                  className="btn btn-secondary border-white/10 h-14 font-bold uppercase text-xs tracking-widest"
                >
                  Cancel
                </button>
              </div>
           </div>
        </div>,
        document.body
      )}

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-max flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="card w-full max-w-xl shadow-2xl animate-slide-up border-white/10 bg-card p-10">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black uppercase tracking-tighter">
                {editingId ? 'Edit Transaction' : modalType === 'transfer' ? 'Asset Transfer' : `Log ${modalType}`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-white"><X size={32} /></button>
            </div>
            {error && <div className="mb-8 p-5 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-xs font-black">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-8">
              {!editingId && modalType !== 'transfer' && (
                <div className="flex bg-white/5 p-1.5 rounded-2xl mb-4 border border-white/10">
                  <button type="button" onClick={() => setModalType('expense')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${modalType === 'expense' ? 'bg-danger text-white' : 'text-text-muted'}`}>Outgoing</button>
                  <button type="button" onClick={() => setModalType('income')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${modalType === 'income' ? 'bg-primary text-black' : 'text-text-muted'}`}>Incoming</button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-text uppercase tracking-widest font-black block mb-3">Net Value</label>
                  <input type="number" step="0.01" required className="h-14 text-lg font-black" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-text uppercase tracking-widest font-black block mb-3">Timestamp</label>
                  <input type="date" required className="h-14 font-bold" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs text-text uppercase tracking-widest font-black block mb-3">Description / Memo</label>
                <input type="text" required className="h-14 font-black" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-black block mb-2">Wallet</label>
                  <SearchableSelect options={accounts?.map(acc => ({ id: acc.id, name: acc.name }))} value={formData.account_id} onChange={(val) => setFormData({...formData, account_id: val})} placeholder="Search Wallet..." />
                </div>
                {modalType !== 'transfer' && (
                  <div>
                    <label className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-black block mb-2">Classification</label>
                    <SearchableSelect options={(categories[modalType] || []).map(cat => ({ id: cat, name: cat }))} value={formData.category} onChange={(val) => setFormData({...formData, category: val})} placeholder="Search Category..." />
                  </div>
                )}
                {modalType === 'transfer' && !editingId && (
                  <div>
                    <label className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-black block mb-2">To Wallet</label>
                    <SearchableSelect options={accounts?.map(acc => ({ id: acc.id, name: acc.name }))} value={formData.to_account_id} onChange={(val) => setFormData({...formData, to_account_id: val})} placeholder="Search Target Wallet..." />
                  </div>
                )}
                {householdMembers.length > 0 && (
                  <div>
                    <label className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-black block mb-2">Member Tag (Optional)</label>
                    <SearchableSelect 
                      options={householdMembers.map(m => ({ id: m.id, name: m.name }))} 
                      value={formData.member_id} 
                      onChange={(val) => setFormData({...formData, member_id: val})} 
                      placeholder="Tag family member..." 
                    />
                  </div>
                )}
              </div>
              <div className="pt-6">
                <button type="submit" disabled={loading} className="btn btn-primary w-full h-16 font-black uppercase text-black">
                  {loading ? <Loader2 className="animate-spin" /> : editingId ? 'Update Record' : 'Log Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default TransactionList;
