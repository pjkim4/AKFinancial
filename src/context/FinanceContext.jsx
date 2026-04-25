import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { translations, useTranslation } from '../lib/translations';

const FinanceContext = createContext();

export const useFinance = () => useContext(FinanceContext);

export const FinanceProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [frequentPayments, setFrequentPayments] = useState([]);
  const [recurringSchedules, setRecurringSchedules] = useState([]);
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [availableHouseholds, setAvailableHouseholds] = useState([]); 
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [currentHouseholdId, setCurrentHouseholdId] = useState(() => {
    const saved = localStorage.getItem('finance_current_household_id');
    console.log("[WORKSPACE] Initial ID from localStorage:", saved);
    return saved || null;
  }); 
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('finance_language') || 'en';
  });
  const t = useTranslation(language);
  const [showLogModal, setShowLogModal] = useState(false);

  const [syncError, setSyncError] = useState(null);

  
  // Track the current sync request to prevent race conditions
  const syncVersionRef = React.useRef(0);

  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('finance_preferences');
    const defaultPrefs = { 
      hideBalances: true,
      showInstantMove: true,
      showMonthlyTrend: true,
      showExpenseDistribution: true,
      customCategories: { income: [], expense: [] },
      customRoles: []
    };
    return saved ? { ...defaultPrefs, ...JSON.parse(saved) } : defaultPrefs;


  });

  useEffect(() => {
    localStorage.setItem('finance_preferences', JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      setLoading(false);
      return;
    }

    // Check initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) console.error('Auth session retrieval error:', error.message);
        setSession(session);
        setUser(session?.user ?? null);
        // If no user is found, explicitly set loading to false to show login screen
        if (!session?.user) {
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Unexpected auth initialization error:', err);
        setLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setLoading(false);
      } else {
        // If we have a session but it's been loading too long, force it off
        setTimeout(() => setLoading(false), 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('finance_language', language);
  }, [language]);

  useEffect(() => {
    if (user) {

      // Default to my own account as the first household
      if (!currentHouseholdId) {
        setCurrentHouseholdId(user.id);
      }
      fetchProfile();
      fetchHouseholds();
      fetchPendingInvitations();
      fetchSentInvitations();
    } else {
      setAccounts([]);
      setTransactions([]);
      setFrequentPayments([]);
      setRecurringSchedules([]);
      setHouseholdMembers([]);
      setAvailableHouseholds([]);
      setCurrentHouseholdId(null);
      setProfile(null);
      setLoading(false);
    }
  }, [user]);



  const fetchHouseholds = async () => {
    if (!user) return;
    try {
      // 1. My own household
      const myHousehold = { id: user.id, name: 'Personal Account', role: 'Admin' };
      
      // 2. Fetch shared households (requires invitations table)
      const userEmail = user.email.toLowerCase().trim();
      console.log('[AUTH] Fetching households for:', userEmail);

      const { data, error } = await supabase
        .from('household_invitations')
        .select(`
          household_id, 
          status
        `)
        .eq('invitee_email', userEmail)
        .eq('status', 'accepted');
      
      if (error) {
        if (error.code === '42P01') {
          setAvailableHouseholds([myHousehold]);
          return;
        }
        throw error;
      }

      // 3. For each accepted invitation, fetch the household name (username of the owner)
      const sharedHouseholds = [];
      const seenHouseholdIds = new Set([user.id]); // Initialize with user's own ID
      
      if (data && data.length > 0) {
        for (const inv of data) {
          // Skip if we've already processed this household or if it's the personal account
          if (seenHouseholdIds.has(inv.household_id)) continue;
          seenHouseholdIds.add(inv.household_id);

          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', inv.household_id)
            .single();
          
          sharedHouseholds.push({
            id: inv.household_id,
            name: profileData?.username ? `${profileData.username}'s Household` : `Household #${inv.household_id?.slice(0, 4)}`,
            role: 'Member'
          });
        }
      }

      const formattedHouseholds = [myHousehold, ...sharedHouseholds];
      console.log('[AUTH] Unique households found:', formattedHouseholds.length);
      setAvailableHouseholds(formattedHouseholds);
    } catch (err) {
      console.error('[AUTH] Error fetching households:', err.message);
      // Fallback to just personal account
      if (user) {
        setAvailableHouseholds([{ id: user.id, name: 'Personal Account', role: 'Admin' }]);
      }
    }
  };

  const fetchPendingInvitations = async () => {
    if (!user) return;
    try {
      const userEmail = user.email.toLowerCase().trim();
      console.log('[AUTH] Searching for pending invites for:', userEmail);
      
      const { data, error } = await supabase
        .from('household_invitations')
        .select('*')
        .eq('invitee_email', userEmail)
        .eq('status', 'pending');
      
      if (error) {
        if (error.code === '42P01') return;
        console.error('[AUTH] Database error fetching invites:', error.code, error.message);
        return;
      }
      
      console.log('[AUTH] Pending invites found:', data?.length || 0);
      setPendingInvitations(data || []);
    } catch (err) {
      console.error('[AUTH] Unexpected error fetching pending invites:', err.message);
    }
  };

  const respondToInvitation = async (invitationId, status) => {
    try {
      console.log(`[AUTH] Responding to invitation ${invitationId} with status: ${status}`);
      const { error } = await supabase
        .from('household_invitations')
        .update({ status })
        .eq('id', invitationId);
      
      if (error) throw error;
      
      // Refresh households and pending list
      await fetchHouseholds();
      await fetchPendingInvitations();
      console.log('[AUTH] Household lists refreshed successfully');
      return { success: true };
    } catch (err) {
      console.error('[AUTH] Error responding to invitation:', err.message);
      return { error: err };
    }
  };

  const fetchSentInvitations = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('household_invitations')
        .select('*')
        .eq('inviter_id', user.id);
      
      if (error) {
        if (error.code === '42P01') return;
        throw error;
      }
      setSentInvitations(data || []);
    } catch (err) {
      console.error('[AUTH] Error fetching sent invites:', err.message);
    }
  };

  const revokeInvitation = async (id) => {
    try {
      const { error } = await supabase
        .from('household_invitations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setSentInvitations(prev => prev.filter(inv => inv.id !== id));
      return { success: true };
    } catch (err) {
      return { error: err };
    }
  };

  const fetchHouseholdMembers = async (targetId) => {
    if (!user || !targetId) return;
    try {
      console.log('[SYNC] Fetching members for household:', targetId);
      const { data, error } = await supabase
        .from('household_members')
        .select('*')
        .eq('user_id', targetId);
      
      if (error) {
        if (error.code === '42P01') {
          const local = localStorage.getItem('finance_household_members');
          setHouseholdMembers(local ? JSON.parse(local) : []);
          return;
        }
        throw error;
      }
      setHouseholdMembers(data || []);
    } catch (err) {
      console.error('[SYNC] Error fetching members:', err.message);
    }
  };


  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error.message);
    }
  };

  const fetchFrequentPayments = async (targetId) => {
    if (!user || !targetId) return;
    try {
      const { data, error } = await supabase
        .from('frequent_payments')
        .select('*')
        .eq('user_id', targetId);
      
      if (error) throw error;
      
      // Parse fallbacks (TYPE:Income|ACC:id|CAT:Salary or ACC:id|CAT:Food)
      const parsedData = (data || []).map(item => {
        let { category, type, account_id } = item;
        
        // If the category contains encoded metadata
        if (category?.includes('|') && (category.startsWith('TYPE:') || category.includes('ACC:'))) {
          const parts = category.split('|');
          
          const typePart = parts.find(p => p.startsWith('TYPE:'));
          const accPart = parts.find(p => p.startsWith('ACC:'));
          const catPart = parts.find(p => p.startsWith('CAT:'));

          if (typePart && !type) type = typePart.replace('TYPE:', '');
          if (accPart && !account_id) account_id = accPart.replace('ACC:', '');
          if (catPart) category = catPart.replace('CAT:', '');
        }

        return { ...item, type: type || 'Expense', account_id, category };
      });


      setFrequentPayments(parsedData);
    } catch (err) {
      console.error('[SYNC] Error fetching shortcuts:', err.message);
    }
  };



  const fetchRecurringSchedules = async (targetId) => {
    if (!user || !targetId) return;
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', targetId)
        .order('created_at');
      
      if (error) throw error;
      setRecurringSchedules(data || []);
      if (data && data.length > 0) {
        processRecurringTransactions(data, targetId);
      }
    } catch (err) {
      console.error('[SYNC] Error fetching schedules:', err.message);
    }
  };


  const clearAllData = () => {
    setAccounts([]);
    setTransactions([]);
    setFrequentPayments([]);
    setRecurringSchedules([]);
    setHouseholdMembers([]);
    setSyncError(null);
  };

  const fetchData = async (targetId) => {
    if (!user || !targetId) return;
    
    // Increment version to ignore previous requests
    const currentVersion = ++syncVersionRef.current;
    
    setLoading(true);
    clearAllData();

    try {
      console.log(`[SYNC] [v${currentVersion}] Starting data sync for ID:`, targetId);

      const [accountsRes, transactionsRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', targetId)
          .order('name'),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', targetId)
          .order('date', { ascending: false })
          .limit(100)
      ]);
      
      // If a newer request has started, ignore this one
      if (currentVersion !== syncVersionRef.current) {
        console.log(`[SYNC] [v${currentVersion}] Ignoring stale response`);
        return;
      }

      if (accountsRes.error) throw accountsRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      setAccounts(accountsRes.data || []);
      setTransactions(transactionsRes.data || []);

    } catch (err) {
      if (currentVersion === syncVersionRef.current) {
        setSyncError(err.message);
      }

    } finally {
      if (currentVersion === syncVersionRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (user && currentHouseholdId) {
      fetchData(currentHouseholdId);
      fetchFrequentPayments(currentHouseholdId);
      fetchRecurringSchedules(currentHouseholdId);
      fetchHouseholdMembers(currentHouseholdId);
    }
  }, [currentHouseholdId, user]);

  useEffect(() => {
    if (currentHouseholdId) {
      localStorage.setItem('finance_current_household_id', currentHouseholdId);
    }
  }, [currentHouseholdId]);




  const addTransaction = async (transaction) => {
    try {
      const { member_id, ...txData } = transaction;
      let finalTx = { ...txData, user_id: currentHouseholdId || user.id };
      
      // Try with member_id if provided
      if (member_id) {
        finalTx.member_id = member_id;
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert([finalTx])
        .select();

      if (error) {
        // Fallback: If member_id column is missing in DB
        if (member_id && (error.code === '42703' || error.message?.includes("'member_id' column") || error.message?.includes('column "member_id"'))) {

          const member = householdMembers.find(m => m.id === member_id);
          const memberPrefix = member ? `[${member.name}] ` : '';
          const fallbackTx = { 
            ...txData, 
            description: memberPrefix + txData.description,
            user_id: currentHouseholdId || user.id 
          };
          
          const { data: retryData, error: retryError } = await supabase
            .from('transactions')
            .insert([fallbackTx])
            .select();
          
          if (retryError) throw retryError;
          if (!retryData || retryData.length === 0) throw new Error('Transaction created (fallback) but no data returned');
          
          // Re-attach member_id for local UI state
          const localTx = { ...retryData[0], member_id: member_id };
          setTransactions(prev => [localTx, ...prev]);
          return updateAccountBalancesAfterTx(localTx, 'add');

        }
        throw error;
      }

      if (!data || data.length === 0) throw new Error('Transaction created but no data returned from database');
      setTransactions(prev => [data[0], ...prev]);

      return updateAccountBalancesAfterTx(data[0], 'add');
    } catch (error) {
      console.error('Error adding transaction:', error.message);
      return { error };
    }
  };

  const updateAccountBalancesAfterTx = async (transaction, mode = 'add', oldTx = null) => {
    try {
      const account = accounts.find(acc => acc.id === transaction.account_id);
      if (account) {
        let amountChange = 0;
        if (mode === 'add') {
          const txAmount = Number(transaction.amount);
          amountChange = transaction.type === 'Income' ? txAmount : -txAmount;
        } else if (mode === 'update' && oldTx) {
          // Reverse old amount
          amountChange += oldTx.type === 'Income' ? -Number(oldTx.amount) : Number(oldTx.amount);
          // Apply new amount
          amountChange += transaction.type === 'Income' ? Number(transaction.amount) : -Number(transaction.amount);
        } else if (mode === 'delete') {
          const txAmount = Number(transaction.amount);
          amountChange = transaction.type === 'Income' ? -txAmount : txAmount;
        }

        if (account.type === 'Debit Card' && account.parent_account_id) {
          const parent = accounts.find(acc => acc.id === account.parent_account_id);
          if (parent) {
            const newParentBalance = Number((Number(parent.balance) + amountChange).toFixed(2));
            await supabase.from('accounts').update({ balance: newParentBalance }).eq('id', parent.id);
            setAccounts(prev => prev.map(acc => acc.id === parent.id ? { ...acc, balance: newParentBalance } : acc));
          }
        } else {
          const newBalance = Number((Number(account.balance) + amountChange).toFixed(2));
          await supabase.from('accounts').update({ balance: newBalance }).eq('id', account.id);
          setAccounts(prev => prev.map(acc => acc.id === account.id ? { ...acc, balance: newBalance } : acc));
        }
      }
      return { success: true };
    } catch (err) {
      console.error('Error updating balances:', err.message);
      return { error: err };
    }
  };

  const updateTransaction = async (id, updates) => {
    try {
      const oldTx = transactions.find(t => t.id === id);
      if (!oldTx) throw new Error('Original transaction not found');

      const { member_id, ...updateData } = updates;
      let finalUpdates = { ...updateData };
      if (member_id) finalUpdates.member_id = member_id;

      const { data, error } = await supabase
        .from('transactions')
        .update(finalUpdates)
        .eq('id', id)
        .select();

      if (error) {
        // Fallback for member_id column
        if (member_id && (error.code === '42703' || error.message?.includes("'member_id' column") || error.message?.includes('column "member_id"'))) {

          const member = householdMembers.find(m => m.id === member_id);
          const memberPrefix = member ? `[${member.name}] ` : '';
          
          // Clean old prefix if it exists to avoid duplication
          let cleanDesc = updateData.description || oldTx.description;
          cleanDesc = cleanDesc.replace(/^\[.*?\]\s*/, '');
          
          const fallbackUpdates = { 
            ...updateData, 
            description: memberPrefix + cleanDesc 
          };
          
          const { data: retryData, error: retryError } = await supabase
            .from('transactions')
            .update(fallbackUpdates)
            .eq('id', id)
            .select();
          
          if (retryError) throw retryError;
          if (!retryData || retryData.length === 0) throw new Error('Update failed');
          
          // Re-attach member_id for local UI state
          const localTx = { ...retryData[0], member_id: member_id };
          setTransactions(prev => prev.map(t => t.id === id ? localTx : t));
          return updateAccountBalancesAfterTx(localTx, 'update', oldTx);

        }
        throw error;
      }

      if (!data || data.length === 0) throw new Error('No data returned from update');
      setTransactions(prev => prev.map(t => t.id === id ? data[0] : t));
      return updateAccountBalancesAfterTx(data[0], 'update', oldTx);
    } catch (error) {
      console.error('Error updating transaction:', error.message);
      return { error };
    }
  };

  const deleteTransaction = async (id) => {
    console.log('[DEBUG] Starting deleteTransaction for ID:', id);
    try {
      const tx = transactions.find(t => t.id === id);
      if (!tx) throw new Error('Transaction not found');

      console.log('[DEBUG] Sending DELETE to Supabase...');
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) {
        console.error('[DEBUG] Supabase DELETE Error:', error);
        throw error;
      }
      console.log('[DEBUG] Supabase DELETE Success');

      // Reverse balance
      const account = accounts.find(acc => acc.id === tx.account_id);
      if (account) {
        const txAmount = Number(tx.amount);
        const reversalChange = tx.type === 'Income' ? -txAmount : txAmount;
        console.log(`[DEBUG] Deletion Log: Account=${account.name}, Type=${account.type}, Reversal=${reversalChange}`);
        
        // Sync balance logic (Reversal)
        if (account.type === 'Debit Card' && account.parent_account_id) {
          const parent = accounts.find(acc => acc.id === account.parent_account_id);
          if (parent) {
             const newParentBalance = Number((Number(parent.balance) + reversalChange).toFixed(2));
             console.log(`[DEBUG] Reversing Parent: ${parent.balance} -> ${newParentBalance}`);
             await supabase.from('accounts').update({ balance: newParentBalance }).eq('id', parent.id);
             setAccounts(prev => prev.map(acc => acc.id === parent.id ? { ...acc, balance: newParentBalance } : acc));
          } else {
             console.warn('[DEBUG] Parent for deletion reversal not found');
          }
        } else {
          const newBalance = Number((Number(account.balance) + reversalChange).toFixed(2));
          console.log(`[DEBUG] Reversing Standard Account: ${account.balance} -> ${newBalance}`);
          const { error: accError } = await supabase.from('accounts').update({ balance: newBalance }).eq('id', account.id);
          if (accError) throw accError;
          setAccounts(prev => prev.map(acc => acc.id === account.id ? { ...acc, balance: newBalance } : acc));
        }
      }

      setTransactions(prev => prev.filter(t => t.id !== id));
      console.log('[DEBUG] Transactions state updated locally. Deletion complete.');
      return { success: true };
    } catch (error) {
      console.error('[DEBUG] deleteTransaction CATCH:', error);
      return { error };
    }
  };

  const deleteTransactions = async (ids) => {
    console.log('[DEBUG] Bulk Deleting IDs:', ids);
    try {
      const targets = transactions.filter(t => ids.includes(t.id));
      if (targets.length === 0) return { success: true };

      // 1. Group by Account and calculate net reversal
      const updatesByAccount = {};
      targets.forEach(tx => {
        const txAmount = Number(tx.amount);
        const change = tx.type === 'Income' ? -txAmount : txAmount;
        updatesByAccount[tx.account_id] = (updatesByAccount[tx.account_id] || 0) + change;
      });

      // 2. Batch Delete from Supabase
      const { error: delError } = await supabase.from('transactions').delete().in('id', ids);
      if (delError) throw delError;

      // 3. Update account balances (Sequential but efficient)
      for (const accountId of Object.keys(updatesByAccount)) {
        const account = accounts.find(acc => acc.id === accountId);
        if (!account) continue;

        const netChange = updatesByAccount[accountId];
        
        // Handle Debit Card / Parent logic
        if (account.type === 'Debit Card' && account.parent_account_id) {
          const parent = accounts.find(acc => acc.id === account.parent_account_id);
          if (parent) {
             const newParentBalance = Number((Number(parent.balance) + netChange).toFixed(2));
             await supabase.from('accounts').update({ balance: newParentBalance }).eq('id', parent.id);
             setAccounts(prev => prev.map(acc => acc.id === parent.id ? { ...acc, balance: newParentBalance } : acc));
          }
        } else {
          const newBalance = Number((Number(account.balance) + netChange).toFixed(2));
          await supabase.from('accounts').update({ balance: newBalance }).eq('id', account.id);
          setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, balance: newBalance } : acc));
        }
      }

      // 4. Update local state
      setTransactions(prev => prev.filter(tx => !ids.includes(tx.id)));
      return { success: true };
    } catch (error) {
      console.error('[DEBUG] deleteTransactions ERROR:', error);
      return { error };
    }
  };

  const transferFunds = async (fromId, toId, amount) => {
    console.log('[DEBUG] Starting transferFunds:', { fromId, toId, amount });
    try {
      const parsedAmount = Number(amount);
      const fromAcc = accounts.find(a => a.id === fromId);
      const toAcc = accounts.find(a => a.id === toId);

      if (!fromAcc || !toAcc) throw new Error('Source or destination account not found');

      console.log('[DEBUG] Recording source deduction...');
      const result1 = await addTransaction({
        amount: parsedAmount,
        type: 'Expense',
        description: `Transfer to ${toAcc.name}`,
        account_id: fromId,
        category: 'Transfer',
        date: new Date().toISOString().split('T')[0]
      });
      if (result1.error) throw result1.error;

      console.log('[DEBUG] Recording target addition...');
      const result2 = await addTransaction({
        amount: parsedAmount,
        type: 'Income',
        description: `Transfer from ${fromAcc.name}`,
        account_id: toId,
        category: 'Income',
        date: new Date().toISOString().split('T')[0]
      });
      if (result2.error) throw result2.error;

      console.log('[DEBUG] Transfer complete');
      return { success: true };
    } catch (error) {
      console.error('[DEBUG] transferFunds Error:', error);
      return { error };
    }
  };

  const adjustBalance = async (accountId, newBalance, reason) => {
    try {
      const account = accounts.find(acc => acc.id === accountId);
      const diff = newBalance - account.balance;

      // Create adjustment record
      await addTransaction({
        amount: Math.abs(diff),
        type: diff >= 0 ? 'Income' : 'Expense',
        description: `Adjustment: ${reason}`,
        account_id: accountId,
        category: 'Adjustment',
        date: new Date().toISOString().split('T')[0]
      });

      const roundedBalance = Number(newBalance.toFixed(2));
      const { error } = await supabase
        .from('accounts')
        .update({ balance: roundedBalance })
        .eq('id', accountId);

      if (error) throw error;
      setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, balance: roundedBalance } : acc));
      return { success: true };
    } catch (error) {
      console.error('Error adjusting balance:', error.message);
      return { error };
    }
  };

  const createAccount = async (account) => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert([{
          ...account,
          user_id: currentHouseholdId || user.id
        }])
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Account created but no data returned from database');
      setAccounts(prev => [...prev, data[0]]);
      return { success: true };
    } catch (error) {
      return { error };
    }

  };

  const updateAccount = async (accountId, updates) => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', accountId)
        .select();

      if (error) throw error;
      setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, ...data[0] } : acc));
      return { success: true };
    } catch (error) {
      console.error('Error updating account:', error.message);
      return { error };
    }
  };

  const deleteAccount = async (accountId) => {
    console.log('[DEBUG] Starting deleteAccount for ID:', accountId);
    try {
      // 1. Delete associated transactions first
      console.log('[DEBUG] Step 1: Deleting associated transactions...');
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .eq('account_id', accountId);
      
      if (txError) {
        console.error('[DEBUG] Transaction deletion failed:', txError);
        throw txError;
      }
      console.log('[DEBUG] Transactions cleared.');

      // 2. Delete the account
      console.log('[DEBUG] Step 2: Deleting account from database...');
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);

      if (error) {
        console.error('[DEBUG] Account deletion failed:', error);
        throw error;
      }
      console.log('[DEBUG] Database account deletion SUCCESS.');
      
      console.log('[DEBUG] Step 3: Updating local state...');
      setAccounts(prev => prev.filter(acc => acc.id !== accountId));
      setTransactions(prev => prev.filter(tx => tx.account_id !== accountId));
      console.log('[DEBUG] Local state updated.');
      return { success: true };
    } catch (error) {
      console.error('[DEBUG] deleteAccount CATCH:', error);
      return { error };
    }
  };

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signup = async (email, password, username) => {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { username }
      }
    });
    return { error };
  };

  const updateProfile = async (updates) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      setProfile(prev => ({ ...prev, ...updates }));
      return { success: true };
    } catch (error) {
      return { error };
    }
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  const sendPasswordResetEmail = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    return { error };
  };

  const addFrequentPayment = async (item) => {
    try {
      // Try normal insert first
      const { data, error } = await supabase
        .from('frequent_payments')
        .insert([{ ...item, user_id: currentHouseholdId || user.id }])
        .select();
      
      if (error) {
        // Fallback for missing columns (type or account_id)
        if (error.code === '42703' || error.message?.includes('column')) {
          console.warn('[DB] Missing shortcut columns, using category encoding fallback');
          
          const { type, account_id, category, ...rest } = item;
          // Encode type and account_id into category string
          // Format: TYPE:Income|ACC:uuid|CAT:Salary
          let encodedCategory = `TYPE:${type || 'Expense'}|ACC:${account_id || ''}|CAT:${category}`;
          
          const fallbackItem = { 
            ...rest, 
            category: encodedCategory,
            user_id: currentHouseholdId || user.id 
          };

          const { data: retryData, error: retryError } = await supabase
            .from('frequent_payments')
            .insert([fallbackItem])
            .select();
          
          if (retryError) throw retryError;
          
          // Manually parse back for local state
          const localItem = { ...retryData[0], type: type || 'Expense', account_id, category };
          setFrequentPayments(prev => [...prev, localItem]);
          return { success: true };
        }
        throw error;
      }
      
      if (!data || data.length === 0) throw new Error('Shortcut created but no data returned from database');
      setFrequentPayments(prev => [...prev, data[0]]);
      return { success: true };
    } catch (error) {
      console.error('Error adding shortcut:', error.message);
      return { error };
    }
  };


  const deleteFrequentPayment = async (id) => {
    try {
      const { error } = await supabase.from('frequent_payments').delete().eq('id', id);
      if (error) throw error;
      setFrequentPayments(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (error) {
      return { error };
    }
  };

  // Helper: Parse YYYY-MM-DD as Local Midnight
  const parseLocalISO = (isoStr) => {
    if (!isoStr) return null;
    const [year, month, day] = isoStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper: Format Date as Local YYYY-MM-DD
  const toLocalISO = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const processRecurringTransactions = async (schedules, targetId) => {
    // Current date at local midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let updatedAny = false;

    for (const schedule of schedules) {
      if (schedule.status !== 'Active') continue;

      const startDate = parseLocalISO(schedule.start_date);
      const endDate = schedule.end_date ? parseLocalISO(schedule.end_date) : null;
      let lastRun = schedule.last_run_date ? parseLocalISO(schedule.last_run_date) : null;

      // Determine the first date to check
      let checkDate = lastRun ? getNextOccurrence(lastRun, schedule.frequency) : startDate;
      if (!checkDate) continue; 
      checkDate.setHours(0, 0, 0, 0);

      const skipDates = Array.isArray(schedule.skip_dates) ? schedule.skip_dates : [];
      let newLastRun = schedule.last_run_date;
      let logsCreated = 0;

      // Catch-up loop
      while (checkDate <= today) {
        // Stop if we past the end date
        if (endDate && checkDate > endDate) break;

        const dateStr = toLocalISO(checkDate);
        
        // Skip if date is in the skip list
        if (!skipDates.includes(dateStr)) {
          console.log(`[RECURRING] Logging: ${schedule.description} on ${dateStr}`);
          await addTransaction({
            amount: schedule.amount,
            type: schedule.type,
            description: schedule.description,
            account_id: schedule.account_id,
            category: schedule.category,
            date: dateStr
          });
          logsCreated++;
        }

        newLastRun = dateStr;
        checkDate = getNextOccurrence(checkDate, schedule.frequency);
        checkDate.setHours(0, 0, 0, 0);
      }

      // Update schedule record if we moved the needle or reached the end
      const isExpired = endDate && parseLocalISO(newLastRun) >= endDate;
      if (logsCreated > 0 || isExpired) {
        const updates = { 
          last_run_date: newLastRun,
          status: isExpired ? 'Completed' : schedule.status
        };
        
        await supabase.from('recurring_transactions').update(updates).eq('id', schedule.id);
        updatedAny = true;
      }
    }

    if (updatedAny && targetId) {
      // Refresh schedules and transactions to reflect changes
      fetchData(targetId); // This gets updated transactions/accounts
      const { data } = await supabase.from('recurring_transactions').select('*').eq('user_id', targetId).order('created_at');
      setRecurringSchedules(data || []);
    }
  };


  const getNextOccurrence = (date, frequency) => {
    const next = new Date(date);
    const dayOfMonth = date.getDate();
    
    switch (frequency) {
      case 'Weekly': next.setDate(next.getDate() + 7); break;
      case 'Bi-weekly': next.setDate(next.getDate() + 14); break;
      case 'Monthly': 
        next.setMonth(next.getMonth() + 1); 
        // Logic: Clamping. (e.g. Jan 31 -> Feb 28)
        if (next.getDate() < dayOfMonth) next.setDate(0);
        break;
      case 'Monthly (End of Month)':
        next.setMonth(next.getMonth() + 2, 0); // Goes to end of next month
        break;
      case 'Quarterly': 
        next.setMonth(next.getMonth() + 3); 
        if (next.getDate() < dayOfMonth) next.setDate(0);
        break;
      case 'Semi-Yearly': 
        next.setMonth(next.getMonth() + 6); 
        if (next.getDate() < dayOfMonth) next.setDate(0);
        break;
      case 'Yearly': 
        next.setFullYear(next.getFullYear() + 1); 
        if (next.getDate() < dayOfMonth) next.setDate(0);
        break;
      case 'Semi-Monthly': 
        if (next.getDate() < 15) {
          next.setDate(15);
        } else {
          next.setMonth(next.getMonth() + 1);
          next.setDate(1);
        }
        break;
      default: 
        next.setMonth(next.getMonth() + 1);
        if (next.getDate() < dayOfMonth) next.setDate(0);
    }
    return next;
  };

  const calculateNextPaymentDate = (schedule) => {
    if (!schedule || schedule.status !== 'Active') return null;
    
    let current = schedule.last_run_date ? parseLocalISO(schedule.last_run_date) : parseLocalISO(schedule.start_date);
    if (!current) return null;

    // If it has run before, we start looking at the NEXT occurrence.
    // If it hasn't run, the START date is the first candidate.
    if (schedule.last_run_date) {
      current = getNextOccurrence(current, schedule.frequency);
    }
    
    const skipDates = Array.isArray(schedule.skip_dates) ? schedule.skip_dates : [];
    
    // Find the first unskipped date
    let attempts = 0;
    while (skipDates.includes(toLocalISO(current)) && attempts < 50) {
      current = getNextOccurrence(current, schedule.frequency);
      attempts++;
    }
    
    return toLocalISO(current);
  };

  const addRecurringSchedule = async (schedule) => {
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .insert([{ ...schedule, user_id: currentHouseholdId || user.id }])
        .select();
      if (error) throw error;
      const targetId = currentHouseholdId || user.id;
      setRecurringSchedules(prev => [...prev, data[0]]);
      processRecurringTransactions([data[0]], targetId); // Check immediately
      return { success: true };
    } catch (error) {
      return { error };
    }
  };

  const deleteRecurringSchedule = async (id) => {
    try {
      const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
      if (error) throw error;
      setRecurringSchedules(prev => prev.filter(s => s.id !== id));
      return { success: true };
    } catch (error) {
      return { error };
    }
  };

  const updateRecurringSchedule = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .update(updates)
        .eq('id', id)
        .select();
      if (error) throw error;
      setRecurringSchedules(prev => prev.map(s => s.id === id ? data[0] : s));
      // Re-process just in case dates shifted back
      if (updates.start_date || updates.frequency || updates.status === 'Active') {
        const targetId = currentHouseholdId || user.id;
        processRecurringTransactions([data[0]], targetId);
      }
      return { success: true };
    } catch (error) {
      return { error };
    }
  };

  const skipNextOccurrence = async (schedule) => {
    try {
      const lastRun = schedule.last_run_date ? parseLocalISO(schedule.last_run_date) : parseLocalISO(schedule.start_date);
      const nextDate = getNextOccurrence(lastRun, schedule.frequency);
      const dateStr = toLocalISO(nextDate);
      
      const newSkipDates = [...(schedule.skip_dates || []), dateStr];
      const { data, error } = await supabase
        .from('recurring_transactions')
        .update({ skip_dates: newSkipDates })
        .eq('id', schedule.id)
        .select();
        
      if (error) throw error;
      setRecurringSchedules(prev => prev.map(s => s.id === schedule.id ? data[0] : s));
      return { success: true };
    } catch (error) {
      return { error };
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      
      // Clear all state
      setUser(null);
      setProfile(null);
      setSession(null);
      setAccounts([]);
      setTransactions([]);
      setAvailableHouseholds([]);
      setCurrentHouseholdId(null);
      localStorage.removeItem('finance_current_household_id');
      
      // Force a clean reload to clear any remaining in-memory states
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err.message);
      setLoading(false);
    }
  };

  const addHouseholdMember = async (member) => {
    try {
      const targetId = currentHouseholdId || user.id;
      const { data, error } = await supabase
        .from('household_members')
        .insert([{ ...member, user_id: targetId }])
        .select();
      
      if (error) {
        // Fallback 1: If table is missing entirely
        if (error.code === '42P01' || error.message?.includes('not find the table')) {
          const newM = { ...member, id: Date.now() };
          const updated = [...householdMembers, newM];
          setHouseholdMembers(updated);
          localStorage.setItem('finance_household_members', JSON.stringify(updated));
          return { success: true, warning: 'Stored locally (DB table missing)' };
        }
        
        // Fallback 2: If 'role' column is missing (Schema mismatch)
        if (error.message?.includes("'role' column") || error.code === '42703') {
          console.warn('[DB] Fallback: role column missing, retrying without role');
          const { role, ...memberWithoutRole } = member;
          const { data: retryData, error: retryError } = await supabase
            .from('household_members')
            .insert([{ ...memberWithoutRole, user_id: targetId }])
            .select();
          
          if (retryError) throw retryError;
          if (!retryData || retryData.length === 0) throw new Error('Member created (fallback) but no data returned');
          
          // Still add the role to the local state so UI looks correct
          const memberWithRole = { ...retryData[0], role };
          setHouseholdMembers(prev => [...prev, memberWithRole]);
          return { success: true, warning: 'Stored without role (DB update needed)' };
        }
        
        throw error;
      }
      setHouseholdMembers(prev => [...prev, data[0]]);
      return { success: true };
    } catch (error) {
      console.error('Error adding household member:', error.message);
      return { error };
    }
  };


  const updateHouseholdMember = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('household_members')
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) {
        // Fallback 1: Missing Table
        if (error.code === '42P01' || error.message?.includes('not find the table')) {
          const updated = householdMembers.map(m => m.id === id ? { ...m, ...updates } : m);
          setHouseholdMembers(updated);
          localStorage.setItem('finance_household_members', JSON.stringify(updated));
          return { success: true };
        }
        
        // Fallback 2: Missing Role column
        if (error.message?.includes("'role' column") || error.code === '42703') {
          console.warn('[DB] Fallback: role column missing on update, retrying without role');
          const { role, ...updatesWithoutRole } = updates;
          const { data: retryData, error: retryError } = await supabase
            .from('household_members')
            .update(updatesWithoutRole)
            .eq('id', id)
            .select();
          
          if (retryError) throw retryError;
          const finalData = { ...retryData[0], role: role || householdMembers.find(m => m.id === id)?.role };
          setHouseholdMembers(prev => prev.map(m => m.id === id ? finalData : m));
          return { success: true };
        }

        throw error;
      }
      setHouseholdMembers(prev => prev.map(m => m.id === id ? data[0] : m));
      return { success: true };
    } catch (error) {
      console.error('Error updating household member:', error.message);
      return { error };
    }
  };


  const inviteMember = async (email, householdId) => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      console.log('Inviting:', trimmedEmail, 'to household:', householdId);
      const { data, error } = await supabase
        .from('household_invitations')
        .insert([{ 
          household_id: householdId,
          inviter_id: user.id,
          invitee_email: trimmedEmail,
          status: 'pending'
        }])
        .select();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { error };
    }
  };

  const deleteHouseholdMember = async (id) => {
    try {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('id', id);
      
      if (error) {
        if (error.code === '42P01' || error.message?.includes('not find the table')) {
          const updated = householdMembers.filter(m => m.id !== id);
          setHouseholdMembers(updated);
          localStorage.setItem('finance_household_members', JSON.stringify(updated));
          return { success: true };
        }
        throw error;
      }
      setHouseholdMembers(prev => prev.filter(m => m.id !== id));
      return { success: true };
    } catch (error) {
      return { error };
    }
  };

  return (
    <FinanceContext.Provider value={{
      user, profile, session, accounts, transactions, frequentPayments, recurringSchedules, householdMembers, 
      availableHouseholds, pendingInvitations, sentInvitations, currentHouseholdId, setCurrentHouseholdId, loading,
      addTransaction, updateTransaction, deleteTransaction, deleteTransactions,
      transferFunds, adjustBalance, createAccount, updateAccount, deleteAccount,
      addFrequentPayment, deleteFrequentPayment,
      addRecurringSchedule, updateRecurringSchedule, deleteRecurringSchedule, skipNextOccurrence,
      addHouseholdMember, updateHouseholdMember, deleteHouseholdMember, inviteMember, revokeInvitation, respondToInvitation,
      calculateNextPaymentDate,
      login, signup, logout, fetchData, updateProfile, updatePassword, sendPasswordResetEmail,
      setAccounts,

      preferences,
      updatePreferences: (newPrefs) => setPreferences(prev => ({ ...prev, ...newPrefs })),
      toggleBalances: () => setPreferences(prev => ({ ...prev, hideBalances: !prev.hideBalances })),
      addCustomCategory: (type, name) => {
        setPreferences(prev => {
          const current = prev.customCategories?.[type] || [];
          if (current.some(c => c.id === name)) return prev;
          return {
            ...prev,
            customCategories: {
              ...prev.customCategories,
              [type]: [...current, { id: name, name, isCustom: true }]
            }
          };

        });
      },
      deleteCustomCategory: (type, id) => {
        setPreferences(prev => ({
          ...prev,
          customCategories: {
            ...prev.customCategories,
            [type]: (prev.customCategories?.[type] || []).filter(c => c.id !== id)
          }
        }));
      },
      updateCustomCategory: (type, id, newName) => {
        setPreferences(prev => ({
          ...prev,
          customCategories: {
            ...prev.customCategories,
            [type]: (prev.customCategories?.[type] || []).map(c => 
              c.id === id ? { ...c, name: newName } : c
            )
          }
        }));
      },
      addCustomRole: (name) => {
        setPreferences(prev => ({
          ...prev,
          customRoles: [...(prev.customRoles || []), { id: name, name }]
        }));
      },
      deleteCustomRole: (id) => {
        setPreferences(prev => ({
          ...prev,
          customRoles: (prev.customRoles || []).filter(r => r.id !== id)
        }));
      },
      updateCustomRole: (id, newName) => {
        setPreferences(prev => ({
          ...prev,
          customRoles: (prev.customRoles || []).map(r => r.id === id ? { ...r, name: newName } : r)
        }));
      },


      syncError,
      showLogModal,
      setShowLogModal,
      language,
      setLanguage,
      t
    }}>




      {children}
    </FinanceContext.Provider>
  );
};

