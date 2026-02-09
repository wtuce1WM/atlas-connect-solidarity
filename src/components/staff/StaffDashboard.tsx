import { useMemo } from "react";
import {
  Building2,
  Eye,
  AlertTriangle,
  ImageOff,
  MapPinOff,
  FileWarning,
  Clock,
  Plus,
  Folder,
  MapPin,
  UserCheck,
  Star,
  Award,
  Gem,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

interface StaffDashboardProps {
  businesses: Business[];
  onNavigateTab: (tab: string) => void;
  onNewBusiness: () => void;
  onEditBusiness: (business: Business) => void;
}

const StaffDashboard = ({ businesses, onNavigateTab, onNewBusiness, onEditBusiness }: StaffDashboardProps) => {
  // === STATISTICS ===
  const stats = useMemo(() => {
    const total = businesses.length;
    const active = businesses.filter(b => b.is_active).length;
    const verified = businesses.filter(b => b.wtuce_status === "verified").length;
    const pending = businesses.filter(b => b.wtuce_status === "pending").length;
    const featured = businesses.filter(b => b.is_featured).length;

    // Cities breakdown
    const cityCounts: Record<string, number> = {};
    businesses.forEach(b => {
      cityCounts[b.city] = (cityCounts[b.city] || 0) + 1;
    });
    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Category breakdown
    const catCounts: Record<string, number> = {};
    businesses.forEach(b => {
      if (b.main_category) catCounts[b.main_category] = (catCounts[b.main_category] || 0) + 1;
    });
    const topCategories = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return { total, active, verified, pending, featured, topCities, topCategories };
  }, [businesses]);

  // === QUALITY ALERTS ===
  const alerts = useMemo(() => {
    const noImages = businesses.filter(b => !b.images || b.images.length === 0);
    const noDescription = businesses.filter(b => !b.description || b.description.trim().length === 0);
    const noGPS = businesses.filter(b => !b.latitude || !b.longitude);
    const noPhone = businesses.filter(b => !b.phone);
    const noCategory = businesses.filter(b => !b.main_category);
    return { noImages, noDescription, noGPS, noPhone, noCategory };
  }, [businesses]);

  // === RECENT ACTIVITY ===
  const recentBusinesses = useMemo(() => {
    return [...businesses]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 8);
  }, [businesses]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `il y a ${diffMins}min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays < 7) return `il y a ${diffDays}j`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={Building2} label="Total" value={stats.total} color="text-gold bg-gold/10" />
        <StatCard icon={Eye} label="Actives" value={stats.active} color="text-green-600 bg-green-100" />
        <StatCard icon={Eye} label="Vérifiées" value={stats.verified} color="text-primary bg-primary/10" />
        <StatCard icon={Clock} label="En attente" value={stats.pending} color="text-amber-600 bg-amber-100" />
        <StatCard icon={Star} label="En vedette" value={stats.featured} color="text-yellow-500 bg-yellow-50" />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Raccourcis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onNewBusiness} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle entreprise
            </Button>
            <Button variant="outline" onClick={() => onNavigateTab("businesses")}>
              <Building2 className="h-4 w-4 mr-2" />
              Entreprises
            </Button>
            <Button variant="outline" onClick={() => onNavigateTab("categories")}>
              <Folder className="h-4 w-4 mr-2" />
              Catégories
            </Button>
            <Button variant="outline" onClick={() => onNavigateTab("locations")}>
              <MapPin className="h-4 w-4 mr-2" />
              Pays & Villes
            </Button>
            <Button variant="outline" onClick={() => onNavigateTab("labels")}>
              <Award className="h-4 w-4 mr-2" />
              Labels
            </Button>
            <Button variant="outline" onClick={() => onNavigateTab("gammes")}>
              <Gem className="h-4 w-4 mr-2" />
              Gammes
            </Button>
            <Button variant="outline" onClick={() => onNavigateTab("sponsors")}>
              <Star className="h-4 w-4 mr-2" />
              Sponsors
            </Button>
            <Button variant="outline" onClick={() => onNavigateTab("affiliates")}>
              <UserCheck className="h-4 w-4 mr-2" />
              Affiliés
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertes qualité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AlertRow
              icon={ImageOff}
              label="Sans images"
              count={alerts.noImages.length}
              color="text-amber-600"
              items={alerts.noImages}
              onEdit={onEditBusiness}
            />
            <AlertRow
              icon={FileWarning}
              label="Sans description"
              count={alerts.noDescription.length}
              color="text-orange-600"
              items={alerts.noDescription}
              onEdit={onEditBusiness}
            />
            <AlertRow
              icon={MapPinOff}
              label="Sans coordonnées GPS"
              count={alerts.noGPS.length}
              color="text-red-600"
              items={alerts.noGPS}
              onEdit={onEditBusiness}
            />
            <AlertRow
              icon={AlertTriangle}
              label="Sans téléphone"
              count={alerts.noPhone.length}
              color="text-yellow-600"
              items={alerts.noPhone}
              onEdit={onEditBusiness}
            />
            <AlertRow
              icon={Folder}
              label="Sans catégorie"
              count={alerts.noCategory.length}
              color="text-purple-600"
              items={alerts.noCategory}
              onEdit={onEditBusiness}
            />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentBusinesses.map(b => (
                <button
                  key={b.id}
                  onClick={() => onEditBusiness(b)}
                  className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.city} · {b.main_category || "—"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {formatDate(b.updated_at)}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Par ville</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topCities.map(([city, count]) => (
                <div key={city} className="flex items-center justify-between">
                  <span className="text-sm">{city}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-gold/20 rounded-full w-32">
                      <div
                        className="h-2 bg-gold rounded-full"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topCategories.map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-sm">{cat}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-primary/20 rounded-full w-32">
                      <div
                        className="h-2 bg-primary rounded-full"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// --- Sub-components ---

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-background rounded-lg p-4 border">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${color.split(" ").slice(1).join(" ")}`}>
          <Icon className={`h-5 w-5 ${color.split(" ")[0]}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
      </div>
    </div>
  );
}

function AlertRow({
  icon: Icon,
  label,
  count,
  color,
  items,
  onEdit,
}: {
  icon: any;
  label: string;
  count: number;
  color: string;
  items: Business[];
  onEdit: (b: Business) => void;
}) {
  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm">{label}</span>
      </div>
      <Badge variant="secondary" className="font-mono">
        {count}
      </Badge>
    </div>
  );
}

export default StaffDashboard;
