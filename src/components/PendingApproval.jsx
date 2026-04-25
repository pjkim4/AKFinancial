import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { LogOut, Clock, ShieldAlert } from 'lucide-react';

const PendingApproval = () => {
  const { logout, profile } = useFinance();

  return (
    <div className="min-h-screen bg-background text-text flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-10 text-center animate-slide-up border-primary/20 shadow-2xl shadow-primary/5">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
          <ShieldAlert size={40} className="text-primary" />
        </div>
        
        <h2 className="text-3xl font-black mb-3 uppercase tracking-tighter">Account Pending</h2>
        <p className="text-text-muted text-sm font-bold mb-8 leading-relaxed">
          Welcome, <span className="text-white">{profile?.username || 'User'}</span>! Your account has been successfully created and is currently awaiting administrator approval.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 flex flex-col items-center gap-3">
          <Clock size={24} className="text-primary animate-pulse" />
          <p className="text-xs font-black uppercase tracking-widest text-white">Status: In Review</p>
          <p className="text-[10px] text-text-muted mt-2">You will be granted access to the financial planner once an admin reviews your registration.</p>
        </div>

        <button 
          onClick={logout}
          className="btn btn-secondary border-white/10 w-full h-14 font-black uppercase tracking-widest text-xs group"
        >
          <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default PendingApproval;
