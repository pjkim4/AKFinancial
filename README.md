# 🚀 Cloud Financial Planner

A premium, mobile-first financial dashboard built with **React**, **Supabase**, and **Lucide Icons**. Designed for high-speed transaction logging, household collaboration, and automated recurring expense tracking.

## ✨ Key Features

*   **⚡ High-Speed Logging**: One-tap shortcuts for frequent payments (Coffee, Grocery, etc.).
*   **👥 Multi-User Households**: Invite family members via email or create virtual profiles for easy tagging.
*   **🔄 Automated Recurring**: Advanced scheduler for subscriptions, rent, and utility bills with "Next Payment" forecasting.
*   **🏦 Wallet Management**: Support for Checking, Savings, Credit Cards, and parent-linked Debit Cards.
*   **📱 iPhone Optimized**: Responsive, glassmorphism design tailored for mobile web browsers.
*   **🧠 AI Insights**: Integrated planning tools to analyze spending trends (requires AI configuration).
*   **🔒 Privacy Mode**: Toggle balances hidden/visible for use in public.

## 🛠️ Tech Stack

*   **Frontend**: React + Vite + TailwindCSS
*   **Icons**: Lucide React
*   **Backend**: Supabase (Auth, PostgreSQL, RLS)
*   **State**: React Context API (FinanceProvider)

## 🚀 Getting Started

### 1. Clone & Install
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Initialization
Go to the **Supabase SQL Editor** and run the following table setup:

```sql
-- Profiles table
CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Accounts (Wallets)
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  balance decimal DEFAULT 0,
  parent_account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Transactions
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  amount decimal NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  note text,
  date date DEFAULT current_date,
  household_member_id text, -- For tagging virtual users
  created_at timestamptz DEFAULT now()
);

-- Recurring Schedules
CREATE TABLE recurring_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount decimal NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  frequency text NOT NULL, -- Daily, Weekly, Monthly, Yearly
  next_date date NOT NULL,
  last_run_date date,
  created_at timestamptz DEFAULT now()
);

-- Household Invitations (Cloud Sharing)
CREATE TABLE household_invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  inviter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
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
