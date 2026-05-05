import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Shield, User, Key, Save, AlertCircle, Mail, Zap, Users, Trash2, Plus, X, Check, Edit2, Briefcase, Upload, Repeat } from 'lucide-react';
import { createPortal } from 'react-dom';
import COAImporter from './COAImporter';

const AdminSettings = () => {
  const { 
    user, profile, updateProfile, updatePassword, 
    householdMembers, addHouseholdMember, updateHouseholdMember, deleteHouseholdMember,
    inviteMember, currentHouseholdId, pendingInvitations, sentInvitations, revokeInvitation, respondToInvitation, availableHouseholds, updateInvitationAccessLevel,
    setCurrentHouseholdId,
    preferences,
    t,
    updateCustomCategory,
    deleteCustomCategory,
    addCustomCategory,
    addCustomRole,
    deleteCustomRole,
    updateCustomRole,
    reassignCategory,
    transactions,
    supabase
  } = useFinance();

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [memberType, setMemberType] = useState('virtual'); // 'virtual' or 'cloud'
  const [newMember, setNewMember] = useState({ name: '', role: 'Spouse', color: '#c1ff72' });
  const [editMemberData, setEditMemberData] = useState({ name: '', role: 'Spouse', color: '#c1ff72' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteAccessLevel, setInviteAccessLevel] = useState('read');
  const [showCOAImporter, setShowCOAImporter] = useState(false);

  const [formData, setFormData] = useState({
    username: profile?.username || user?.email?.split('@')[0] || '',
    password: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const allRoles = [
    { id: 'Parent', name: t('role_parent') || 'Parent' },
    { id: 'Spouse', name: t('role_spouse') || 'Spouse' },
    { id: 'Child', name: t('role_child') || 'Child' },
    { id: 'Roommate', name: t('role_roommate') || 'Roommate' },
    ...(preferences.customRoles || [])
  ];

  const handleInvite = async () => {
    setLoading(true);
    const { error } = await inviteMember(inviteEmail, currentHouseholdId, inviteAccessLevel);
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
      setNewMember({ name: '', role: allRoles[0].id, color: '#c1ff72' });
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
      if (formData.username !== profile?.username) {
        const { error } = await updateProfile({ username: formData.username });
        if (error) throw error;
      }
      if (formData.password) {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const { error } = await updatePassword(formData.password);
        if (error) throw error;
      }
      setMessage('Security settings updated successfully!');
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

      {/* EMERGENCY TROUBLESHOOTING BOX */}
      <div className="p-4 bg-danger/10 border-2 border-danger rounded-2xl">
        <p className="text-[10px] text-danger font-black uppercase tracking-widest mb-3 text-center">{t('diagnostic_mode')}</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-black/20 p-2 rounded-xl border border-danger/20 text-center">
            <p className="text-[7px] text-text-muted mb-1 uppercase">{t('user')}</p>
            <p className="text-[9px] font-mono truncate text-white">{user?.email?.split('@')[0]}</p>
          </div>
          <div className="bg-black/20 p-2 rounded-xl border border-danger/20 text-center">
            <p className="text-[7px] text-text-muted mb-1 uppercase">{t('pending')}</p>
            <p className="text-md font-black font-mono text-danger">{pendingInvitations.length}</p>
          </div>
          <div className="bg-black/20 p-2 rounded-xl border border-danger/20 text-center">
            <p className="text-[7px] text-text-muted mb-1 uppercase">{t('joined')}</p>
            <p className="text-md font-black font-mono text-success">{availableHouseholds.length}</p>
          </div>
        </div>

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
                  <span className="text-[8px] opacity-50 font-mono">ID: {inv.household_id?.slice(0, 8)}...</span>
                </div>
                <Check size={24} strokeWidth={3} />
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/20 text-center">
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-white text-black font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
          >
            {t('refresh_app')}
          </button>
        </div>
      </div>

      {/* Profile/Security Section */}
      <section className="card glass divide-y divide-white/5 p-6">
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
              <input 
                type="password" 
                className="w-full"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-text-muted">{t('settings_confirm')}</label>
              <input 
                type="password" 
                className="w-full"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full h-12 font-black uppercase text-xs tracking-widest text-black">
            <Save size={18} /> {t('settings_sync')}
          </button>
        </form>
        {message && <div className="mt-4 p-3 bg-primary/10 text-primary rounded-xl text-xs font-bold text-center">{message}</div>}
      </section>

      {/* Household Management */}
      <section className="card glass p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="text-primary" size={24} />
            <h3 className="font-black text-lg">{t('settings_household')}</h3>
          </div>
          <button onClick={() => setIsAddingMember(true)} className="p-3 bg-white/5 rounded-xl hover:bg-primary hover:text-black transition-all">
            <Plus size={18} />
          </button>
        </div>

        {isAddingMember && (
          <div className="mb-8 p-6 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-primary">{t('settings_add_member')}</h4>
              <button onClick={() => setIsAddingMember(false)}><X size={18} /></button>
            </div>

            <div className="flex gap-2 mb-6 p-1 bg-black/40 rounded-xl">
              <button 
                onClick={() => setMemberType('virtual')}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${memberType === 'virtual' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'}`}
              >
                Virtual Member
              </button>
              <button 
                onClick={() => setMemberType('cloud')}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${memberType === 'cloud' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'}`}
              >
                Invite via Email
              </button>
            </div>

            {memberType === 'virtual' ? (
              <div className="space-y-4 animate-slide-up">
                <p className="text-[10px] text-text-muted uppercase italic mb-2">Virtual members do not have login access. They are for tracking only.</p>
                <input 
                  placeholder="Full Name"
                  className="w-full"
                  value={newMember.name}
                  onChange={e => setNewMember({...newMember, name: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                  <select 
                    className="w-full"
                    value={newMember.role} 
                    onChange={e => setNewMember({...newMember, role: e.target.value})}
                  >
                    {allRoles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <input 
                    type="color" 
                    className="w-full h-12 p-1 bg-white/5 border-white/10" 
                    value={newMember.color} 
                    onChange={e => setNewMember({...newMember, color: e.target.value})} 
                  />
                </div>
                <button onClick={handleAddMember} disabled={loading} className="btn btn-primary w-full h-12 text-black font-black uppercase text-xs tracking-widest disabled:opacity-50">
                  Add Virtual Member
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-slide-up">
                <p className="text-[10px] text-text-muted uppercase italic mb-2">Invite a real user to join your household. They will log in with their own account.</p>
                <input 
                  type="email"
                  placeholder="Email Address"
                  className="w-full"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block mb-2">Access Level</label>
                  <select 
                    className="w-full"
                    value={inviteAccessLevel}
                    onChange={e => setInviteAccessLevel(e.target.value)}
                  >
                    <option value="read">Read Only (View Data)</option>
                    <option value="write">Read & Write (Full Access)</option>
                  </select>
                </div>
                <button onClick={handleInvite} disabled={loading || !inviteEmail} className="btn btn-primary w-full h-12 text-black font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
                  <Mail size={16} /> Send Invitation
                </button>
              </div>
            )}
          </div>
        )}

        {editingMemberId && (
          <div className="mb-8 p-6 bg-white/5 border border-primary/20 rounded-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-primary">Edit Member</h4>
              <button onClick={() => setEditingMemberId(null)}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <input 
                className="w-full"
                value={editMemberData.name}
                onChange={e => setEditMemberData({...editMemberData, name: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <select 
                  className="w-full"
                  value={editMemberData.role} 
                  onChange={e => setEditMemberData({...editMemberData, role: e.target.value})}
                >
                  {allRoles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
                <input 
                  type="color" 
                  className="w-full h-12 p-1 bg-white/5 border-white/10" 
                  value={editMemberData.color} 
                  onChange={e => setEditMemberData({...editMemberData, color: e.target.value})} 
                />
              </div>
              <button onClick={handleEditMember} className="btn btn-primary w-full h-12 text-black font-black uppercase text-xs tracking-widest">
                Update Member
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {householdMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-black" style={{ backgroundColor: member.color || '#fff' }}>
                  {member.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold">{member.name}</p>
                  <p className="text-[10px] text-text-muted uppercase tracking-widest">{member.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={() => {
                    setEditingMemberId(member.id);
                    setEditMemberData({ name: member.name, role: member.role, color: member.color });
                  }}
                  className="p-2 text-text-muted hover:text-primary"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => {
                    if (confirm(`Delete ${member.name}?`)) deleteHouseholdMember(member.id);
                  }} 
                  className="p-2 text-danger"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {sentInvitations.length > 0 && (
          <div className="mt-8 pt-8 border-t border-white/10">
            <h4 className="text-xs font-black uppercase tracking-widest text-text-muted mb-4">Cloud Access Management</h4>
            <div className="space-y-3">
              {sentInvitations.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <p className="font-bold truncate">{inv.invitee_email}</p>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest ${inv.status === 'accepted' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                        {inv.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-[10px] text-text-muted uppercase tracking-widest">
                        Access: <span className="text-primary font-black">{inv.access_level || 'read'}</span>
                      </p>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => updateInvitationAccessLevel(inv.id, 'read')}
                          className={`text-[8px] font-black uppercase px-2 py-0.5 rounded transition-all ${inv.access_level === 'read' ? 'bg-primary text-black' : 'bg-white/5 text-text-muted hover:text-white'}`}
                        >
                          Read Only
                        </button>
                        <button 
                          onClick={() => updateInvitationAccessLevel(inv.id, 'write')}
                          className={`text-[8px] font-black uppercase px-2 py-0.5 rounded transition-all ${inv.access_level === 'write' ? 'bg-primary text-black' : 'bg-white/5 text-text-muted hover:text-white'}`}
                        >
                          Read & Write
                        </button>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if(confirm(`Revoke access for ${inv.invitee_email}?`)) revokeInvitation(inv.id);
                    }}
                    className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-all"
                    title="Revoke Access"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Role Manager Section */}
      <section className="card glass border-white/10 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Briefcase size={24} className="text-primary" />
          <div>
            <h3 className="font-black text-lg uppercase italic">Role Manager</h3>
            <p className="text-[10px] text-text-muted uppercase tracking-widest">Manage available member roles</p>
          </div>
        </div>

        <div className="space-y-2">
          {preferences.customRoles?.map(role => (
            <div key={role.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-sm font-black uppercase tracking-wider text-white italic">{role.name}</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const newName = prompt('New role name:', role.name);
                    if (newName) updateCustomRole(role.id, newName);
                  }}
                  className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => {
                    if (confirm('Delete role?')) deleteCustomRole(role.id);
                  }}
                  className="p-2 bg-danger/20 text-danger rounded-lg"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <button 
            onClick={() => {
              const name = prompt('New role name:');
              if (name) addCustomRole(name);
            }}
            className="w-full p-4 bg-white/5 border border-dashed border-white/20 rounded-xl text-[10px] font-black uppercase text-text-muted hover:text-primary transition-all flex items-center justify-center gap-2"
          >
            <Plus size={14} strokeWidth={3} /> Add Custom Role
          </button>
        </div>
        
        <p className="text-[10px] text-text-muted italic">
          Standard roles like Parent, Spouse, and Child are always available.
        </p>
      </section>

      {/* Category Manager Section */}
      <section className="card glass border-white/10 p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Plus size={24} className="text-primary" />
            <h3 className="font-black text-lg uppercase italic">Category Manager</h3>
          </div>
          <button 
            onClick={() => setShowCOAImporter(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary hover:text-black transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <Upload size={14} /> Import COA
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {['expense', 'income'].map(type => (
            <div key={type} className="space-y-4">
              <h4 className="text-[10px] text-primary font-black uppercase tracking-[0.2em] border-b border-white/10 pb-2">{type}</h4>
              <div className="space-y-2">
                {(preferences.customCategories?.[type] || []).map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                    <span className="text-sm font-black uppercase tracking-wider text-white italic">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={async () => {
                          const targetId = currentHouseholdId || user.id;
                          const { count, error } = await supabase
                            .from('transactions')
                            .select('*', { count: 'exact', head: true })
                            .eq('user_id', targetId)
                            .ilike('category', cat.id.trim())
                            .ilike('type', type);

                          if (error) {
                            alert('Error fetching transactions: ' + error.message);
                            return;
                          }

                          if (count === 0) {
                            alert(`No transactions found for "${cat.name}".`);
                            return;
                          }

                          const newName = prompt(`Move ${count} transactions from "${cat.name}" to:`);
                          if (newName && confirm(`Confirm moving ${count} items to "${newName}"?`)) {
                            reassignCategory(type, cat.id, newName);
                          }
                        }}
                        title="Move transactions to another category"
                        className="p-2 bg-primary/20 text-primary rounded-lg hover:bg-primary hover:text-black transition-all"
                      >
                        <Repeat size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          const newName = prompt('New name:', cat.name);
                          if (newName) updateCustomCategory(type, cat.id, newName);
                        }}
                        className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete the category "${cat.name}"?`)) {
                            const result = deleteCustomCategory(type, cat.id);
                            if (result?.error) {
                              alert(result.error);
                            }
                          }
                        }}
                        className="p-2 bg-danger/20 text-danger rounded-lg hover:bg-danger hover:text-white transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    const name = prompt('Category name:');
                    if (name) addCustomCategory(type, name);
                  }}
                  className="w-full p-4 bg-white/5 border border-dashed border-white/20 rounded-xl text-[10px] font-black uppercase text-text-muted hover:text-primary transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} strokeWidth={3} /> Add Category
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="card glass bg-white/5 border-white/10 p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Zap size={18} className="text-primary" />
          Network Address
        </h3>
        <div className="bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-xs text-primary text-center">
          {window.location.origin}
        </div>
      </div>

      {showCOAImporter && createPortal(
        <COAImporter onClose={() => setShowCOAImporter(false)} />,
        document.body
      )}
    </div>
  );
};

export default AdminSettings;
