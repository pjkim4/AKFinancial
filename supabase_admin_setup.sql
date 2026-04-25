-- 1. Add new columns to the profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Approve and promote existing users so you are not locked out!
UPDATE public.profiles SET is_approved = true, is_admin = true;

-- 3. Create a helper function to safely check for admin status without infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create RLS Policies for Admin operations on profiles
-- This allows admins to update other users' profiles (like toggling is_approved)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING ( public.is_admin() );

-- This ensures admins can see all profiles (in case your current select policy is restrictive)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING ( public.is_admin() );
