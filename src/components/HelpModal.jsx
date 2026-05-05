import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, HelpCircle, Wallet, History, Users, Shield, Zap, Info, Eye, MousePointer2, FileOutput, Upload, List } from 'lucide-react';

const HelpModal = ({ isOpen, onClose, t }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        console.log('[DEBUG] ESC key pressed');
        onClose();
      }
    };
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

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
      icon: <Upload className="text-primary" />,
      title: "Chart of Accounts",
      content: "Bulk-create categories in 'Admin Settings'. You can upload a QuickBooks CSV export or use our provided template to organize your accounts quickly."
    },
    {
      icon: <List className="text-primary" />,
      title: "Category Safety",
      content: "Categories with active transactions cannot be deleted. Use the 'Move' icon in Admin Settings to migrate history to a new category before removing the old one."
    },
    {
      icon: <Info className="text-primary" />,
      title: "Admin Controls",
      content: "Manage your profile, household settings, and category lists in the Admin tab. This is where you control the core structure of your financial workspace."
    }
  ];

  return createPortal(
    <div 
      className="fixed inset-0 z-ultra flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in pointer-events-auto cursor-pointer"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      onClick={() => {
        console.log('[DEBUG] HelpModal backdrop clicked');
        onClose();
      }}
      onTouchStart={(e) => {
        if (e.target === e.currentTarget) {
          console.log('[DEBUG] HelpModal backdrop touched');
          onClose();
        }
      }}
    >
      <div 
        className="card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-white/10 bg-[#0F0F0F] p-0 cursor-default mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-white/5 flex items-center justify-between bg-white/5 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <HelpCircle className="text-primary" size={20} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter">Help Center</h3>
              <p className="text-[9px] text-text-muted uppercase tracking-widest font-black">Learn how to master your finances</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-all text-text-muted hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 scroll-smooth">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sections.map((section, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 hover:bg-white/10 transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-primary group-hover:scale-110 transition-transform">
                    {React.cloneElement(section.icon, { size: 16 })}
                  </div>
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-white">{section.title}</h4>
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
