# 🚀 AK Financial Master (Cloud Financial Planner)

A premium, mobile-first financial dashboard built with **React**, **Supabase**, and **Lucide Icons**. Designed for high-speed transaction logging, household collaboration, and automated recurring expense tracking.

## ✨ Key Features

*   **⚡ High-Speed Logging**: One-tap shortcuts for frequent payments (Coffee, Grocery, etc.) and optimized keyboard/tab support.
*   **👥 Secure Household Sharing**: Invite family members via email with granular **Read-Only** vs **Read & Write** access levels.
*   **🛡️ Hardened Security**: Robust Row-Level Security (RLS) policies ensure read-only members are physically blocked from modifying data.
*   **🛠️ Admin Dashboard**: Platform-level user management, approval workflows, and privilege controls.
*   **🔄 Automated Recurring**: Advanced scheduler for subscriptions, rent, and utility bills with "Next Payment" forecasting.
*   **🏦 Wallet Management**: Support for Checking, Savings, Credit Cards, and parent-linked Debit Cards for automatic balance syncing.
*   **🧠 AI Insights**: Integrated planning tools to analyze spending trends and offer personalized financial tips.
*   **❓ Help Center**: Integrated documentation and onboarding to help users master the platform.
*   **📱 iPhone Optimized**: Premium glassmorphism design with responsive layouts tailored for modern mobile browsers.

## 🛠️ Tech Stack

*   **Frontend**: React + Vite + Vanilla CSS (Premium Design System)
*   **Icons**: Lucide React
*   **Backend**: Supabase (PostgreSQL, Auth, Real-time RLS)
*   **State**: React Context API (FinanceProvider)

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/pjkim4/AKFinancial.git
cd AKFinancial
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Initialization (RLS Hardening)
Go to the **Supabase SQL Editor** and run the following scripts to enable secure shared access:

```sql
-- Enable RLS on core tables
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Owner Full Access
CREATE POLICY "owner_full_control" ON public.transactions
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Shared Read-Only Access
CREATE POLICY "shared_read_access" ON public.transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.household_invitations
    WHERE household_id = transactions.user_id
    AND lower(invitee_email) = lower(auth.jwt()->>'email')
    AND status = 'accepted'
  )
);

-- Shared Write Access (Conditional)
CREATE POLICY "shared_write_access" ON public.transactions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.household_invitations
    WHERE household_id = transactions.user_id
    AND lower(invitee_email) = lower(auth.jwt()->>'email')
    AND status = 'accepted'
    AND access_level = 'write'
  )
);
```

### 4. Run Locally
```bash
npm run dev
```

## 🌐 Deployment

This app is optimized for **Vercel**. 
1.  Connect your GitHub repository.
2.  Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel environment variables.
3.  Deploy!

## 📜 License
MIT
