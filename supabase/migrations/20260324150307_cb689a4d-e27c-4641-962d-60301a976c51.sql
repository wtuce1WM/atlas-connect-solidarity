
CREATE TABLE public.blocked_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocked_domains_select" ON public.blocked_domains FOR SELECT TO public USING (true);
CREATE POLICY "blocked_domains_insert" ON public.blocked_domains FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "blocked_domains_update" ON public.blocked_domains FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "blocked_domains_delete" ON public.blocked_domains FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- Seed with existing known blocked domains
INSERT INTO public.blocked_domains (domain, reason) VALUES
  ('www.mandarinoriental.com', 'X-Frame-Options: DENY'),
  ('www.riadelhara.com', 'X-Frame-Options: DENY'),
  ('www.jetex.com', 'X-Frame-Options: DENY'),
  ('www.selman-marrakech.com', 'X-Frame-Options: DENY'),
  ('reservation.marrakech.maison-stella-cadente.com', 'X-Frame-Options: DENY'),
  ('www.sevenrooms.com', 'X-Frame-Options: DENY'),
  ('tickets.jardinmajorelle.com', 'X-Frame-Options: DENY'),
  ('permalink.fairmont.com', 'X-Frame-Options: SAMEORIGIN'),
  ('www.lunajets.com', 'X-Frame-Options: SAMEORIGIN'),
  ('www.essaouirakitesurfschool.com', 'X-Frame-Options: SAMEORIGIN'),
  ('www.cenizaro.com', 'X-Frame-Options: SAMEORIGIN'),
  ('linktr.ee', 'X-Frame-Options: SAMEORIGIN'),
  ('app.thebookingbutton.com', 'X-Frame-Options: SAMEORIGIN'),
  ('resnexus.com', 'X-Frame-Options: SAMEORIGIN'),
  ('www.foundouk.com', 'X-Frame-Options: SAMEORIGIN'),
  ('goodkarmatravels.jimdosite.com', 'X-Frame-Options: SAMEORIGIN'),
  ('reservations.verticalbooking.com', 'X-Frame-Options: SAMEORIGIN'),
  ('rentaphone.ma', 'X-Frame-Options: SAMEORIGIN'),
  ('fr.hotels.com', 'X-Frame-Options: SAMEORIGIN'),
  ('www.riadtammam.com', 'X-Frame-Options: SAMEORIGIN'),
  ('book-directonline.com', 'X-Frame-Options: SAMEORIGIN'),
  ('mamounia.com', 'X-Frame-Options: SAMEORIGIN'),
  ('www.nobuhotels.com', 'X-Frame-Options: SAMEORIGIN'),
  ('www.oberoihotels.com', 'X-Frame-Options: SAMEORIGIN'),
  ('www.widiane.net', 'X-Frame-Options: SAMEORIGIN'),
  ('www.cactusthiemann.com', 'X-Frame-Options: SAMEORIGIN'),
  ('direct-book.com', 'X-Frame-Options: SAMEORIGIN'),
  ('xaluca.com', 'X-Frame-Options: SAMEORIGIN'),
  ('www.onomohotels.com', 'CSP frame-ancestors: self'),
  ('www.dabadoc.com', 'CSP frame-ancestors: self'),
  ('www.relaischateaux.com', 'CSP frame-ancestors: self'),
  ('darbacha.com', 'HTTP 500 (site en panne)'),
  ('almoravidkoubba.com', 'HTTP 500 (site en panne)'),
  ('menaragardens.com', 'HTTP 500 (site en panne)'),
  ('www.opentable.co.uk', 'Connexion échouée'),
  ('dentistmarrakech.com', 'Connexion échouée'),
  ('www.simplebooking.it', 'Connexion échouée'),
  ('www.mazaganbeachresort.com', 'Connexion échouée'),
  ('omyoga.ma', 'Connexion échouée'),
  ('www.supratours.ma', 'Connexion échouée'),
  ('beautynow.ma', 'Connexion échouée'),
  ('www.lemapmarrakech.com', 'Connexion échouée'),
  ('travelbase.fr', 'X-Frame-Options: SAMEORIGIN')
ON CONFLICT (domain) DO NOTHING;
