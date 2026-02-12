import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DynamicIcon from "@/components/DynamicIcon";

interface ServiceListItemProps {
  service: string;
  currentBusinessId: string;
  city?: string;
}

const ServiceListItem = ({ service, currentBusinessId, city }: ServiceListItemProps) => {
  const [otherCount, setOtherCount] = useState<number | null>(null);
  const [iconName, setIconName] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch count + icon in parallel
      const [countRes, iconRes] = await Promise.all([
        supabase
          .from("businesses")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .contains("services", [service])
          .neq("id", currentBusinessId),
        supabase
          .from("services")
          .select("icon, subcategories(icon)")
          .eq("name_fr", service)
          .limit(1)
          .maybeSingle(),
      ]);

      if (!countRes.error && countRes.count !== null) {
        setOtherCount(countRes.count);
      }
      if (!iconRes.error && iconRes.data) {
        const svcIcon = iconRes.data.icon;
        const subIcon = (iconRes.data as any).subcategories?.icon;
        setIconName(svcIcon || subIcon || null);
      }
    };

    fetchData();
  }, [service, currentBusinessId]);

  return (
    <li className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        {iconName ? (
          <DynamicIcon
            name={iconName}
            className="h-4 w-4 flex-shrink-0 text-primary"
            fallback={<span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
          />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
        )}
        {service}
      </span>
      {otherCount !== null && otherCount > 0 && (
        <Link
          to={`/service/${encodeURIComponent(service)}${city ? `?city=${encodeURIComponent(city)}` : ''}`}
          className="text-xs text-primary hover:underline ml-6"
        >
          → autres établissements avec ce service ({otherCount})
        </Link>
      )}
    </li>
  );
};

export default ServiceListItem;
