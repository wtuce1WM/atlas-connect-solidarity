import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ServiceListItemProps {
  service: string;
  currentBusinessId: string;
}

const ServiceListItem = ({ service, currentBusinessId }: ServiceListItemProps) => {
  const [otherCount, setOtherCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      const { count, error } = await supabase
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .contains("services", [service])
        .neq("id", currentBusinessId);

      if (!error && count !== null) {
        setOtherCount(count);
      }
    };

    fetchCount();
  }, [service, currentBusinessId]);

  return (
    <li className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
        {service}
      </span>
      {otherCount !== null && otherCount > 0 && (
        <Link
          to={`/service/${encodeURIComponent(service)}`}
          className="text-xs text-primary hover:underline ml-4"
        >
          → autres établissements avec ce service ({otherCount})
        </Link>
      )}
    </li>
  );
};

export default ServiceListItem;
