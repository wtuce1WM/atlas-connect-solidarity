-- Create affiliates table with all required fields
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Account info
  account_type text, -- Type de compte
  name text NOT NULL, -- Nom *
  ice text, -- ICE
  main_category text, -- Catégorie principale
  
  -- Contact info
  whatsapp text, -- WhatsApp
  phone text, -- Téléphone entreprise
  contact_email text, -- Email de contact (différent de email entreprise)
  contact_name text, -- Nom du contact
  contact_phone text, -- Téléphone du contact
  
  -- Internal
  internal_notes text, -- Note interne (staff uniquement)
  is_active boolean NOT NULL DEFAULT true, -- Actif/inactif
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- RLS policies: viewable by staff only
CREATE POLICY "Affiliates are viewable by staff"
  ON public.affiliates FOR SELECT
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can insert affiliates"
  ON public.affiliates FOR INSERT
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update affiliates"
  ON public.affiliates FOR UPDATE
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete affiliates"
  ON public.affiliates FOR DELETE
  USING (is_staff(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();