
-- Add user_id column to club_members to link to auth users
ALTER TABLE public.club_members ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Allow members to view their own membership
CREATE POLICY "Members can view their own membership"
ON public.club_members
FOR SELECT
USING (auth.uid() = user_id);
