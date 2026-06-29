import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AnalyticsRange = "7d" | "30d" | "90d" | "12m";

export interface BusinessAnalytics {
  range: AnalyticsRange;
  since: string;
  totals: Record<string, number>;
  previous_totals: Record<string, number>;
  timeseries: Array<{ day: string; views: number; intents: number }>;
  by_source_page: Array<{ source_page: string; c: number }>;
  by_country: Array<{ country: string; c: number }>;
  by_device: Array<{ device: string; c: number }>;
  top_referrers: Array<{ referrer_domain: string; c: number }>;
}

export function useBusinessAnalytics(businessId: string | null | undefined, range: AnalyticsRange = "30d") {
  return useQuery({
    queryKey: ["business-analytics", businessId, range],
    queryFn: async (): Promise<BusinessAnalytics> => {
      if (!businessId) throw new Error("missing business id");
      const { data, error } = await supabase.rpc("get_business_analytics", {
        p_business_id: businessId,
        p_range: range,
      });
      if (error) throw error;
      return data as unknown as BusinessAnalytics;
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}
