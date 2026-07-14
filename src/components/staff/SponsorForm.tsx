import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Upload, X, Loader2 } from "lucide-react";

interface City {
  id: string;
  name_fr: string;
  priority_score: number | null;
}

interface SponsorFormProps {
  sponsor?: any;
  zone: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const LANGUAGES = [
  { code: "fr", label: "Français", flag: "🇫🇷", required: true },
  { code: "en", label: "English", flag: "🇬🇧", required: false },
  { code: "ar", label: "العربية", flag: "🇲🇦", required: false },
];

const SponsorForm = ({ sponsor, zone, onSuccess, onCancel }: SponsorFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState("fr");

  const ZONE_OPTIONS = [
    { value: "home", label: "Accueil" },
    { value: "category", label: "Catégorie" },
    { value: "city", label: "Ville" },
  ];
  
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);

  const [formData, setFormData] = useState({
    zones: sponsor?.zones || (zone ? [zone] : ["home"]),
    city_ids: sponsor?.city_ids || [],
    sort_order: sponsor?.sort_order || 0,
    is_active: sponsor?.is_active ?? true,
    
    // French
    name_fr: sponsor?.name_fr || "",
    url_fr: sponsor?.url_fr || "",
    logo_big_url_fr: sponsor?.logo_big_url_fr || "",
    logo_small_url_fr: sponsor?.logo_small_url_fr || "",
    image_big_url_fr: sponsor?.image_big_url_fr || "",
    image_small_url_fr: sponsor?.image_small_url_fr || "",
    
    // English
    name_en: sponsor?.name_en || "",
    url_en: sponsor?.url_en || "",
    logo_big_url_en: sponsor?.logo_big_url_en || "",
    logo_small_url_en: sponsor?.logo_small_url_en || "",
    image_big_url_en: sponsor?.image_big_url_en || "",
    image_small_url_en: sponsor?.image_small_url_en || "",
    
    // Arabic
    name_ar: sponsor?.name_ar || "",
    url_ar: sponsor?.url_ar || "",
    logo_big_url_ar: sponsor?.logo_big_url_ar || "",
    logo_small_url_ar: sponsor?.logo_small_url_ar || "",
    image_big_url_ar: sponsor?.image_big_url_ar || "",
    image_small_url_ar: sponsor?.image_small_url_ar || "",
    
    // Internal
    internal_notes: "",
  });

  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    const fetchCities = async () => {
      setLoadingCities(true);
      const { data } = await supabase
        .from('cities')
        .select('id, name_fr, priority_score')
        .order('priority_score', { ascending: false });
      setCities(data || []);
      setLoadingCities(false);
    };
    fetchCities();
    if (sponsor?.id) {
      supabase
        .from('sponsor_internal_notes')
        .select('notes')
        .eq('sponsor_id', sponsor.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.notes) setFormData(prev => ({ ...prev, internal_notes: data.notes }));
        });
    }
  }, [sponsor?.id]);

  const handleInputChange = (field: string, value: string | number | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (field: string, file: File) => {
    setUploading(field);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `sponsors/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('sponsor-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('sponsor-assets')
        .getPublicUrl(filePath);

      handleInputChange(field, publicUrl);
      toast({ title: "Succès", description: "Image uploadée avec succès." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Erreur lors de l'upload.",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name_fr.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom en français est obligatoire.",
      });
      return;
    }

    setLoading(true);
    try {
      const { internal_notes, ...sponsorPayload } = formData;
      let sponsorId = sponsor?.id;
      if (sponsor?.id) {
        const { error } = await supabase
          .from('sponsors')
          .update(sponsorPayload)
          .eq('id', sponsor.id);
        if (error) throw error;
        toast({ title: "Succès", description: "Sponsor mis à jour." });
      } else {
        const { data, error } = await supabase
          .from('sponsors')
          .insert(sponsorPayload)
          .select('id')
          .single();
        if (error) throw error;
        sponsorId = data?.id;
        toast({ title: "Succès", description: "Sponsor créé." });
      }
      if (sponsorId) {
        const notesText = (internal_notes || "").trim();
        if (notesText) {
          await supabase
            .from('sponsor_internal_notes')
            .upsert({ sponsor_id: sponsorId, notes: notesText }, { onConflict: 'sponsor_id' });
        } else {
          await supabase.from('sponsor_internal_notes').delete().eq('sponsor_id', sponsorId);
        }
      }
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Erreur lors de l'enregistrement.",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderImageUpload = (field: string, label: string, lang: string) => {
    const fieldKey = `${field}_${lang}` as keyof typeof formData;
    const value = formData[fieldKey] as string;
    const isUploading = uploading === fieldKey;

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <Input
              value={value}
              onChange={(e) => handleInputChange(fieldKey, e.target.value)}
              placeholder="URL de l'image..."
              className="mb-2"
            />
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(fieldKey, file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload
                  </span>
                </Button>
              </label>
              {value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleInputChange(fieldKey, "")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {value && (
            <div className="w-20 h-20 border rounded overflow-hidden flex-shrink-0 bg-muted">
              <img src={value} alt="" className="w-full h-full object-contain" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLanguageTab = (lang: { code: string; label: string; flag: string; required: boolean }) => {
    const nameField = `name_${lang.code}` as keyof typeof formData;
    const urlField = `url_${lang.code}` as keyof typeof formData;

    return (
      <TabsContent key={lang.code} value={lang.code} className="space-y-6 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span>{lang.flag}</span>
              {lang.label}
              {lang.required && <span className="text-destructive">*</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Nom {lang.required && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  value={formData[nameField] as string}
                  onChange={(e) => handleInputChange(nameField, e.target.value)}
                  placeholder={`Nom du sponsor en ${lang.label.toLowerCase()}...`}
                  dir={lang.code === "ar" ? "rtl" : "ltr"}
                />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={formData[urlField] as string}
                  onChange={(e) => handleInputChange(urlField, e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderImageUpload("logo_big_url", "Logo (grande taille)", lang.code)}
              {renderImageUpload("logo_small_url", "Logo (petite taille)", lang.code)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderImageUpload("image_big_url", "Image (grande taille)", lang.code)}
              {renderImageUpload("image_small_url", "Image (petite taille)", lang.code)}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with sticky save buttons */}
      <div className="sticky top-0 z-10 bg-muted py-4 -mx-4 px-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h2 className="text-xl font-bold">
              {sponsor ? "Modifier le sponsor" : "Nouveau sponsor"}
            </h2>
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Paramètres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Zones d'affichage</Label>
              <div className="flex flex-col gap-2 pt-1">
                {ZONE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`zone-${option.value}`}
                      checked={formData.zones.includes(option.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleInputChange("zones", [...formData.zones, option.value]);
                        } else {
                          handleInputChange("zones", formData.zones.filter((z: string) => z !== option.value));
                        }
                      }}
                    />
                    <Label htmlFor={`zone-${option.value}`} className="font-normal cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ordre d'affichage</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => handleInputChange("sort_order", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Actif</Label>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange("is_active", checked)}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.is_active ? "Visible sur le site" : "Masqué"}
                </span>
              </div>
            </div>
          </div>

          {/* Cities Selection */}
          <div className="space-y-2">
            <Label>Villes ciblées (optionnel)</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Sélectionnez les villes où ce sponsor doit apparaître. Laissez vide pour toutes les villes.
            </p>
            {loadingCities ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des villes...
              </div>
            ) : (
              <ScrollArea className="h-48 border rounded-md p-3">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {cities.map((city) => (
                    <div key={city.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`city-${city.id}`}
                        checked={formData.city_ids.includes(city.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleInputChange("city_ids", [...formData.city_ids, city.id]);
                          } else {
                            handleInputChange("city_ids", formData.city_ids.filter((id: string) => id !== city.id));
                          }
                        }}
                      />
                      <Label htmlFor={`city-${city.id}`} className="font-normal cursor-pointer text-sm">
                        {city.name_fr}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {formData.city_ids.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {formData.city_ids.length} ville(s) sélectionnée(s)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Language Tabs */}
      <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
        <TabsList>
          {LANGUAGES.map((lang) => (
            <TabsTrigger key={lang.code} value={lang.code} className="gap-2">
              <span>{lang.flag}</span>
              {lang.label}
              {lang.required && <span className="text-destructive">*</span>}
            </TabsTrigger>
          ))}
        </TabsList>
        {LANGUAGES.map(renderLanguageTab)}
      </Tabs>

      {/* Internal Notes Card - At bottom */}
      <Card className="border-amber-500/50 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-amber-800">Note interne</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Textarea
              value={formData.internal_notes}
              onChange={(e) => {
                const value = e.target.value.slice(0, 500);
                handleInputChange("internal_notes", value);
              }}
              placeholder="Notes internes (non visibles sur le site)..."
              className="min-h-[100px] bg-white"
              maxLength={500}
            />
            <p className="text-sm text-muted-foreground text-right">
              {formData.internal_notes.length}/500 caractères
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bottom save button */}
      <div className="sticky bottom-0 bg-muted py-4 -mx-4 px-4 border-t">
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SponsorForm;
