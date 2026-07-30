import { useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { verifySession } from "@/hooks/useAuthSession";

const hasBackofficeAccess = (roles: Array<{ role: string }> | null | undefined) =>
  !!roles?.some((r) => r.role === "admin" || r.role === "staff");

const StaffRouteGuard = ({ children }: { children: ReactNode }) => {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      // Vérification serveur (pas seulement le localStorage)
      const { user } = await verifySession();
      if (!user) { navigate("/staff/login"); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (!hasBackofficeAccess(roles as Array<{ role: string }> | null | undefined)) {
        await supabase.auth.signOut();
        navigate("/staff/login");
        return;
      }
      setAuthorized(true);
    };
    check();
  }, [navigate]);


  if (authorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default StaffRouteGuard;
