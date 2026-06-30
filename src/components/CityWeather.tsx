import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Cloud, Droplets, Wind, Thermometer, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface WeatherData {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  city_name: string;
}

interface CityWeatherProps {
  city: string;
}

const LABELS = {
  fr: {
    load_error: "Impossible de charger la météo",
    data_error: "Données météo non disponibles",
    conn_error: "Erreur de connexion",
  },
  en: {
    load_error: "Unable to load weather",
    data_error: "Weather data unavailable",
    conn_error: "Connection error",
  },
  ar: {
    load_error: "تعذّر تحميل الطقس",
    data_error: "بيانات الطقس غير متاحة",
    conn_error: "خطأ في الاتصال",
  },
};

const CityWeather = ({ city }: CityWeatherProps) => {
  const { language } = useLanguage();
  const L = LABELS[language as keyof typeof LABELS] ?? LABELS.fr;

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!city) return;
      
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-weather', {
          body: { city },
        });

        if (fnError) {
          console.error('Error calling weather function:', fnError);
          setError(L.load_error);
          return;
        }

        if (data.error) {
          console.error('Weather API error:', data.error);
          setError(L.data_error);
          return;
        }

        setWeather(data);
      } catch (err) {
        console.error('Failed to fetch weather:', err);
        setError(L.conn_error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
  }, [city, language]);

  if (isLoading) {
    return (
      <Card className="border-gold border-[5px]">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return null;
  }

  const iconUrl = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;

  return (
    <Card className="border-gold border-[5px]">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <img 
            src={iconUrl} 
            alt={weather.description}
            className="w-12 h-12"
          />
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{weather.temp}°C</span>
              <span className="text-sm text-muted-foreground capitalize">{weather.description}</span>
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Thermometer className="h-3 w-3" />
                {weather.temp_min}° / {weather.temp_max}°
              </span>
              <span className="flex items-center gap-1">
                <Droplets className="h-3 w-3" />
                {weather.humidity}%
              </span>
              <span className="flex items-center gap-1">
                <Wind className="h-3 w-3" />
                {weather.wind_speed} km/h
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CityWeather;
