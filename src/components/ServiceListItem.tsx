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
          .order("icon", { ascending: false, nullsFirst: false })
          .limit(5),
      ]);

      if (!countRes.error && countRes.count !== null) {
        setOtherCount(countRes.count);
      }
      if (!iconRes.error && iconRes.data && iconRes.data.length > 0) {
        let foundIcon: string | null = null;
        let fallbackSubIcon: string | null = null;
        for (const row of iconRes.data) {
          if (row.icon) { foundIcon = row.icon; break; }
          if (!fallbackSubIcon) {
            fallbackSubIcon = (row as any).subcategories?.icon || null;
          }
        }
        setIconName(foundIcon || fallbackSubIcon);
      }
    };

    fetchData();
  }, [service, currentBusinessId]);

  return (
    <li className="flex flex-col gap-1">
      <span className="flex items-center gap-2 text-sm">
        {iconName ? (
          <DynamicIcon
            name={iconName}
            className="h-3.5 w-3.5 flex-shrink-0 text-primary"
            fallback={<span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
          />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
        )}
        <span className="first-letter:uppercase">{service.charAt(0).toUpperCase() + service.slice(1)}</span>
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
