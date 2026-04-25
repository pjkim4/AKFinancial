import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Shield, User, Key, Save, AlertCircle, Mail, Zap, Users, Trash2, Plus, X, Check, Edit2 } from 'lucide-react';


const AdminSettings = () => {
  const { 
    user, profile, updateProfile, updatePassword, 
    householdMembers, addHouseholdMember, updateHouseholdMember, deleteHouseholdMember,
    inviteMember, currentHouseholdId, pendingInvitations, sentInvitations, revokeInvitation, respondToInvitation, availableHouseholds,
    setCurrentHouseholdId,
    t
  } = useFinance();

  
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [memberType, setMemberType] = useState('virtual'); // 'virtual' or 'cloud'
  const [newMember, setNewMember] = useState({ name: '', role: 'Spouse', color: '#c1ff72' });
  const [editMemberData, setEditMemberData] = useState({ name: '', role: 'Spouse', color: '#c1ff72' });
  const [inviteEmail, setInviteEmail] = useState('');

  const [formData, setFormData] = useState({
    username: profile?.username || user?.email?.split('@')[0] || '',
    password: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    setLoading(true);
    const { error } = await inviteMember(inviteEmail, currentHouseholdId);
    setLoading(false);
    if (error) {
      alert('Invitation failed: ' + error.message);
    } else {
      alert('Invitation sent to ' + inviteEmail);
      setInviteEmail('');
      setIsAddingMember(false);
    }
  };

  const handleAddMember = async () => {
    setLoading(true);
    const { error } = await addHouseholdMember(newMember);
    setLoading(false);
    if (error) {
      alert('Failed to add member: ' + error.message);
    } else {
      setNewMember({ name: '', role: 'Spouse', color: '#c1ff72' });
      setIsAddingMember(false);
    }
  };

  const handleEditMember = async () => {
    setLoading(true);
    const { error } = await updateHouseholdMember(editingMemberId, editMemberData);
    setLoading(false);
    if (error) {
      alert('Failed to update member: ' + error.message);
    } else {
      setEditingMemberId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // 1. Update Username in Profile table
      if (formData.username !== profile?.username) {
        const { error } = await updateProfile({ username: formData.username });
        if (error) throw error;
      }

      // 2. Update Password in Supabase Auth
      if (formData.password) {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const { error } = await updatePassword(formData.password);
        if (error) throw error;
      }

      setMessage('Security settings updated in Supabase cloud successfully!');
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-slide-up">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="text-primary" size={32} />
          <h2 className="text-3xl font-black tracking-tight uppercase italic">{t('nav_setup')}</h2>
        </div>
        <p className="text-text-muted font-bold uppercase text-[10px] tracking-[0.2em]">{t('settings_security_global')}</p>
      </header>

      {/* EMERGENCY TROUBLESHOOTING BOX - MOVED TO TOP */}
      <div className="p-4 bg-danger/10 border-2 border-danger rounded-2xl animate-pulse-slow">
        <p className="text-[10px] text-danger font-black uppercase tracking-widest mb-3 text-center">{t('diagnostic_mode')}</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-black/20 p-2 rounded-xl border border-danger/20">
            <p className="text-[7px] text-text-muted mb-1 uppercase">{t('user')}</p>
            <p className="text-[9px] font-mono truncate text-white">{user?.email?.split('@')[0]}</p>
          </div>
          <div className="bg-black/20 p-2 rounded-xl border border-danger/20">
            <p className="text-[7px] text-text-muted mb-1 uppercase">{t('pending')}</p>
            <p className="text-md font-black font-mono text-danger">{pendingInvitations.length}</p>
          </div>
          <div className="bg-black/20 p-2 rounded-xl border border-danger/20">
            <p className="text-[7px] text-text-muted mb-1 uppercase">{t('joined')}</p>
            <p className="text-md font-black font-mono text-success">{availableHouseholds.length}</p>
          </div>
        </div>

        {/* INSTANT ACCEPT BUTTONS */}
        {pendingInvitations.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-[10px] text-white font-black uppercase mb-2 border-b border-white/20 pb-2 text-center">
              {t('join_shared_household')}:
            </p>
            {pendingInvitations.map(inv => (
              <button 
                key={inv.id}
                onClick={() => respondToInvitation(inv.id, 'accepted')}
                className="w-full p-6 bg-lime text-black font-black rounded-2xl text-sm flex justify-between items-center shadow-lime active-scale-95 transition-all"
              >
                <div className="text-left">
                  <span className="block text-xs uppercase tracking-tighter">{t('join_action')}</span>
                  <span className="text-[8px] opacity-50 font-mono">ID: {inv.household_id?.slice(0, 8) || '??'}...</span>
                </div>
                <Check size={24} strokeWidth={3} />
              </button>
            ))}
          </div>
        )}

        {/* JOINED HOUSEHOLDS / SWITCHER */}
        <div className="mt-6 pt-4 border-t border-white/20">
          <p className="text-[10px] text-white font-black uppercase mb-3 text-center">
            {t('your_accounts')}:
          </p>
          <div className="space-y-2">
            {availableHouseholds.map(hh => (
              <button 
                key={hh.id}
                onClick={() => {
                  setCurrentHouseholdId(hh.id);
                  window.scrollTo(0,0);
                }}
                className={`w-full p-4 rounded-xl text-xs font-bold flex justify-between items-center transition-all ${currentHouseholdId === hh.id ? 'bg-success text-black border-2 border-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                <span>{hh.name}</span>
                {currentHouseholdId === hh.id ? <Check size={16} /> : <Zap size={16} className="opacity-30" />}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="w-full mt-6 py-5 bg-white text-black font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
        >
          {t('refresh_app')}
        </button>
      </div>

      <section className="card glass divide-y divide-white/5">
        <div className="p-6">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
            <Shield size={20} className="text-primary" />
            {t('settings_security')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-text-muted">{t('settings_username')}</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="text" 
                  className="pl-12 w-full"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-text-muted">{t('settings_password')}</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                  <input 
                    type="password" 
                    className="pl-12 w-full"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-text-muted">{t('settings_confirm')}</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                  <input 
                    type="password" 
                    className="pl-12 w-full"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary w-full h-12 flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest text-black"
            >
              <Save size={18} />
              {loading ? t('loading') : t('settings_sync')}
            </button>
          </form>

          {message && (
            <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${message.includes('success') ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
              <AlertCircle size={18} />
              <p className="text-xs font-bold">{message}</p>
            </div>
          )}
        </div>
      </section>

      {/* Household Management */}
      <div className="card border-white/5 bg-card">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Users className="text-primary" size={24} />
            </div>
            <div>
              <h3 className="font-black text-lg">{t('settings_household')}</h3>
              <p className="text-[10px] text-text-muted uppercase tracking-widest">{t('settings_household_subtitle')}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAddingMember(true)}
            className="btn bg-white/5 border-white/10 p-3 hover:bg-primary hover:text-black transition-all"
          >
            <Plus size={18} />
          </button>
        </div>

        <p className="text-[10px] text-text-muted uppercase tracking-widest mb-6 leading-relaxed">
          {t('settings_member_hint')}
          <span className="text-primary block mt-1">{t('settings_member_note')}</span>
        </p>

        {isAddingMember && (
          <div className="mb-8 p-6 bg-white/5 border border-white/10 rounded-2xl animate-scale-in">
            <div className="flex bg-white/5 p-1 rounded-xl mb-6">
              {['virtual', 'cloud'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setMemberType(tab)}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${memberType === tab ? 'bg-primary text-black' : 'text-text-muted hover:text-white'}`}
                >
                  {tab === 'virtual' ? 'Simple Tag' : 'Cloud Invite'}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-primary">
                {memberType === 'virtual' ? t('settings_add_member') : t('settings_invite')}
              </h4>
              <button onClick={() => setIsAddingMember(false)} className="text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>


            {memberType === 'virtual' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">Full Name</label>
                  <input 
                    autoFocus
                    placeholder="e.g. John Doe"
                    value={newMember.name}
                    onChange={e => setNewMember({...newMember, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">Role</label>
                    <select value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})}>
                      <option>Spouse</option>
                      <option>Child</option>
                      <option>Roommate</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">Color</label>
                    <input type="color" className="h-12 p-1" value={newMember.color} onChange={e => setNewMember({...newMember, color: e.target.value})} />
                  </div>
                </div>
                <button 
                  onClick={handleAddMember}
                  disabled={!newMember.name || loading}
                  className="btn btn-primary w-full h-14 font-black uppercase text-black disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[10px] text-text-muted uppercase leading-relaxed mb-4">
                  The person will be invited to view your shared wallets. They must have their own account.
                </p>
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">Member's Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input 
                      type="email"
                      placeholder="email@example.com"
                      className="pl-12"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                    />
                  </div>
                </div>
                <button 
                  onClick={handleInvite}
                  disabled={!inviteEmail || loading}
                  className="btn btn-primary w-full h-14 font-black uppercase text-black disabled:opacity-50"
                >
                  {loading ? 'Sending...' : t('settings_send_invite')}
                </button>
              </div>
            )}
          </div>
        )}

        {editingMemberId && (
          <div className="mb-8 p-6 bg-white/5 border border-primary/20 rounded-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-primary">Edit Member</h4>
              <button onClick={() => setEditingMemberId(null)} className="text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">Full Name</label>
                <input 
                  autoFocus
                  placeholder="e.g. John Doe"
                  className="w-full bg-white/5 border-white/10"
                  value={editMemberData.name}
                  onChange={e => setEditMemberData({...editMemberData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">Role</label>
                  <select className="w-full bg-white/5 border-white/10" value={editMemberData.role} onChange={e => setEditMemberData({...editMemberData, role: e.target.value})}>
                    <option>Spouse</option>
                    <option>Child</option>
                    <option>Roommate</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-widest block mb-2 font-black">Color</label>
                  <input type="color" className="h-12 w-full p-1 bg-white/5 border-white/10" value={editMemberData.color} onChange={e => setEditMemberData({...editMemberData, color: e.target.value})} />
                </div>
              </div>
              <button 
                onClick={handleEditMember}
                disabled={!editMemberData.name || loading}
                className="btn btn-primary w-full h-14 font-black uppercase text-black disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Update Member'}
              </button>
            </div>
          </div>
        )}


        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="mb-8 space-y-4">
            <h4 className="text-[10px] text-primary uppercase font-black tracking-widest px-1">Pending Requests</h4>
            {pendingInvitations.map(inv => (
              <div key={inv.id} className="p-5 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between animate-pulse-slow">
                <div>
                  <p className="text-sm font-bold">New Invitation Received!</p>
                  <p className="text-[9px] text-text-muted uppercase tracking-tighter">Click check to join household</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => respondToInvitation(inv.id, 'accepted')}
                    className="p-2 bg-success text-black rounded-lg hover:bg-success/80 transition-all"
                  >
                    <Check size={18} />
                  </button>
                  <button 
                    onClick={() => respondToInvitation(inv.id, 'declined')}
                    className="p-2 bg-white/5 text-text-muted rounded-lg hover:bg-danger hover:text-white transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {householdMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl group hover:border-white/20 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-black" style={{ backgroundColor: member.color || '#fff' }}>
                  {member.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold">{member.name}</p>
                  <p className="text-[10px] text-text-muted uppercase tracking-widest">{member.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={() => {
                    setEditingMemberId(member.id);
                    setEditMemberData({ name: member.name, role: member.role, color: member.color });
                    setIsAddingMember(false);
                  }}
                  className="p-2 text-text-muted hover:text-primary"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm(`Delete ${member.name}?`)) {
                      deleteHouseholdMember(member.id);
                    }
                  }}
                  className="p-2 text-text-muted hover:text-danger"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {householdMembers.length === 0 && !isAddingMember && (
            <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl">
              <Users size={32} className="mx-auto text-text-muted mb-4 opacity-20" />
              <p className="text-xs text-text-muted font-bold">No extra users added yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sent Invitations / Revoke Access */}
      <div className="card glass border-white/10 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Zap className="text-primary" size={24} />
          </div>
          <div>
            <h3 className="font-black text-lg">{t('settings_cloud_share')}</h3>
            <p className="text-[10px] text-text-muted uppercase tracking-widest">Active Remote Connections</p>
          </div>
        </div>

        <p className="text-[10px] text-text-muted uppercase tracking-widest mb-6 leading-relaxed">
          Authorized users who have access to your shared wallets. Revoke access here to remove their permission.
        </p>

        <div className="space-y-3">
          {sentInvitations.map(inv => (
            <div key={inv.id} className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl group hover:border-warning/20 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-[10px] text-black ${inv.status === 'accepted' ? 'bg-success' : 'bg-warning animate-pulse'}`}>
                  {inv.status === 'accepted' ? 'OK' : '??'}
                </div>
                <div>
                  <p className="text-sm font-bold">{inv.invitee_email}</p>
                  <p className="text-[9px] text-text-muted uppercase tracking-widest">
                    Status: <span className={inv.status === 'accepted' ? 'text-success' : 'text-warning'}>{inv.status}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (window.confirm(`Revoke access for ${inv.invitee_email}?`)) {
                    revokeInvitation(inv.id);
                  }
                }}
                className="btn bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest px-4 h-10 hover:bg-danger hover:text-white transition-all"
              >
                Revoke Access
              </button>
            </div>
          ))}
          {sentInvitations.length === 0 && (
            <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-2xl opacity-30">
              <p className="text-[10px] font-black uppercase tracking-widest">No active cloud shares</p>
            </div>
          )}
        </div>
      </div>

      <div className="card glass bg-white/5 border-white/10">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Zap size={18} className="text-primary" />
          Network Connectivity
        </h3>
        <p className="text-xs text-text-muted mb-4 leading-relaxed">
          Access your planner on other devices using this network address:
        </p>
        <div className="bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-sm text-primary text-center select-all">
          {window.location.origin}
        </div>
        <p className="text-[10px] text-text-muted mt-4 uppercase tracking-tighter">
          <span className="text-warning mr-1">Note:</span> Use this exact URL on your iPhone to avoid "localhost" connection errors.
        </p>
      </div>
    </div>
  );
};

export default AdminSettings;
