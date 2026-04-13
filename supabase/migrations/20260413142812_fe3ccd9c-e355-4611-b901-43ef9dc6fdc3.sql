
CREATE TABLE public.kp_group_titles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kp_code text NOT NULL,
  kp_type text NOT NULL CHECK (kp_type IN ('kp1', 'kp2')),
  title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 50),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (kp_code, kp_type)
);

ALTER TABLE public.kp_group_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view kp group titles" ON public.kp_group_titles FOR SELECT USING (true);
CREATE POLICY "Staff can insert kp group titles" ON public.kp_group_titles FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update kp group titles" ON public.kp_group_titles FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete kp group titles" ON public.kp_group_titles FOR DELETE USING (is_staff(auth.uid()));
