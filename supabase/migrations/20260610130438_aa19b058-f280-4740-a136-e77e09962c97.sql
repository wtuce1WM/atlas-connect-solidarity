ALTER TABLE public.events ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Initialize sort_order from current updated_at order (newest first = lowest sort_order)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY updated_at DESC) * 10 AS rn
  FROM public.events
)
UPDATE public.events e SET sort_order = r.rn FROM ranked r WHERE r.id = e.id;

CREATE INDEX IF NOT EXISTS events_sort_order_idx ON public.events(sort_order);