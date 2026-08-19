CREATE OR REPLACE FUNCTION public.protect_affiliate_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role / traitements serveur (pas de JWT utilisateur) : autorisé
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- staff / admin : autorisé
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') THEN
    RETURN NEW;
  END IF;

  -- sinon : on restaure les colonnes d'entitlements
  NEW.max_businesses      := OLD.max_businesses;
  NEW.has_video_studio    := OLD.has_video_studio;
  NEW.has_dashboard       := OLD.has_dashboard;
  NEW.has_showcase_site   := OLD.has_showcase_site;
  NEW.has_custom_domain   := OLD.has_custom_domain;
  NEW.has_guide           := OLD.has_guide;
  NEW.has_ai_assistant    := OLD.has_ai_assistant;
  NEW.has_blog_export     := OLD.has_blog_export;
  NEW.has_nearby_widget   := OLD.has_nearby_widget;
  NEW.has_email_signature := OLD.has_email_signature;
  NEW.is_active           := OLD.is_active;
  NEW.account_type        := OLD.account_type;
  NEW.user_id             := OLD.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_affiliate_entitlements_trg ON public.affiliates;

CREATE TRIGGER protect_affiliate_entitlements_trg
BEFORE UPDATE ON public.affiliates
FOR EACH ROW
EXECUTE FUNCTION public.protect_affiliate_entitlements();