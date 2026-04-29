-- ==========================================
-- FIX FOR CRITICAL SECURITY VULNERABILITY
-- ==========================================
-- Issue: "Row-Level Security is not enabled" on household_invitations
-- This allows anyone with the project URL to read, insert, update, or delete invitations.

-- 1. Enable Row-Level Security on the household_invitations table
ALTER TABLE public.household_invitations ENABLE ROW LEVEL SECURITY;

-- 2. Users can view invitations they sent or received
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.household_invitations;
CREATE POLICY "Users can view their own invitations" ON public.household_invitations
FOR SELECT
USING (
  auth.uid() = inviter_id OR 
  lower(auth.jwt()->>'email') = lower(invitee_email)
);

-- 3. Users can insert invitations they send
DROP POLICY IF EXISTS "Users can insert invitations they send" ON public.household_invitations;
CREATE POLICY "Users can insert invitations they send" ON public.household_invitations
FOR INSERT
WITH CHECK (
  auth.uid() = inviter_id
);

-- 4. Users can update invitations they received (to accept/reject) or sent (to cancel/update)
DROP POLICY IF EXISTS "Users can update their invitations" ON public.household_invitations;
CREATE POLICY "Users can update their invitations" ON public.household_invitations
FOR UPDATE
USING (
  auth.uid() = inviter_id OR 
  lower(auth.jwt()->>'email') = lower(invitee_email)
);

-- 5. Users can delete invitations they sent or received
DROP POLICY IF EXISTS "Users can delete their invitations" ON public.household_invitations;
CREATE POLICY "Users can delete their invitations" ON public.household_invitations
FOR DELETE
USING (
  auth.uid() = inviter_id OR 
  lower(auth.jwt()->>'email') = lower(invitee_email)
);
