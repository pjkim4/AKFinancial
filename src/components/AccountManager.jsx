import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  Plus, 
  CreditCard, 
  Wallet, 
  Settings2, 
  X,
  ShieldCheck,
  ArrowRightLeft,
  AlertCircle,
  Loader2,
  ChevronDown,
  Eye,
  EyeOff
} from 'lucide-react';


import SearchableSelect from './ui/SearchableSelect';

const AccountManager = () => {
  const { 
    transactions, 
    accounts, 
    createAccount, 
    updateAccount, 
    deleteAccount, 
    adjustBalance, 
    transferFunds, 
    preferences,
    toggleBalances,
    t 
  } = useFinance();


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add'); 
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [newAcc, setNewAcc] = useState({ name: '', type: 'Checking', balance: 0, color: '#c1ff72', parent_account_id: '' });
  const [editAcc, setEditAcc] = useState({ name: '', type: '', color: '', parent_account_id: '' });
  const [adjust, setAdjust] = useState({ type: 'set', value: 0, reason: '', date: new Date().toISOString().split('T')[0] });
  const [ccPayment, setCcPayment] = useState({ fromId: '', toId: '', amount: 0 });
  const [transfer, setTransfer] = useState({ toId: '', amount: 0 });
  const [settingsTab, setSettingsTab] = useState('details'); // 'details', 'adjust', 'delete'
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [settlementTargetId, setSettlementTargetId] = useState('');

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error: dbError } = await createAccount({
      name: newAcc.name,
      type: newAcc.type,
      balance: parseFloat(newAcc.balance),
      color: newAcc.color,
      parent_account_id: newAcc.type === 'Debit Card' ? newAcc.parent_account_id : null
    });
    
    setLoading(false);
    if (dbError) {
      setError(`Database Error: ${dbError.message}. Make sure you ran the SQL policies!`);
    } else {
      setIsModalOpen(false);
      setNewAcc({ name: '', type: 'Checking', balance: 0, color: '#c1ff72', parent_account_id: '' });
    }
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: dbError } = await updateAccount(selectedAccount.id, editAcc);
    setLoading(false);
    if (dbError) setError(dbError.message);
    else setIsModalOpen(false);
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await adjustBalance(selectedAccount.id, parseFloat(adjust.value), adjust.type === 'diff', adjust.reason, adjust.date);
      if (result?.error) {
        setError(result.error.message);
      } else {
        setIsModalOpen(false);
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const downloadAccountBackup = () => {
    // Sanitize filename: remove any character that isn't alphanumeric, space, or dash
    const safeName = (selectedAccount.name || 'Account')
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '_');
    
    console.log('[DEBUG] Generating high-compatibility backup for:', selectedAccount.name);
    const accountTxs = transactions.filter(t => t.account_id === selectedAccount.id);
    
    // CSV Header and content
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const rows = accountTxs.map(t => [
      t.date,
      `"${(t.description || '').replace(/"/g, '""')}"`, // Quote and escape descriptions
      `"${(t.category || '').replace(/"/g, '""')}"`,
      t.type,
      t.amount
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    
    // Method 1: Download File (Using Data URL for better filename persistence)
    try {
      const encodedUri = "data:text/csv;charset=utf-8,\ufeff" + encodeURIComponent(csvContent);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.setAttribute('href', encodedUri);
      a.setAttribute('download', `${safeName}_Archive.csv`);
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 500);
      
      console.log('[DEBUG] Data URL Download Triggered:', safeName);
      setBackupDownloaded(true); 
    } catch (err) {
      console.error('[DEBUG] Download failed:', err);
      setError('Download failed. Please use the COPY DATA button.');
    }
  };

  const copyToClipboard = () => {
    const accountTxs = transactions.filter(t => t.account_id === selectedAccount.id);
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const rows = accountTxs.map(t => [
      t.date,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      t.type,
      t.amount
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    navigator.clipboard.writeText(csvContent);
    alert('Copied to clipboard! You can now paste (Ctrl+V) directly into Excel.');
    setBackupDownloaded(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    setError('');
    console.log('[DEBUG] confirmDelete triggered for:', selectedAccount.id);

    try {
      // If balance remains, transfer it first
      if (Number(selectedAccount.balance) !== 0) {
        if (!settlementTargetId) {
          setError('Please select an account to receive the remaining funds first.');
          setLoading(false);
          return;
        }
        console.log('[DEBUG] Settlement required. Transferring funds to:', settlementTargetId);
        const { error: txError } = await transferFunds(selectedAccount.id, settlementTargetId, Math.abs(selectedAccount.balance));
        if (txError) {
          setError('Settlement Transfer Failed: ' + txError.message);
          setLoading(false);
          return;
        }
        console.log('[DEBUG] Settlement transfer successful.');
      }

      console.log('[DEBUG] Calling deleteAccount context function...');
      const result = await deleteAccount(selectedAccount.id);
      
      if (result?.error) {
        console.error('[DEBUG] deleteAccount returned error:', result.error);
        setError(result.error.message || 'Failed to delete account. Check console.');
      } else {
        console.log('[DEBUG] deleteAccount success. Closing modal.');
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('[DEBUG] confirmDelete unexpected crash:', err);
      setError('An unexpected error occurred during deletion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-slide-up">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black tracking-tight">{t('nav_wallets')}</h2>
            <p className="text-text-muted font-bold mt-1 uppercase text-[10px] tracking-widest">{t('wallet_subtitle')}</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleBalances}
              className="btn btn-secondary w-14 h-14 flex items-center justify-center border-white/10"
              title={preferences.hideBalances ? t('show_wallets') : t('hide_wallets')}
            >
              {preferences.hideBalances ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
            <button 
              onClick={() => { setModalType('add'); setIsModalOpen(true); }}
              className="btn btn-primary h-14 px-8 text-black font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20"
            >
              <Plus size={20} strokeWidth={3} />
              {t('wallet_create')}
            </button>
          </div>

        </header>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(acc => (
          <div key={acc.id} className="card p-0 shadow-2xl bg-card border-white/5 group overflow-hidden h-[240px] flex flex-col">
            <div className={`h-2 w-full`} style={{ backgroundColor: acc.color }}></div>
            
            <div className="p-6 flex-1 flex flex-col justify-between relative">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
                  {acc.type === 'Credit Card' ? <CreditCard size={20} className="text-white" /> : <Wallet size={20} className="text-white" />}
                </div>
                <button 
                  onClick={() => { 
                    setSelectedAccount(acc); 
                    setEditAcc({ name: acc.name, type: acc.type, color: acc.color, parent_account_id: acc.parent_account_id || '' });
                    setAdjust({ type: 'set', value: acc.balance, reason: '', date: new Date().toISOString().split('T')[0] }); 
                    setModalType('settings'); 
                    setSettingsTab('details');
                    setBackupDownloaded(false);
                    setSettlementTargetId('');
                    setError('');
                    setIsModalOpen(true); 
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-text-muted opacity-0 group-hover:opacity-100 z-10"
                >
                  <Settings2 size={16} />
                </button>
              </div>

              <div>
                <p className="text-text-muted text-[10px] uppercase tracking-[0.2em] font-black mb-1">{acc.type}</p>
                  <div className="text-right">
                    <p className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-1">{t('wallet_balance')}</p>
                    <p className="text-2xl font-black tracking-tighter">
                      {preferences.hideBalances ? '••••' : `$${Number(acc.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </p>

                  </div>

                {acc.type === 'Debit Card' && acc.parent_account_id && (
                  <p className="text-[9px] text-primary font-black uppercase tracking-widest mt-1">
                    Linked to: {accounts.find(a => a.id === acc.parent_account_id)?.name || 'Source'}
                  </p>
                )}
              </div>

              <div className="absolute bottom-6 right-6 opacity-20">
                 <div className="w-12 h-8 rounded-md border border-white/20 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-white/40 -mr-2"></div>
                    <div className="w-4 h-4 rounded-full bg-white/40"></div>
                 </div>
              </div>
            </div>

            <div className="p-4 bg-white/5 border-t border-white/5 flex gap-2">
              <button 
                onClick={() => { 
                  if(acc.type === 'Credit Card') {
                    setCcPayment({ fromId: accounts[0]?.id, toId: acc.id, amount: Math.abs(acc.balance) });
                    setModalType('payCC');
                    setError('');
                    setIsModalOpen(true);
                  } else {
                    setSelectedAccount(acc);
                    setModalType('transfer');
                    setError('');
                    setIsModalOpen(true);
                  }
                }}
                className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-primary hover:text-black transition-all border border-white/10 hover:border-transparent text-text"
              >
                {acc.type === 'Credit Card' ? 'Settle Balance' : 'Send Funds'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Settings/Delete Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-max flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="card w-full max-w-md shadow-2xl animate-slide-up bg-card border-white/10 p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold">
                {modalType === 'add' && 'New Account'}
                {modalType === 'settings' && `Manage ${selectedAccount?.name}`}
                {modalType === 'payCC' && 'Pay Credit Card'}
                {modalType === 'transfer' && `Transfer from ${selectedAccount?.name}`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-white">
                <X size={24} />
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-3 text-danger">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="text-xs font-bold leading-relaxed">{error}</p>
              </div>
            )}

            {modalType === 'add' && (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-2xl font-black tracking-tight uppercase italic">{t('wallet_create')}</h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                    <X size={24} />
                  </button>
                </div>

          <form onSubmit={handleCreateAccount} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-2 block">{t('wallet_name')}</label>
                <input 
                  type="text" 
                  required 
                  className="h-14 font-black" 
                  placeholder="e.g. Bank of America"
                  value={newAcc.name}
                  onChange={(e) => setNewAcc({...newAcc, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-2 block">{t('wallet_type')}</label>
                <select 
                  className="h-14 font-bold border-white/10"
                  value={newAcc.type}
                  onChange={(e) => setNewAcc({...newAcc, type: e.target.value})}
                >
                  <option value="Checking">Checking</option>
                  <option value="Savings">Savings</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Investment">Investment</option>
                  <option value="Debit Card">Debit Card (Link to Checking)</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-2 block">{t('wallet_initial')}</label>
              <input 
                type="number" 
                step="0.01" 
                required 
                className="h-16 text-2xl font-black" 
                placeholder="0.00"
                value={newAcc.balance}
                onChange={(e) => setNewAcc({...newAcc, balance: e.target.value})}
              />
            </div>

                {newAcc.type === 'Debit Card' && (
                  <div className="animate-slide-up">
                    <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black text-primary">Connected Account (Funding Source)</label>
                    <select required value={newAcc.parent_account_id} onChange={e => setNewAcc({...newAcc, parent_account_id: e.target.value})}>
                      <option value="">Select Account</option>
                      {accounts.filter(a => a.type !== 'Credit Card' && a.type !== 'Debit Card').map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({preferences.hideBalances ? '••••' : `$${Number(acc.balance).toLocaleString()}`})
                        </option>
                      ))}

                    </select>
                  </div>
                )}
                <button type="submit" disabled={loading} className="btn btn-primary w-full h-14 font-black uppercase text-black disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" /> : t('wallet_create')}
                </button>
              </form>
            </div>
          )}



            {modalType === 'settings' && (
              <div className="space-y-6">
                <div className="flex bg-white/5 p-1 rounded-xl mb-6">
                  {['details', 'adjust', 'delete'].map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setSettingsTab(tab)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${settingsTab === tab ? 'bg-primary text-black' : 'text-text-muted hover:text-white'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {settingsTab === 'details' && (
                  <form onSubmit={handleUpdateAccount} className="space-y-6">
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">Account Name</label>
                      <input required value={editAcc.name} onChange={e => setEditAcc({...editAcc, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">Color Identity</label>
                      <input type="color" className="h-12 p-1" value={editAcc.color} onChange={e => setEditAcc({...editAcc, color: e.target.value})} />
                    </div>
                    {editAcc.type === 'Debit Card' && (
                      <div className="animate-slide-up">
                        <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black text-primary">Connected Account</label>
                        <select required value={editAcc.parent_account_id} onChange={e => setEditAcc({...editAcc, parent_account_id: e.target.value})}>
                          <option value="">Select Account</option>
                          {accounts.filter(a => a.id !== selectedAccount.id && a.type !== 'Credit Card' && a.type !== 'Debit Card').map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button type="submit" disabled={loading} className="btn btn-primary w-full h-14 font-black uppercase text-black disabled:opacity-50">
                      {loading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                    </button>
                  </form>
                )}

                {settingsTab === 'adjust' && (
                  <form onSubmit={handleAdjust} className="space-y-6 animate-scale-in">
                    <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl mb-4 text-warning">
                      <p className="text-xs font-black uppercase flex items-center gap-2">
                        <ShieldCheck size={14} /> Balance Override
                      </p>
                      <p className="text-[10px] opacity-80 mt-1 uppercase tracking-tight leading-relaxed">This will create a ledger adjustment. Use only for sync fixes.</p>
                    </div>
                    <div className="flex gap-4 mb-4">
                      <label className="flex items-center gap-2 text-xs font-black uppercase text-white cursor-pointer">
                        <input type="radio" name="adjustType" checked={adjust.type === 'set'} onChange={() => setAdjust({...adjust, type: 'set', value: selectedAccount?.balance || 0})} className="accent-primary" />
                        Set Total Balance
                      </label>
                      <label className="flex items-center gap-2 text-xs font-black uppercase text-white cursor-pointer">
                        <input type="radio" name="adjustType" checked={adjust.type === 'diff'} onChange={() => setAdjust({...adjust, type: 'diff', value: 0})} className="accent-primary" />
                        Adjust by Amount
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">
                          {adjust.type === 'set' ? 'New Balance' : 'Adjustment Amount (+/-)'}
                        </label>
                        <input type="number" step="0.01" required value={adjust.value} onChange={e => setAdjust({...adjust, value: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">As of Date</label>
                        <input type="date" required value={adjust.date} onChange={e => setAdjust({...adjust, date: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">Reason</label>
                      <textarea className="w-full" required placeholder="e.g. Bank correction" rows={3} value={adjust.reason} onChange={e => setAdjust({...adjust, reason: e.target.value})} />
                    </div>
                    <button type="submit" disabled={loading} className="btn btn-primary w-full h-14 font-black uppercase text-black disabled:opacity-50">
                      {loading ? <Loader2 className="animate-spin" /> : 'Apply Adjustment'}
                    </button>
                  </form>
                )}

                {settingsTab === 'delete' && (
                  <div className="space-y-6 animate-slide-up">
                    <div className="p-5 bg-danger/10 border border-danger/20 rounded-xl">
                      <h4 className="text-danger font-black uppercase text-xs mb-2">Danger Zone</h4>
                      <p className="text-[10px] text-text-muted uppercase font-black leading-relaxed">
                        Deleting an account is permanent and purges historical cloud data.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs font-bold text-center p-4 bg-white/5 rounded-xl">
                        Step 1: Download or verify your history below.
                      </p>
                      
                      <div className="flex gap-2">
                        <button onClick={downloadAccountBackup} className="flex-1 btn btn-secondary border-white/10 h-14 font-black uppercase text-xs">
                          Download CSV
                        </button>
                      </div>

                      {/* Live Data Preview */}
                      <div className="bg-black/40 border border-white/5 rounded-xl p-4 overflow-hidden relative">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[9px] text-text-muted uppercase font-black opacity-50">Data Preview</p>
                          <button 
                            onClick={copyToClipboard}
                            className="bg-primary hover:bg-primary/80 text-black text-[9px] font-bold px-3 py-1 rounded-md transition-colors"
                          >
                            COPY DATA
                          </button>
                        </div>
                        <div className="text-[10px] text-text font-mono whitespace-pre opacity-80 overflow-x-auto max-h-32">
                          {transactions.filter(t => t.account_id === selectedAccount.id).length > 0 
                            ? `Date,Description,Amount\n` + transactions.filter(t => t.account_id === selectedAccount.id).slice(0, 5).map(t => `${t.date},${t.description.substring(0,15)},${preferences.hideBalances ? '••••' : t.amount}`).join('\n') + '\n...'
                            : 'No transaction history found.'}
                        </div>

                      </div>

                      <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all border border-white/5">
                        <input 
                          type="checkbox" 
                          checked={backupDownloaded} 
                          onChange={(e) => setBackupDownloaded(e.target.checked)}
                          className="w-5 h-5 accent-primary" 
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">I have successfully saved my history</span>
                      </label>
                    </div>

                    {backupDownloaded && (
                      <div className="space-y-6 animate-scale-in">
                        <div className="flex items-center gap-2 text-success font-black uppercase text-[10px] justify-center bg-success/10 py-3 rounded-xl border border-success/20">
                          <ShieldCheck size={14} /> Backup Verified
                        </div>
                        
                        {Number(selectedAccount.balance) !== 0 && (
                          <div className="space-y-4 animate-scale-in">
                            <p className="text-xs font-bold text-center text-warning p-4 bg-warning/10 rounded-xl border border-warning/20">
                              Step 2: Account has a balance of {preferences.hideBalances ? '••••' : `$${selectedAccount.balance}`}. Select where to move the funds:
                            </p>

                            <SearchableSelect 
                              options={accounts.filter(a => a.id !== selectedAccount.id).map(a => ({ id: a.id, name: `${a.name} (${preferences.hideBalances ? '••••' : `$${Number(a.balance).toLocaleString()}`})` }))}

                              value={settlementTargetId}
                              onChange={(val) => setSettlementTargetId(val)}
                              placeholder="Search Destination Wallet..."
                            />
                          </div>
                        )}

                        <button 
                          onClick={confirmDelete}
                          disabled={loading || (Number(selectedAccount.balance) !== 0 && !settlementTargetId)}
                          className="btn bg-danger text-white w-full h-14 font-black uppercase text-xs tracking-widest disabled:opacity-20"
                        >
                          {loading ? <Loader2 className="animate-spin" /> : 'Permanently Delete Account'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {modalType === 'payCC' && (
              <form onSubmit={async (e) => { e.preventDefault(); setLoading(true); const {error} = await transferFunds(ccPayment.fromId, ccPayment.toId, ccPayment.amount); setLoading(false); if(error) setError(error.message); else setIsModalOpen(false); }} className="space-y-6">
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-4">
                   <ArrowRightLeft className="text-primary" />
                   <div>
                     <p className="text-sm font-bold text-primary">Settle Credit Card</p>
                     <p className="text-[10px] text-text-muted uppercase tracking-tight font-black">Moving funds from source to card</p>
                   </div>
                </div>
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">Pay From</label>
                  <SearchableSelect 
                    options={accounts.filter(a => a.type !== 'Credit Card').map(acc => ({ id: acc.id, name: acc.name }))}
                    value={ccPayment.fromId}
                    onChange={(val) => setCcPayment({...ccPayment, fromId: val})}
                    placeholder="Search Source Wallet..."
                  />
                </div>
                <div>
                   <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">Payment Amount</label>
                   <input type="number" step="0.01" required value={ccPayment.amount} onChange={e => setCcPayment({...ccPayment, amount: e.target.value})} />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary w-full h-14 font-black uppercase text-black disabled:opacity-50">
                   {loading ? <Loader2 className="animate-spin" /> : 'Process Payment'}
                </button>
              </form>
            )}

            {modalType === 'transfer' && (
              <form onSubmit={async (e) => { e.preventDefault(); setLoading(true); const {error} = await transferFunds(selectedAccount.id, transfer.toId, transfer.amount); setLoading(false); if(error) setError(error.message); else { setIsModalOpen(false); setTransfer({toId: '', amount: 0}); } }} className="space-y-6">
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-4">
                   <ArrowRightLeft className="text-primary" />
                   <div>
                     <p className="text-sm font-bold text-primary">Funds Transfer</p>
                     <p className="text-[10px] text-text-muted uppercase tracking-tight font-black">Moving assets between wallets</p>
                   </div>
                </div>
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">Transfer To</label>
                  <SearchableSelect 
                    options={accounts.filter(a => a.id !== selectedAccount.id).map(acc => ({ id: acc.id, name: acc.name }))}
                    value={transfer.toId}
                    onChange={(val) => setTransfer({...transfer, toId: val})}
                    placeholder="Search Target Wallet..."
                  />
                </div>
                <div>
                   <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">Amount</label>
                   <input type="number" step="0.01" required value={transfer.amount} onChange={e => setTransfer({...transfer, amount: e.target.value})} />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary w-full h-14 font-black uppercase text-black disabled:opacity-50">
                   {loading ? <Loader2 className="animate-spin" /> : 'Confirm Transfer'}
                </button>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AccountManager;
