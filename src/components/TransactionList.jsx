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

const TransactionRow = ({ transaction, accounts, householdMembers, preferences, getMemberId, getCleanDescription, toggleSelect, selectedIds, handleEditClick, setDeleteConfirmId, t }) => {
  const memberId = getMemberId(transaction);
  const member = householdMembers.find(m => String(m.id) === String(memberId));
  const isSelected = selectedIds.includes(transaction.id);

  return (
    <div 
      className={`card glass group relative overflow-visible transition-all hover:bg-white/5 border border-white/5 hover:border-white/10 ${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}`}
      onClick={() => toggleSelect(transaction.id)}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
         <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${transaction.type === 'Income' ? 'bg-primary/20 text-primary' : transaction.type === 'Transfer' ? 'bg-secondary/20 text-secondary' : 'bg-danger/20 text-danger'}`}>
              {transaction.type === 'Income' ? <ArrowUpRight size={28} /> : transaction.type === 'Transfer' ? <Repeat size={28} /> : <ArrowDownRight size={28} />}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h4 className="font-black text-lg">{getCleanDescription(transaction.description)}</h4>
                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-white/5 text-text-muted">
                  {transaction.category}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1.5">
                  <Wallet size={12} className="text-text-muted" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {accounts.find(a => String(a.id) === String(transaction.account_id))?.name || 'Unknown'}
                  </span>
                </div>
                {member && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded text-primary border border-primary/20">
                    <span className="text-[9px] font-black uppercase tracking-tighter">{member.name}</span>
                  </div>
                )}
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{transaction.date}</p>
              </div>
            </div>
         </div>
         
         <div className="flex items-center justify-between md:justify-end gap-6">
            <div className="text-right">
              <p className="text-2xl font-black text-white">
                {transaction.type === 'Income' ? '+' : '-'}{preferences.hideBalances ? '••••' : `$${Number(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </p>
            </div>
            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
              <button 
                onClick={(e) => { e.stopPropagation(); handleEditClick(transaction); }}
                className="p-3 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-all text-text-muted"
              >
                <Edit2 size={20} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(transaction.id); }}
                className="p-3 rounded-xl bg-white/5 hover:bg-danger/20 hover:text-danger transition-all text-text-muted"
              >
                <Trash2 size={20} />
              </button>
            </div>
         </div>
      </div>
    </div>
  );
};


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
    householdMembers,
    addCustomCategory,
    deleteCustomCategory,
    updateCustomCategory,
    t
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

  const [filterAccount, setFilterAccount] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterMember, setFilterMember] = useState('all');
  const [isGroupedByType, setIsGroupedByType] = useState(false);



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

  const allCategories = {
    income: [
      ...categories.income, 
      ...(preferences.customCategories?.income || []).map(c => ({ ...c, isCustom: true }))
    ],
    expense: [
      ...categories.expense, 
      ...(preferences.customCategories?.expense || []).map(c => ({ ...c, isCustom: true }))
    ],
    transfer: []
  };


  const handleCategoryChange = (val) => {
    // Check if this is a NEW category
    const exists = allCategories[modalType]?.some(c => c.id === val);
    if (!exists && val && modalType !== 'transfer') {
      addCustomCategory(modalType, val);
    }
    setFormData(prev => ({ ...prev, category: val }));
  };

  const getMemberId = (tx) => {
    if (tx.member_id) return tx.member_id;
    const match = (tx.description || '').match(/^\[(.*?)\]/);
    if (match) {
      const name = match[1];
      return householdMembers.find(m => m.name === name)?.id;
    }
    return null;
  };

  const getCleanDescription = (desc) => {
    return (desc || '').replace(/^\[.*?\]\s*/, '');
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

    // 3. Account Filter
    const matchesAccount = filterAccount === 'all' || String(t.account_id) === String(filterAccount);

    // 4. Category Filter
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;

    // 5. Type Filter
    const matchesType = filterType === 'all' || t.type === filterType;

    // 6. Member Filter
    const matchesMember = filterMember === 'all' || String(t.member_id) === String(filterMember);
    
    return matchesSearch && matchesStartDate && matchesEndDate && matchesAccount && matchesCategory && matchesType && matchesMember;
  });


  const handleEditClick = (transaction) => {
    setEditingId(transaction.id);
    setModalType(transaction.type.toLowerCase());
    const typeKey = transaction.type.toLowerCase();
    const availableCategories = allCategories[typeKey] || [];
    
    setFormData({
      amount: transaction.amount,
      description: transaction.description,
      account_id: transaction.account_id,
      category: availableCategories.some(c => c.id === transaction.category) ? transaction.category : 'Other',
      customCategory: availableCategories.some(c => c.id === transaction.category) ? '' : transaction.category,
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
        date: formData.date,
        member_id: formData.member_id
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
            <h2 className="text-3xl font-black tracking-tight">{t('nav_history')}</h2>
            <div className="flex items-center gap-3">
              <p className="text-text-muted font-bold">Cloud-synced ledger history.</p>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <button 
                onClick={() => setIsWalletHubOpen(!isWalletHubOpen)}
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Wallet size={12} />
                {isWalletHubOpen ? t('hide_wallets') : t('show_wallets')}
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
              {t('dash_add_transaction')}
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
              {t('tx_transfer')}
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

        {/* Filter Toolbar */}
        <div className="card glass p-4 space-y-4">

           {/* Row 1: Search & Dates */}
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-6 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Search description or category..." 
                  className="w-full pl-12 h-14 bg-white/5 border-white/10 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-black text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="lg:col-span-6 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 bg-white/5 border border-white/20 p-2 rounded-xl h-14 hover:border-primary/50 transition-all">
                  <span className="text-[10px] font-black uppercase text-white px-2">From</span>
                  <input 
                    type="date" 
                    className="bg-transparent border-none p-0 h-auto w-full text-xs font-black focus:shadow-none text-white indicator-white"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/20 p-2 rounded-xl h-14 hover:border-primary/50 transition-all">
                  <span className="text-[10px] font-black uppercase text-white px-2">To</span>
                  <input 
                    type="date" 
                    className="bg-transparent border-none p-0 h-auto w-full text-xs font-black focus:shadow-none text-white indicator-white"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

           </div>

           {/* Row 2: Select Filters */}
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Wallet</label>
                 <select 
                  className="w-full h-12 px-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black appearance-none cursor-pointer hover:bg-white/10 transition-all text-white"
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                 >
                    <option value="all" className="bg-[#181818]">All Wallets</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id} className="bg-[#181818]">{acc.name}</option>)}
                 </select>
              </div>

              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Category</label>
                 <SearchableSelect 
                    options={[
                      { id: 'all', name: 'All Categories' },
                      ...[...allCategories.income, ...allCategories.expense].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
                    ]}
                    value={filterCategory}
                    onChange={(val) => setFilterCategory(val)}
                    placeholder="Search Categories"
                    className="!h-12 !rounded-xl !text-xs !font-black"
                 />
              </div>


              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Type</label>
                 <select 
                  className="w-full h-12 px-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black appearance-none cursor-pointer hover:bg-white/10 transition-all text-white"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                 >
                    <option value="all" className="bg-[#181818]">All Types</option>
                    <option value="Expense" className="bg-[#181818]">Expense</option>
                    <option value="Income" className="bg-[#181818]">Income</option>
                    <option value="Transfer" className="bg-[#181818]">Transfer</option>
                 </select>
              </div>

              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Member</label>
                 <select 
                  className="w-full h-12 px-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black appearance-none cursor-pointer hover:bg-white/10 transition-all text-white"
                  value={filterMember}
                  onChange={(e) => setFilterMember(e.target.value)}
                 >
                    <option value="all" className="bg-[#181818]">All Members</option>
                    {householdMembers.map(m => <option key={m.id} value={m.id} className="bg-[#181818]">{m.name}</option>)}
                 </select>
              </div>

              <div className="flex items-end">
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); setFilterAccount('all'); setFilterCategory('all'); setFilterType('all'); setFilterMember('all'); setIsGroupedByType(false); }}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase hover:bg-white/10 hover:text-white transition-all text-text-muted"
                >
                  {t('tx_clear')}
                </button>
              </div>

              <div className="flex items-end">
                <button 
                  onClick={() => setIsGroupedByType(!isGroupedByType)}
                  className={`w-full h-12 border rounded-xl text-[10px] font-black uppercase transition-all ${isGroupedByType ? 'bg-primary border-primary text-black' : 'bg-white/5 border-white/10 text-text-muted hover:text-white'}`}
                >
                  {isGroupedByType ? 'Ungroup' : 'Group by Type'}
                </button>
              </div>

           </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {selectedIds.length > 0 && (
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowBulkConfirm(true); }}
              disabled={loading}
              className="btn bg-danger text-white border border-danger/20 hover:bg-danger/90 h-14 px-6 transition-all animate-scale-in shadow-lg shadow-danger/20 flex-1 md:flex-none"
            >
              <Trash2 size={18} />
              <span className="font-black text-xs uppercase">Delete ({selectedIds.length})</span>
            </button>
          )}

          <button 
            onClick={exportCSV}
            className="btn btn-secondary border-white/10 px-8 h-14 shrink-0 transition-all active:scale-95 flex-1 md:flex-none"
          >
            <Download size={18} />
            <span className="font-bold">{t('tx_export')}</span>
          </button>
        </div>


        {/* Transaction Views */}
        {/* Transaction Views */}
        <div className="space-y-4">
           {isGroupedByType ? (
             <div className="space-y-12">
                {['Expense', 'Income', 'Transfer'].map(type => {
                  const groupTransactions = filteredTransactions.filter(t => t.type === type);
                  if (groupTransactions.length === 0) return null;

                  return (
                    <div key={type} className="space-y-4">
                      <div className="flex items-center gap-3 px-2">
                        <div className={`w-1.5 h-4 rounded-full ${type === 'Income' ? 'bg-primary' : type === 'Transfer' ? 'bg-secondary' : 'bg-danger'}`}></div>
                        <h5 className={`text-sm font-black uppercase tracking-[0.2em] ${type === 'Income' ? 'text-primary' : type === 'Transfer' ? 'text-secondary' : 'text-danger'}`}>
                          {type === 'Income' ? 'Income' : type === 'Transfer' ? 'Transfers' : 'Expenses'}
                        </h5>
                        <span className="text-[10px] font-black text-text-muted/50 ml-auto">{groupTransactions.length} items</span>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {groupTransactions.map(t => (
                          <TransactionRow 
                            key={t.id} 
                            transaction={t} 
                            accounts={accounts}
                            householdMembers={householdMembers}
                            preferences={preferences}
                            getMemberId={getMemberId}
                            getCleanDescription={getCleanDescription}
                            toggleSelect={toggleSelect}
                            selectedIds={selectedIds}
                            handleEditClick={handleEditClick}
                            setDeleteConfirmId={setDeleteConfirmId}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
             </div>
           ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredTransactions.length === 0 ? (
                  <div className="p-20 text-center text-text-muted">No transactions found for the selected filters</div>
                ) : (
                  filteredTransactions.map(t => (
                    <TransactionRow 
                      key={t.id} 
                      transaction={t} 
                      accounts={accounts}
                      householdMembers={householdMembers}
                      preferences={preferences}
                      getMemberId={getMemberId}
                      getCleanDescription={getCleanDescription}
                      toggleSelect={toggleSelect}
                      selectedIds={selectedIds}
                      handleEditClick={handleEditClick}
                      setDeleteConfirmId={setDeleteConfirmId}
                      t={t}
                    />
                  ))
                )}
              </div>
           )}
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
                  <label className="text-xs text-text uppercase tracking-widest font-black block mb-3">{t('amount')}</label>
                  <input type="number" step="0.01" required className="h-14 text-lg font-black" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
                </div>

                <div>
                  <label className="text-xs text-text uppercase tracking-widest font-black block mb-3">{t('date')}</label>
                  <input type="date" required className="h-14 font-bold" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>

              </div>
              <div>
                <label className="text-xs text-text uppercase tracking-widest font-black block mb-3">{t('description')}</label>
                <input type="text" required className="h-14 font-black" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-black block mb-2">{t('wallet')}</label>
                  <SearchableSelect options={accounts?.map(acc => ({ id: acc.id, name: acc.name }))} value={formData.account_id} onChange={(val) => setFormData({...formData, account_id: val})} placeholder={t('tx_wallet') + '...'} />
                </div>

                {modalType !== 'transfer' && (
                  <div>
                    <label className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-black block mb-2">{t('category')}</label>
                    <SearchableSelect 
                      options={allCategories[modalType] || []} 
                      value={formData.category} 
                      onChange={handleCategoryChange} 
                      onEdit={(id, currentName) => {
                        const newName = prompt('Enter new category name:', currentName);
                        if (newName && newName !== currentName) {
                          updateCustomCategory(modalType, id, newName);
                        }
                      }}
                      onDelete={(id) => {
                        if (confirm('Delete this custom category?')) {
                          deleteCustomCategory(modalType, id);
                          if (formData.category === id) setFormData(prev => ({ ...prev, category: '' }));
                        }
                      }}
                      placeholder={t('category') + '...'} 
                    />
                  </div>
                )}



                {modalType === 'transfer' && !editingId && (
                  <div>
                    <label className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-black block mb-2">To Wallet</label>
                    <SearchableSelect options={accounts?.map(acc => ({ id: acc.id, name: acc.name }))} value={formData.to_account_id} onChange={(val) => setFormData({...formData, to_account_id: val})} placeholder="Search Target Wallet..." />
                  </div>
                )}
                {householdMembers.length > 0 && (
                  <div className="relative group/member">
                    <label className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-black block mb-2">{t('member')}</label>
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
