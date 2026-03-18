
CREATE TABLE public.staff_user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read own note" ON public.staff_user_notes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND is_staff(auth.uid()));

CREATE POLICY "Staff can insert own note" ON public.staff_user_notes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_staff(auth.uid()));

CREATE POLICY "Staff can update own note" ON public.staff_user_notes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND is_staff(auth.uid()));

CREATE UNIQUE INDEX staff_user_notes_user_id_unique ON public.staff_user_notes (user_id);
