import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { supabase } from '../lib/supabase';
import { Shield, ShieldAlert, ShieldCheck, UserCheck, UserX, Loader2, RefreshCcw } from 'lucide-react';

const AdminDashboard = () => {
  const { profile } = useFinance();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false, nullsFirst: false });
        
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      alert("Failed to load users: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.is_admin) {
      fetchUsers();
    }
  }, [profile]);

  const toggleApproval = async (targetId, currentStatus) => {
    setActionLoading(targetId + '-approval');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: !currentStatus })
        .eq('id', targetId);
        
      if (error) throw error;
      setUsers(users.map(u => u.id === targetId ? { ...u, is_approved: !currentStatus } : u));
    } catch (err) {
      alert("Failed to update approval status: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleAdmin = async (targetId, currentStatus) => {
    if (targetId === profile.id) {
      alert("You cannot remove your own admin privileges from here.");
      return;
    }
    
    if (!confirm(`Are you sure you want to ${currentStatus ? 'revoke' : 'grant'} admin privileges for this user?`)) return;

    setActionLoading(targetId + '-admin');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentStatus })
        .eq('id', targetId);
        
      if (error) throw error;
      setUsers(users.map(u => u.id === targetId ? { ...u, is_admin: !currentStatus } : u));
    } catch (err) {
      alert("Failed to update admin status: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (!profile?.is_admin) {
    return (
      <div className="p-10 text-center animate-fade-in">
        <ShieldAlert size={48} className="mx-auto text-danger mb-4" />
        <h2 className="text-2xl font-black uppercase text-danger">Access Denied</h2>
        <p className="text-text-muted mt-2">You do not have administrative privileges to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Shield className="text-primary" size={32} />
            Admin Dashboard
          </h2>
          <p className="text-text-muted font-bold mt-1">Manage user access and platform privileges.</p>
        </div>
        <button 
          onClick={fetchUsers}
          className="btn btn-secondary border-white/10"
          title="Refresh Users"
        >
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      <div className="card glass p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 border-b border-white/10 text-xs uppercase font-black text-text-muted tracking-widest">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Status</th>
                <th className="p-4">Role</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-text-muted">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-text-muted font-bold">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-black text-white shrink-0">
                          {u.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-black text-white truncate max-w-[150px] md:max-w-[300px]">{u.username}</p>
                          <p className="text-[10px] text-text-muted font-bold truncate max-w-[150px] md:max-w-[300px]">{u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${u.is_approved ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>
                        {u.is_approved ? <UserCheck size={12} /> : <UserX size={12} />}
                        {u.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${u.is_admin ? 'bg-info/10 text-info border border-info/20' : 'bg-white/5 text-text-muted border border-white/10'}`}>
                        {u.is_admin ? <ShieldCheck size={12} /> : <Shield size={12} />}
                        {u.is_admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => toggleApproval(u.id, u.is_approved)}
                        disabled={actionLoading === u.id + '-approval'}
                        className={`btn h-9 px-3 text-[10px] font-black uppercase ${u.is_approved ? 'btn-secondary border-white/10' : 'bg-primary text-black hover:bg-primary/90'}`}
                      >
                        {actionLoading === u.id + '-approval' ? <Loader2 size={14} className="animate-spin" /> : u.is_approved ? 'Revoke Access' : 'Approve Access'}
                      </button>
                      
                      <button
                        onClick={() => toggleAdmin(u.id, u.is_admin)}
                        disabled={actionLoading === u.id + '-admin' || u.id === profile.id}
                        className={`btn h-9 px-3 text-[10px] font-black uppercase ${u.is_admin ? 'bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30' : 'btn-secondary border-white/10'}`}
                      >
                         {actionLoading === u.id + '-admin' ? <Loader2 size={14} className="animate-spin" /> : u.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
