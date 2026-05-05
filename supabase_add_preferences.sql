
-- Add preferences column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
  "hideBalances": true,
  "showInstantMove": true,
  "showMonthlyTrend": true,
  "showExpenseDistribution": true,
  "customCategories": { "income": [], "expense": [] },
  "customRoles": []
}'::JSONB;

-- Ensure RLS allows users to update their own profile (which includes preferences)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Ensure RLS allows users to read profiles of households they are members of (to get preferences)
DROP POLICY IF EXISTS "Shared access SELECT profiles" ON public.profiles;
CREATE POLICY "Shared access SELECT profiles" ON public.profiles
FOR SELECT USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.household_invitations
    WHERE household_id = profiles.id
    AND lower(invitee_email) = lower(auth.jwt()->>'email')
    AND status = 'accepted'
  )
);
