import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Award, Link, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LabelOption {
  id: string;
  name_fr: string;
  image_url: string | null;
}

interface BusinessLabel {
  id?: string;
  label_id: string;
  custom_url: string;
  label?: LabelOption;
}

interface BusinessLabelsEditorProps {
  businessId?: string;
  value: BusinessLabel[];
  onChange: (labels: BusinessLabel[]) => void;
}

const BusinessLabelsEditor = ({ businessId, value, onChange }: BusinessLabelsEditorProps) => {
  const [availableLabels, setAvailableLabels] = useState<LabelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch available labels
  useEffect(() => {
    const fetchLabels = async () => {
      const { data, error } = await supabase
        .from("labels" as any)
        .select("id, name_fr, image_url")
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching labels:", error);
      } else {
        setAvailableLabels((data as unknown as LabelOption[]) || []);
      }
      setLoading(false);
    };

    fetchLabels();
  }, []);

  // Fetch business labels if businessId is provided
  useEffect(() => {
    if (!businessId) return;

    const fetchBusinessLabels = async () => {
      const { data, error } = await supabase
        .from("business_labels" as any)
        .select("id, label_id, custom_url")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching business labels:", error);
      } else if (data && data.length > 0) {
        onChange(data as unknown as BusinessLabel[]);
      }
    };

    fetchBusinessLabels();
  }, [businessId]);

  const addLabel = useCallback(() => {
    // Find first available label not already added
    const usedLabelIds = value.map(bl => bl.label_id);
    const availableLabel = availableLabels.find(l => !usedLabelIds.includes(l.id));
    
    if (availableLabel) {
      onChange([...value, { label_id: availableLabel.id, custom_url: "" }]);
    } else if (availableLabels.length > 0) {
      onChange([...value, { label_id: availableLabels[0].id, custom_url: "" }]);
    }
  }, [value, availableLabels, onChange]);

  const removeLabel = useCallback((index: number) => {
    onChange(value.filter((_, i) => i !== index));
  }, [value, onChange]);

  const updateLabel = useCallback((index: number, field: keyof BusinessLabel, newValue: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: newValue };
    onChange(updated);
  }, [value, onChange]);

  const getLabelInfo = (labelId: string) => {
    return availableLabels.find(l => l.id === labelId);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Chargement des labels...</span>
      </div>
    );
  }

  if (availableLabels.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg text-center">
        <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Aucun label disponible.</p>
        <p className="text-xs mt-1">Créez d'abord des labels dans l'onglet "Labels".</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {value.map((bl, index) => {
        const labelInfo = getLabelInfo(bl.label_id);
        return (
          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-background">
            {/* Label image preview */}
            <div className="flex-shrink-0">
              {labelInfo?.image_url ? (
                <img
                  src={labelInfo.image_url}
                  alt={labelInfo.name_fr}
                  className="h-12 w-12 object-contain border rounded bg-white p-1"
                />
              ) : (
                <div className="h-12 w-12 border rounded bg-muted flex items-center justify-center">
                  <Award className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Label selector and URL */}
            <div className="flex-1 space-y-2">
              <Select
                value={bl.label_id}
                onValueChange={(val) => updateLabel(index, "label_id", val)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionner un label..." />
                </SelectTrigger>
                <SelectContent>
                  {availableLabels.map((label) => (
                    <SelectItem key={label.id} value={label.id}>
                      {label.name_fr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Link className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={bl.custom_url}
                  onChange={(e) => updateLabel(index, "custom_url", e.target.value)}
                  placeholder="URL spécifique (optionnel)"
                  type="url"
                  className="h-9"
                />
              </div>
            </div>

            {/* Remove button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={() => removeLabel(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      {/* Add button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addLabel}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Ajouter un label
      </Button>
    </div>
  );
};

export default BusinessLabelsEditor;
