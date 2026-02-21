
-- Create club_members table for OWM Club registrations
CREATE TABLE public.club_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  nickname TEXT NOT NULL,
  city TEXT,
  country TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  skype TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public registration form)
CREATE POLICY "Anyone can register to club"
  ON public.club_members
  FOR INSERT
  WITH CHECK (true);

-- Only staff can view members
CREATE POLICY "Staff can view club members"
  ON public.club_members
  FOR SELECT
  USING (is_staff(auth.uid()));

-- Only staff can update members
CREATE POLICY "Staff can update club members"
  ON public.club_members
  FOR UPDATE
  USING (is_staff(auth.uid()));

-- Only staff can delete members
CREATE POLICY "Staff can delete club members"
  ON public.club_members
  FOR DELETE
  USING (is_staff(auth.uid()));
