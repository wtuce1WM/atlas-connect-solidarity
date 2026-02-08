import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Star, Home, Folder, MapPin } from "lucide-react";

const SponsorManagement = () => {
  const [activeZone, setActiveZone] = useState("home");

  const renderEmptyState = (zoneName: string) => (
    <p className="text-muted-foreground text-center py-8">
      Aucun sponsor pour la zone "{zoneName}". Cliquez sur "Nouveau sponsor" pour en ajouter un.
    </p>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Sponsors</h2>
          <p className="text-muted-foreground">
            Gérez les sponsors et partenaires affichés sur le site
          </p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau sponsor
        </Button>
      </div>

      <Tabs value={activeZone} onValueChange={setActiveZone}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="home" className="gap-2">
            <Home className="h-4 w-4" />
            Accueil
          </TabsTrigger>
          <TabsTrigger value="category" className="gap-2">
            <Folder className="h-4 w-4" />
            Catégorie
          </TabsTrigger>
          <TabsTrigger value="city" className="gap-2">
            <MapPin className="h-4 w-4" />
            Ville
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-gold" />
                Sponsors - Page d'accueil
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderEmptyState("Accueil")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-gold" />
                Sponsors - Pages Catégories
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderEmptyState("Catégorie")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="city" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gold" />
                Sponsors - Pages Villes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderEmptyState("Ville")}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SponsorManagement;
