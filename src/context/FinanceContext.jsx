import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
  const [currentHouseholdId, setCurrentHouseholdId] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('finance_preferences');
    return saved ? JSON.parse(saved) : { 
      hideBalances: true,
      showInstantMove: true,
      showMonthlyTrend: true,
      showExpenseDistribution: true
    };
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      // Default to my own account as the first household
      if (!currentHouseholdId) {
        setCurrentHouseholdId(user.id);
      }
      fetchProfile();
      fetchHouseholds();
      fetchPendingInvitations();
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

  // When household changes, re-fetch all data
  useEffect(() => {
    if (user && currentHouseholdId) {
      fetchData();
      fetchFrequentPayments();
      fetchRecurringSchedules();
      fetchHouseholdMembers();
    }
  }, [currentHouseholdId]);

  const fetchHouseholds = async () => {
    try {
      // 1. My own household
      const myHousehold = { id: user.id, name: 'Personal Account', role: 'Admin' };
      
      // 2. Fetch shared households (requires invitations table)
      const { data, error } = await supabase
        .from('household_invitations')
        .select('household_id, profiles!household_id(username)')
        .eq('invitee_email', user.email)
        .eq('status', 'accepted');
      
      if (error) {
        if (error.code === '42P01') {
          setAvailableHouseholds([myHousehold]);
          return;
        }
        throw error;
      }

      const formattedHouseholds = [
        myHousehold,
        ...(data?.map(h => ({
          id: h.household_id,
          name: h.profiles?.username ? `${h.profiles.username}'s Household` : `Household #${h.household_id.slice(0, 4)}`,
          role: 'Member'
        })) || [])
      ];
      setAvailableHouseholds(formattedHouseholds);
    } catch (err) {
      console.error('Error fetching households:', err.message);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const userEmail = user.email.toLowerCase().trim();
      console.log('DEBUG: Searching for invites for:', userEmail);
      
      const { data, error } = await supabase
        .from('household_invitations')
        .select('*')
        .eq('invitee_email', userEmail)
        .eq('status', 'pending');
      
      if (error) {
        console.error('DATABASE ERROR:', error.code, error.message);
        return;
      }
      
      console.log('DEBUG: Raw invites found:', data);
      setPendingInvitations(data || []);
    } catch (err) {
      console.error('Error fetching pending invites:', err.message);
    }
  };

  const respondToInvitation = async (invitationId, status) => {
    try {
      const { error } = await supabase
        .from('household_invitations')
        .update({ status })
        .eq('id', invitationId);
      
      if (error) throw error;
      
      // Refresh households and pending list
      fetchHouseholds();
      fetchPendingInvitations();
      return { success: true };
    } catch (err) {
      return { error: err };
    }
  };

  const fetchHouseholdMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('*')
        .order('name');
      
      if (error) {
        if (error.code === '42P01' || error.message?.includes('not find the table')) {
           const local = localStorage.getItem('finance_household_members');
           setHouseholdMembers(local ? JSON.parse(local) : []);
           return;
        }
        throw error;
      }
      setHouseholdMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error.message);
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

  const fetchFrequentPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('frequent_payments')
        .select('*')
        .order('created_at');
      if (error) throw error;
      setFrequentPayments(data || []);
    } catch (error) {
      console.error('Error fetching shortcuts:', error.message);
    }
  };

  const fetchRecurringSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .order('created_at');
      if (error) throw error;
      setRecurringSchedules(data || []);
      
      // Critical: Process any due transactions after fetching
      if (data && data.length > 0) {
        processRecurringTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching recurring schedules:', error.message);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const targetId = currentHouseholdId || user.id;
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', targetId)
        .order('name');
      
      if (accountsError) throw accountsError;

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', targetId)
        .order('date', { ascending: false });

      if (transactionsError) throw transactionsError;

      setAccounts(accountsData || []);
      setTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (transaction) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          ...transaction,
          user_id: currentHouseholdId || user.id
        }])
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Transaction created but no data returned from database');
      setTransactions(prev => [data[0], ...prev]);

      // Update account balance
      const account = accounts.find(acc => acc.id === transaction.account_id);
      if (account) {
        const txAmount = Number(transaction.amount);
        const amountChange = transaction.type === 'Income' ? txAmount : -txAmount;
        
        // Update balance logic
        console.log(`[DEBUG] Account details: NAME=${account.name}, TYPE=${account.type}, PARENT=${account.parent_account_id}`);
        if (account.type === 'Debit Card' && account.parent_account_id) {
          console.log('[DEBUG] Debit Card Logic: Attempting to update parent...');
          const parent = accounts.find(acc => acc.id === account.parent_account_id);
          if (parent) {
            const newParentBalance = Number((Number(parent.balance) + amountChange).toFixed(2));
            console.log(`[DEBUG] Updating Parent '${parent.name}': ${parent.balance} -> ${newParentBalance}`);
            await supabase.from('accounts').update({ balance: newParentBalance }).eq('id', parent.id);
            setAccounts(prev => prev.map(acc => acc.id === parent.id ? { ...acc, balance: newParentBalance } : acc));
          } else {
            console.warn('[DEBUG] Parent account not found in state!');
          }
        } else {
          console.log('[DEBUG] Standard Logic: Updating primary account...');
          const newBalance = Number((Number(account.balance) + amountChange).toFixed(2));
          console.log(`[DEBUG] Updating Balance: ${account.balance} -> ${newBalance}`);
          await supabase.from('accounts').update({ balance: newBalance }).eq('id', account.id);
          setAccounts(prev => prev.map(acc => acc.id === account.id ? { ...acc, balance: newBalance } : acc));
        }
      }
      return { success: true };
    } catch (error) {
      console.error('Error adding transaction:', error.message);
      return { error };
    }
  };

  const updateTransaction = async (id, updates) => {
    console.log('[DEBUG] Starting updateTransaction for ID:', id);
    try {
      const oldTx = transactions.find(t => t.id === id);
      if (!oldTx) throw new Error('Original transaction not found');

      console.log('[DEBUG] Sending UPDATE to Supabase...');
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) {
        console.error('[DEBUG] Supabase UPDATE Error:', error);
        throw error;
      }
      if (!data || data.length === 0) throw new Error('No data returned from update');
      console.log('[DEBUG] Supabase UPDATE Success:', data[0]);

      // Adjust account balance
      const account = accounts.find(acc => acc.id === oldTx.account_id);
      if (account) {
        let amountChange = 0;
        // Reverse old amount
        amountChange += oldTx.type === 'Income' ? -Number(oldTx.amount) : Number(oldTx.amount);
        // Apply new amount
        amountChange += updates.type === 'Income' ? Number(updates.amount) : -Number(updates.amount);

        // Sync balance logic
        console.log(`[DEBUG] Update Logic: NAME=${account.name}, TYPE=${account.type}, PARENT=${account.parent_account_id}`);
        if (account.type === 'Debit Card' && account.parent_account_id) {
          const parent = accounts.find(acc => acc.id === account.parent_account_id);
          if (parent) {
             const newParentBalance = Number((Number(parent.balance) + amountChange).toFixed(2));
             console.log(`[DEBUG] Syncing Parent: ${parent.balance} -> ${newParentBalance}`);
             await supabase.from('accounts').update({ balance: newParentBalance }).eq('id', parent.id);
             setAccounts(prev => prev.map(acc => acc.id === parent.id ? { ...acc, balance: newParentBalance } : acc));
          } else {
             console.warn('[DEBUG] Parent account not found for update sync');
          }
        } else {
          const newBalance = Number((Number(account.balance) + amountChange).toFixed(2));
          console.log(`[DEBUG] Updating Standard Balance: ${account.balance} -> ${newBalance}`);
          const { error: accError } = await supabase.from('accounts').update({ balance: newBalance }).eq('id', account.id);
          if (accError) throw accError;
          setAccounts(prev => prev.map(acc => acc.id === account.id ? { ...acc, balance: newBalance } : acc));
        }
      }

      setTransactions(prev => prev.map(t => t.id === id ? data[0] : t));
      console.log('[DEBUG] Transactions state updated locally. Update complete.');
      return { success: true };
    } catch (error) {
      console.error('[DEBUG] updateTransaction CATCH:', error);
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
      console.error('Error creating account:', error.message);
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
      const { data, error } = await supabase
        .from('frequent_payments')
        .insert([{ ...item, user_id: currentHouseholdId || user.id }])
        .select();
      
      if (error) {
        // Fallback: If account_id column is missing in DB (Postgres error or PostgREST cache error)
        if (
          error.message?.includes('column "account_id"') || 
          error.message?.includes("find the 'account_id' column") ||
          error.code === '42703'
        ) {
          const { account_id, ...itemWithoutAccount } = item;
          const { data: retryData, error: retryError } = await supabase
            .from('frequent_payments')
            .insert([{ ...itemWithoutAccount, user_id: user.id }])
            .select();
          
          if (retryError) throw retryError;
          if (!retryData || retryData.length === 0) throw new Error('Shortcut created (fallback) but no data returned');
          setFrequentPayments(prev => [...prev, retryData[0]]);
          return { success: true, warning: 'Stored without account preference (DB update needed)' };
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

  const processRecurringTransactions = async (schedules) => {
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

    if (updatedAny) {
      // Refresh schedules and transactions to reflect changes
      fetchData(); // This gets updated transactions/accounts
      const { data } = await supabase.from('recurring_transactions').select('*').order('created_at');
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
      setRecurringSchedules(prev => [...prev, data[0]]);
      processRecurringTransactions([data[0]]); // Check immediately
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
        processRecurringTransactions([data[0]]);
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

  const logout = () => supabase.auth.signOut();

  const addHouseholdMember = async (member) => {
    try {
      const targetId = currentHouseholdId || user.id;
      const { data, error } = await supabase
        .from('household_members')
        .insert([{ ...member, user_id: targetId }])
        .select();
      
      if (error) {
        if (error.code === '42P01' || error.message?.includes('not find the table')) {
          const newM = { ...member, id: Date.now() };
          const updated = [...householdMembers, newM];
          setHouseholdMembers(updated);
          localStorage.setItem('finance_household_members', JSON.stringify(updated));
          return { success: true, warning: 'Stored locally (DB table missing)' };
        }
        throw error;
      }
      setHouseholdMembers(prev => [...prev, data[0]]);
      return { success: true };
    } catch (error) {
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
        if (error.code === '42P01' || error.message?.includes('not find the table')) {
          const updated = householdMembers.map(m => m.id === id ? { ...m, ...updates } : m);
          setHouseholdMembers(updated);
          localStorage.setItem('finance_household_members', JSON.stringify(updated));
          return { success: true };
        }
        throw error;
      }
      setHouseholdMembers(prev => prev.map(m => m.id === id ? data[0] : m));
      return { success: true };
    } catch (error) {
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
      availableHouseholds, pendingInvitations, currentHouseholdId, setCurrentHouseholdId, loading,
      addTransaction, updateTransaction, deleteTransaction, deleteTransactions,
      transferFunds, adjustBalance, createAccount, updateAccount, deleteAccount,
      addFrequentPayment, deleteFrequentPayment,
      addRecurringSchedule, updateRecurringSchedule, deleteRecurringSchedule, skipNextOccurrence,
      addHouseholdMember, updateHouseholdMember, deleteHouseholdMember, inviteMember, respondToInvitation,
      calculateNextPaymentDate,
      login, signup, logout, fetchData, updateProfile, updatePassword, sendPasswordResetEmail,
      setAccounts,
      showLogModal, setShowLogModal,
      preferences,
      updatePreferences: (newPrefs) => setPreferences(prev => ({ ...prev, ...newPrefs })),
      toggleBalances: () => setPreferences(prev => ({ ...prev, hideBalances: !prev.hideBalances }))
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
