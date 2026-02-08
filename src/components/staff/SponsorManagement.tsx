import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Star } from "lucide-react";

const SponsorManagement = () => {
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-gold" />
            Sponsors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Aucun sponsor pour le moment. Cliquez sur "Nouveau sponsor" pour en ajouter un.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SponsorManagement;
