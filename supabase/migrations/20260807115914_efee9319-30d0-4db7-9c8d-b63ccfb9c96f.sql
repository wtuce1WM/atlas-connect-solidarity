ALTER TABLE public.businesses ALTER COLUMN widget_theme SET DEFAULT 'light';
UPDATE public.businesses SET widget_theme = 'light' WHERE widget_theme IS NULL OR widget_theme NOT IN ('light','dark');