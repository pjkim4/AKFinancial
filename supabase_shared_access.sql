-- ==========================================
-- SECURE SHARED HOUSEHOLD ACCESS POLICIES
-- ==========================================

-- 1. Add access_level column to invitations table
ALTER TABLE public.household_invitations ADD COLUMN IF NOT EXISTS access_level text DEFAULT 'read';

-- ==========================================
-- ACCOUNTS
-- ==========================================
DROP POLICY IF EXISTS "Shared access SELECT accounts" ON public.accounts;
CREATE POLICY "Shared access SELECT accounts" ON public.accounts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.household_invitations
    WHERE household_id = accounts.user_id
    AND lower(invitee_email) = lower(auth.jwt()->>'email')
    AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Shared access WRITE accounts" ON public.accounts;
CREATE POLICY "Shared access WRITE accounts" ON public.accounts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.household_invitations
    WHERE household_id = accounts.user_id
    AND lower(invitee_email) = lower(auth.jwt()->>'email')
    AND status = 'accepted'
    AND access_level = 'write'
  )
);

-- ==========================================
-- TRANSACTIONS
-- ==========================================
DROP POLICY IF EXISTS "Shared access SELECT transactions" ON public.transactions;
CREATE POLICY "Shared access SELECT transactions" ON public.transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.household_invitations
    WHERE household_id = transactions.user_id
    AND lower(invitee_email) = lower(auth.jwt()->>'email')
    AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Shared access WRITE transactions" ON public.transactions;
CREATE POLICY "Shared access WRITE transactions" ON public.transactions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.household_invitations
    WHERE household_id = transactions.user_id
    AND lower(invitee_email) = lower(auth.jwt()->>'email')
    AND status = 'accepted'
    AND access_level = 'write'
  )
);

-- ==========================================
-- FREQUENT PAYMENTS
-- ==========================================
DROP POLICY IF EXISTS "Shared access SELECT frequent_payments" ON public.frequent_payments;
CREATE POLICY "Shared access SELECT frequent_payments" ON public.frequent_payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.household_invitations
    WHERE household_id = frequent_payments.user_id
    AND lower(invitee_email) = lower(auth.jwt()->>'email')
    AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Shared access WRITE frequent_payments" ON public.frequent_payments;
CREATE POLICY "Shared access WRITE frequent_payments" ON public.frequent_payments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.household_invitations
    WHERE household_id = frequent_payments.user_id
    AND lower(invitee_email) = lower(auth.jwt()->>'email')
    AND status = 'accepted'
    AND access_level = 'write'
  )
);

-- ==========================================
-- RECURRING TRANSACTIONS
-- ==========================================
DROP POLICY IF EXISTS "Shared access SELECT recurring_transactions" ON public.recurring_transactions;
CREATE POLICY "Shared access SELECT recurring_transactions" ON public.recurring_transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.household_invitations
    WHERE household_id = recurring_transactions.user_id
    AND lower(invitee_email) = lower(auth.jwt()->>'email')
    AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Shared access WRITE recurring_transactions" ON public.recurring_transactions;
CREATE POLICY "Shared access WRITE recurring_transactions" ON public.recurring_transactions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.household_invitations
    WHERE household_id = recurring_transactions.user_id
    AND lower(invitee_email) = lower(auth.jwt()->>'email')
    AND status = 'accepted'
    AND access_level = 'write'
  )
);

-- ==========================================
-- HOUSEHOLD MEMBERS
-- ==========================================
DROP POLICY IF EXISTS "Shared access SELECT household_members" ON public.household_members;
CREATE POLICY "Shared access SELECT household_members" ON public.household_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.household_invitations
    WHERE household_id = household_members.user_id
    AND lower(invitee_email) = lower(auth.jwt()->>'email')
    AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Shared access WRITE household_members" ON public.household_members;
CREATE POLICY "Shared access WRITE household_members" ON public.household_members
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.household_invitations
    WHERE household_id = household_members.user_id
    AND lower(invitee_email) = lower(auth.jwt()->>'email')
    AND status = 'accepted'
    AND access_level = 'write'
  )
);
