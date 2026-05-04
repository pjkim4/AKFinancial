import React from 'react';
import { createPortal } from 'react-dom';
import { X, HelpCircle, Wallet, History, Users, Shield, Zap, Info, Eye, MousePointer2, FileOutput } from 'lucide-react';

const HelpModal = ({ isOpen, onClose, t }) => {
  if (!isOpen) return null;

  const sections = [
    {
      icon: <Wallet className="text-primary" />,
      title: "Wallets & Accounts",
      content: "Add your bank accounts, credit cards, or cash wallets in the 'Wallets' tab. You can link Debit Cards to a parent account to sync balances automatically."
    },
    {
      icon: <History className="text-primary" />,
      title: "Logging Transactions",
      content: "Use the '+' button on the dashboard or the 'Log Transaction' button in History. You can categorize expenses to see where your money goes."
    },
    {
      icon: <Users className="text-primary" />,
      title: "Household Sharing",
      content: "Invite family members in 'Cloud Access Management'. You can grant 'Read Only' access to let them see data without changing anything, or 'Read & Write' for full collaboration."
    },
    {
      icon: <Shield className="text-primary" />,
      title: "Security (RLS)",
      content: "Your data is protected by Row-Level Security. Read-only members are physically blocked by the database from adding or deleting transactions."
    },
    {
      icon: <Zap className="text-primary" />,
      title: "AI Insights",
      content: "The AI tab analyzes your spending patterns and gives you personalized tips on how to save money and stay on budget."
    },
    {
      icon: <MousePointer2 className="text-primary" />,
      title: "Quick Actions",
      content: "Save time with 'Quick Actions' on the dashboard. One-tap buttons for common expenses like Coffee or Groceries help you log transactions in seconds."
    },
    {
      icon: <Eye className="text-primary" />,
      title: "Privacy Mode",
      content: "Need to check your finances in public? Click the 'Eye' icon in the dashboard to hide your balances. Click it again to reveal them."
    },
    {
      icon: <FileOutput className="text-primary" />,
      title: "QuickBooks Export",
      content: "Go to the 'Reports' or 'History' tab to export your data. You can download an .IIF file specifically formatted for QuickBooks imports."
    },
    {
      icon: <Info className="text-primary" />,
      title: "Admin Controls",
      content: "If you are a platform admin, you can manage user access and approve new members in the 'Admin' dashboard."
    }
  ];

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
      <div className="card w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border-white/10 bg-[#0F0F0F] p-0">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <HelpCircle className="text-primary" size={24} />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter">Help Center</h3>
              <p className="text-[10px] text-text-muted uppercase tracking-widest font-black">Learn how to master your finances</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-all text-text-muted hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((section, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  {React.cloneElement(section.icon, { size: 18 })}
                  <h4 className="font-black text-[10px] uppercase tracking-tight">{section.title}</h4>
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed font-medium">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          {/* Quick Tip */}
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex gap-3">
            <Zap className="text-primary shrink-0" size={16} />
            <p className="text-[10px] text-primary font-bold leading-relaxed">
              PRO TIP: Use the 'Language' toggle in the sidebar to switch between English and Korean instantly.
            </p>
          </div>
        </div>


        {/* Footer */}
        <div className="p-6 border-t border-white/5 text-center bg-white/5">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-primary text-black font-black rounded-xl uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-lg shadow-primary/20"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HelpModal;
