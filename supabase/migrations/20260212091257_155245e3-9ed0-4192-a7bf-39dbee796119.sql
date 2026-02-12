
CREATE TABLE public.staff_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  content text DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view notes" ON public.staff_notes FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert notes" ON public.staff_notes FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update notes" ON public.staff_notes FOR UPDATE USING (is_staff(auth.uid()));

INSERT INTO public.staff_notes (key, content) VALUES ('dashboard_internal_note', '');
