-- Create categories table with multilingual support
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_ar TEXT,
  icon TEXT, -- Lucide icon name
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_ar TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create services table (linked to subcategories)
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_ar TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Categories are viewable by everyone"
ON public.categories FOR SELECT USING (true);

CREATE POLICY "Staff can insert categories"
ON public.categories FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update categories"
ON public.categories FOR UPDATE USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete categories"
ON public.categories FOR DELETE USING (is_staff(auth.uid()));

-- Subcategories policies
CREATE POLICY "Subcategories are viewable by everyone"
ON public.subcategories FOR SELECT USING (true);

CREATE POLICY "Staff can insert subcategories"
ON public.subcategories FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update subcategories"
ON public.subcategories FOR UPDATE USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete subcategories"
ON public.subcategories FOR DELETE USING (is_staff(auth.uid()));

-- Services policies
CREATE POLICY "Services are viewable by everyone"
ON public.services FOR SELECT USING (true);

CREATE POLICY "Staff can insert services"
ON public.services FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update services"
ON public.services FOR UPDATE USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete services"
ON public.services FOR DELETE USING (is_staff(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subcategories_updated_at
BEFORE UPDATE ON public.subcategories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster lookups
CREATE INDEX idx_subcategories_category_id ON public.subcategories(category_id);
CREATE INDEX idx_services_subcategory_id ON public.services(subcategory_id);