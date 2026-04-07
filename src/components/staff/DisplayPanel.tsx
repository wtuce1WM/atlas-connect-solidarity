import React from "react";
import { HelpCircle, Monitor, ChevronRight } from "lucide-react";
import { HelpContentPanel } from "@/components/staff/ScrollToTopButton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DisplayParam = ({ label, value, preview }: { label: string; value: string; preview?: React.ReactNode }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
    {preview && <div className="shrink-0 mt-0.5">{preview}</div>}
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-mono text-foreground break-all">{value}</p>
    </div>
  </div>
);

const DisplayPanel = () => (
  <div className="flex gap-6 items-start">
    <div className="flex-1 min-w-0 space-y-6">
      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                <Monitor className="h-5 w-5" />
                Header
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Structure</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Balise HTML" value="<header>" />
                    <DisplayParam label="Position" value="fixed top-0 left-0 right-0" />
                    <DisplayParam label="Z-index" value="z-50" />
                    <DisplayParam label="Conteneur" value="container mx-auto" />
                    <DisplayParam label="Padding" value="px-4 py-3" />
                    <DisplayParam label="Layout" value="flex items-center justify-between gap-3" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Variants de fond</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DisplayParam label='variant="default"' value="bg-white" preview={<div className="w-8 h-8 rounded border bg-white" />} />
                    <DisplayParam label='variant="morocco"' value="bg-gradient-to-b from-morocco-red to-morocco-red/80 backdrop-blur-sm" preview={<div className="w-8 h-8 rounded border bg-gradient-to-b from-red-700 to-red-700/80" />} />
                    <DisplayParam label='variant="city"' value="bg-transparent" preview={<div className="w-8 h-8 rounded border bg-transparent" style={{ backgroundImage: 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%)', backgroundSize: '8px 8px' }} />} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Logo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Balise" value="<a> → <img> + <span>" />
                    <DisplayParam label="Image" value="logoGOLDsimpleSML.webp" />
                    <DisplayParam label="Taille image" value="h-9 w-9 object-contain" />
                    <DisplayParam label="Texte 1" value='"ONE WORLD"' preview={<span className="text-gold font-bold">ONE WORLD</span>} />
                    <DisplayParam label="Texte 2" value='"MOROCCO"' preview={<span className="text-black font-bold">MOROCCO</span>} />
                    <DisplayParam label="Police texte" value="text-lg font-bold tracking-tight" />
                    <DisplayParam label="Couleur texte 1" value="text-gold" preview={<div className="w-8 h-8 rounded border" style={{ backgroundColor: 'hsl(var(--gold))' }} />} />
                    <DisplayParam label="Couleur texte 2" value="text-black" preview={<div className="w-8 h-8 rounded border bg-black" />} />
                    <DisplayParam label="Responsive" value="hidden sm:inline (texte masqué mobile)" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Menu</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Icône ouvert" value="<X> (lucide)" />
                    <DisplayParam label="Icône fermé" value="<Menu> (lucide)" />
                    <DisplayParam label="Taille icône" value="h-6 w-6" />
                    <DisplayParam label="Couleur icône" value="text-black" />
                    <DisplayParam label="Fond dropdown" value="bg-background border-t border-border" />
                    <DisplayParam label="Layout dropdown" value="flex-col items-center gap-4 px-4 py-6" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Liens de navigation</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Lien</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Route</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Clé i18n</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">Style</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr><td className="py-2 pr-4">Notre Mission</td><td className="py-2 pr-4 font-mono text-xs">/mission</td><td className="py-2 pr-4 font-mono text-xs">footer.ourMission</td><td className="py-2 text-xs">text-foreground hover:text-gold</td></tr>
                        <tr><td className="py-2 pr-4">Recherche</td><td className="py-2 pr-4 font-mono text-xs">/search</td><td className="py-2 pr-4 font-mono text-xs">—</td><td className="py-2 text-xs">text-foreground hover:text-gold</td></tr>
                        <tr><td className="py-2 pr-4">Hôtels</td><td className="py-2 pr-4 font-mono text-xs">/hotels</td><td className="py-2 pr-4 font-mono text-xs">—</td><td className="py-2 text-xs">text-foreground hover:text-gold</td></tr>
                        <tr><td className="py-2 pr-4">Contact</td><td className="py-2 pr-4 font-mono text-xs">/contact</td><td className="py-2 pr-4 font-mono text-xs">footer.contact</td><td className="py-2 text-xs">text-foreground hover:text-gold</td></tr>
                        <tr><td className="py-2 pr-4 font-semibold">Rejoignez-nous</td><td className="py-2 pr-4 font-mono text-xs">/devenir-affilie</td><td className="py-2 pr-4 font-mono text-xs">nav.joinNow</td><td className="py-2 text-xs">bg-gold text-gold-foreground rounded-lg px-4 py-2 font-semibold</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Comportement</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DisplayParam label="Fermeture auto" value="Clic à l'extérieur (mousedown listener)" />
                    <DisplayParam label="Props" value='variant: "default" | "morocco" | "city"' />
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                Accueil
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Polices chargées (Google Fonts)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Josefin Sans (→ Venus)" value="300, 400, 600" preview={<span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 18, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>Marrakech</span>} />
                    <DisplayParam label="Libre Baskerville (→ Freight)" value="400, 700, 400 italic" preview={<span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16 }}>Au cœur de la Médina</span>} />
                    <DisplayParam label="Amiri" value="400, 700 (arabe)" preview={<span style={{ fontFamily: "'Amiri', serif", fontSize: 18 }}>عربي</span>} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Assignation des polices (index.css)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Balise / Classe</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Police</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Style</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">Aperçu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="py-2 pr-4 font-mono text-xs">body</td>
                          <td className="py-2 pr-4">Libre Baskerville, serif</td>
                          <td className="py-2 pr-4 text-xs">font-weight: 400, line-height: 1.8</td>
                          <td className="py-2"><span style={{ fontFamily: "'Libre Baskerville', serif" }}>Corps de texte</span></td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-mono text-xs">&lt;h1&gt;</td>
                          <td className="py-2 pr-4">Josefin Sans, sans-serif</td>
                          <td className="py-2 pr-4 text-xs">weight: 300, uppercase, tracking: 0.20em</td>
                          <td className="py-2"><span style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 300, textTransform: "uppercase" as const, letterSpacing: "0.20em", fontSize: 14 }}>MARRAKECH</span></td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-mono text-xs">&lt;h2&gt;</td>
                          <td className="py-2 pr-4">Josefin Sans, sans-serif</td>
                          <td className="py-2 pr-4 text-xs">weight: 300, uppercase, tracking: 0.15em</td>
                          <td className="py-2"><span style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 300, textTransform: "uppercase" as const, letterSpacing: "0.15em", fontSize: 14 }}>HÉBERGEMENTS</span></td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-mono text-xs">&lt;h3&gt;</td>
                          <td className="py-2 pr-4">Josefin Sans, sans-serif</td>
                          <td className="py-2 pr-4 text-xs">weight: 300, uppercase, tracking: 0.12em</td>
                          <td className="py-2"><span style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 300, textTransform: "uppercase" as const, letterSpacing: "0.12em", fontSize: 14 }}>SOUS-TITRE</span></td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-mono text-xs">.font-arabic</td>
                          <td className="py-2 pr-4">Amiri, Noto Sans Arabic</td>
                          <td className="py-2 pr-4 text-xs">—</td>
                          <td className="py-2"><span style={{ fontFamily: "'Amiri', serif" }}>نص عربي</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Typographie du Hero (HeroSection)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Sous-titre (plateforme)" value="text-sm md:text-base text-foreground/70 font-medium tracking-wide" />
                    <DisplayParam label="H1 principal" value="text-3xl md:text-4xl lg:text-5xl font-bold text-black" />
                    <DisplayParam label="H1 balise" value="<h1>" />
                    <DisplayParam label="H1 max-width" value="max-w-4xl" />
                    <DisplayParam label="H1 min-height" value="min-h-[4.5rem] md:min-h-[3rem]" />
                    <DisplayParam label="H1 alignement" value="text-center" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Onglets catégories</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Label actif" value="text-sm font-semibold text-black" />
                    <DisplayParam label="Label inactif" value="text-sm text-muted-foreground" />
                    <DisplayParam label="Icône taille" value="h-6 w-6 md:h-7 md:w-7" />
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                Onglets (Résultats / Carte / POI / Destinations)
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Barre d'onglets (Sticky 1)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Position" value="sticky top-[60px] z-[20]" />
                    <DisplayParam label="Fond" value="bg-white" />
                    <DisplayParam label="Bordure" value="border-b border-border" />
                    <DisplayParam label="Conteneur" value="mx-auto px-4 max-w-[80%]" />
                    <DisplayParam label="Layout" value="flex gap-0" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Style des onglets</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Police" value="text-sm font-medium" />
                    <DisplayParam label="Padding" value="px-5 py-3" />
                    <DisplayParam label="Couleur actif" value="text-gold border-b-2 border-gold" preview={<span className="text-sm font-medium" style={{ color: 'hsl(43, 75%, 55%)' }}>Résultats</span>} />
                    <DisplayParam label="Couleur inactif" value="text-muted-foreground border-transparent" preview={<span className="text-sm font-medium text-muted-foreground">Carte</span>} />
                    <DisplayParam label="Hover inactif" value="hover:text-foreground" />
                    <DisplayParam label="Transition" value="transition-colors" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Onglets disponibles</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Onglet</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Clé</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Icône</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Label FR</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Label EN</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">Label AR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr><td className="py-2 pr-4 font-mono text-xs">suggestions</td><td className="py-2 pr-4 font-mono text-xs">suggestions</td><td className="py-2 pr-4 text-xs">Sparkles (h-4 w-4)</td><td className="py-2 pr-4">Résultats</td><td className="py-2 pr-4">Results</td><td className="py-2">النتائج</td></tr>
                        <tr><td className="py-2 pr-4 font-mono text-xs">map</td><td className="py-2 pr-4 font-mono text-xs">map</td><td className="py-2 pr-4 text-xs">Map (h-4 w-4)</td><td className="py-2 pr-4">Carte</td><td className="py-2 pr-4">Map</td><td className="py-2">خريطة</td></tr>
                        <tr><td className="py-2 pr-4 font-mono text-xs">poi</td><td className="py-2 pr-4 font-mono text-xs">poi</td><td className="py-2 pr-4 text-xs">MapPin (h-4 w-4)</td><td className="py-2 pr-4">Lieux d'intérêt</td><td className="py-2 pr-4">Points of Interest</td><td className="py-2">أماكن مهمة</td></tr>
                        <tr><td className="py-2 pr-4 font-mono text-xs">destinations</td><td className="py-2 pr-4 font-mono text-xs">destinations</td><td className="py-2 pr-4 text-xs">Compass (h-4 w-4)</td><td className="py-2 pr-4">Destinations</td><td className="py-2 pr-4">Destinations</td><td className="py-2">وجهات</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Icônes (lucide-react)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <DisplayParam label="Taille" value="h-4 w-4" />
                    <DisplayParam label="Couleur" value="Héritée du parent (text-gold ou text-muted-foreground)" />
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                BusinessSlidePanel (Fiche établissement)
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Nom de l'établissement</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Balise" value="<h3>" />
                    <DisplayParam label="Taille" value="text-2xl font-bold" />
                    <DisplayParam label="Couleur" value="text-foreground" />
                    <DisplayParam label="Ligne" value="leading-tight" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Sticky sub-header (après scroll)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Nom" value="<h4> text-sm font-bold text-foreground truncate" />
                    <DisplayParam label="Note" value="text-xs font-bold text-gold" />
                    <DisplayParam label="Avis" value="text-xs text-muted-foreground" />
                    <DisplayParam label="Badge horaire" value="text-xs font-medium (text-emerald-600 | text-muted-foreground)" />
                    <DisplayParam label="Badge service" value="text-xs bg-gold text-black" />
                    <DisplayParam label="Fond" value="bg-background/95 backdrop-blur-sm border-b" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Sous-ligne (note, vérifié, lieu)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Conteneur" value="text-sm text-muted-foreground flex-wrap" />
                    <DisplayParam label="Note" value="font-bold text-gold" />
                    <DisplayParam label="Vérifié" value="font-semibold text-gold + BadgeCheck h-4 w-4" />
                    <DisplayParam label="Icône lieu" value="MapPin h-3.5 w-3.5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Hook</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DisplayParam label="Style" value="text-sm text-muted-foreground italic leading-relaxed" />
                    <DisplayParam label="Bordure" value="border-l-2 border-gold/30 pl-3" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Onglets internes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Police" value="text-sm font-medium" />
                    <DisplayParam label="Padding" value="px-3 py-2.5" />
                    <DisplayParam label="Actif" value="border-primary text-primary border-b-2" preview={<span className="text-sm font-medium text-primary">Aperçu</span>} />
                    <DisplayParam label="Inactif" value="border-transparent text-muted-foreground" preview={<span className="text-sm font-medium text-muted-foreground">Contact</span>} />
                    <DisplayParam label="Hover" value="hover:text-foreground hover:border-border" />
                  </div>
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Onglet</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Clé</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">Condition d'affichage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr><td className="py-2 pr-4">Aperçu</td><td className="py-2 pr-4 font-mono text-xs">apercu</td><td className="py-2 text-xs">description non vide</td></tr>
                        <tr><td className="py-2 pr-4">Contact</td><td className="py-2 pr-4 font-mono text-xs">contact</td><td className="py-2 text-xs">adresse, phone, email ou whatsapp</td></tr>
                        <tr><td className="py-2 pr-4">Avis clients</td><td className="py-2 pr-4 font-mono text-xs">avis</td><td className="py-2 text-xs">reviews ou note moyenne</td></tr>
                        <tr><td className="py-2 pr-4">Localiser</td><td className="py-2 pr-4 font-mono text-xs">localiser</td><td className="py-2 text-xs">google_maps_url</td></tr>
                        <tr><td className="py-2 pr-4">Services</td><td className="py-2 pr-4 font-mono text-xs">services</td><td className="py-2 text-xs">services actifs</td></tr>
                        <tr><td className="py-2 pr-4">Similaires</td><td className="py-2 pr-4 font-mono text-xs">similaires</td><td className="py-2 text-xs">toujours (sauf si 0)</td></tr>
                        <tr><td className="py-2 pr-4">À côté</td><td className="py-2 pr-4 font-mono text-xs">acote</td><td className="py-2 text-xs">latitude + longitude</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Description (corps)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Corps" value="text-sm text-foreground leading-relaxed" />
                    <DisplayParam label="H2 interne" value="text-xl font-bold mb-4 mt-5" />
                    <DisplayParam label="H3 interne" value="text-lg font-semibold mb-3 mt-4" />
                    <DisplayParam label="Max replié" value="max-h-[21em]" />
                    <DisplayParam label="Seuil « Voir + »" value="> 500 caractères" />
                    <DisplayParam label="Bouton « Voir + »" value="text-sm font-semibold text-muted-foreground w-[20%]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Overlay documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DisplayParam label="Titre" value="text-sm font-semibold truncate" />
                    <DisplayParam label="Fond" value="bg-background, opaque, z-[60]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Galerie & compteur</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Compteur" value="text-xs text-foreground bg-background/80 rounded-full" />
                    <DisplayParam label="Bouton « Voir les N photos »" value="text-xs font-semibold bg-background/90 backdrop-blur-sm" />
                    <DisplayParam label="Visite 3D label" value="text-sm font-semibold text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Statut horaire</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DisplayParam label="Ouvert" value="text-sm font-medium text-emerald-600" />
                    <DisplayParam label="Fermé" value="text-sm font-medium text-muted-foreground" />
                    <DisplayParam label="Icône" value="Clock h-4 w-4" />
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                Overlay Texte IA (AISearchAnswer)
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Positionnement</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Position" value="top-[53px] z-[40]" />
                    <DisplayParam label="Fond" value="bg-background" />
                    <DisplayParam label="Largeur" value="Panneau latéral (50% écran)" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">En-tête « Suggestion IA »</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Label" value="text-xs font-medium text-muted-foreground" />
                    <DisplayParam label="Icône" value="Sparkles h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Corps du texte IA</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Taille par défaut" value="text-sm (14px)" />
                    <DisplayParam label="Taille réduite (A-)" value="text-xs (12px)" />
                    <DisplayParam label="Taille agrandie (A+)" value="text-base (16px)" />
                    <DisplayParam label="Couleur" value="text-foreground" />
                    <DisplayParam label="Interligne" value="leading-relaxed" />
                    <DisplayParam label="Animation" value="reveal mot par mot (45ms), opacity + blur + translate-y" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Noms d'établissements (liens cliquables)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Police" value="text-base font-semibold (16px, 600)" />
                    <DisplayParam label="Couleur" value="text-foreground" />
                    <DisplayParam label="Décoration" value="underline decoration-gold/40 underline-offset-2" />
                    <DisplayParam label="Hover" value="hover:decoration-gold" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Gras dans le texte</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DisplayParam label="Police" value="font-semibold text-foreground (600)" />
                    <DisplayParam label="Highlight TTS" value="bg-gold/25 rounded-sm (mot en cours de lecture)" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">HoverCard (aperçu établissement)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Nom" value="text-sm font-semibold text-foreground" />
                    <DisplayParam label="Ville" value="text-xs text-muted-foreground" />
                    <DisplayParam label="Note" value="text-xs font-medium text-foreground" />
                    <DisplayParam label="Icônes" value="MapPin h-3 w-3 · Star h-3 w-3 text-gold fill-gold" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">État de chargement</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DisplayParam label="Spinner" value="Loader2 h-4 w-4 animate-spin text-gold" />
                    <DisplayParam label="Texte" value="text-sm italic text-gold/90" />
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                Résumé IA — Panneau de gauche (Overlay)
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Positionnement</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Conteneur" value="fixed inset-0 z-[200] bg-background/95 backdrop-blur-sm" />
                    <DisplayParam label="Panneau gauche" value="w-full (sans fiche) ou w-1/2 (avec fiche)" />
                    <DisplayParam label="Transition" value="animate-in fade-in duration-200" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">En-tête (requête + compteur)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Bouton « Voir les résultats »" value="text-sm font-semibold bg-gold text-black rounded-full px-5 py-2" />
                    <DisplayParam label="Libellé recherche" value="text-sm text-muted-foreground" />
                    <DisplayParam label="Requête" value="text-lg md:text-xl font-bold text-foreground" />
                    <DisplayParam label="Compteur" value="font-semibold text-gold" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Filtres de désambiguïsation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Titre filtre" value="text-sm font-medium text-foreground" />
                    <DisplayParam label="Bouton filtre" value="text-sm text-foreground px-4 py-2 rounded-full border bg-card" />
                    <DisplayParam label="Hover filtre" value="hover:border-gold/50 hover:bg-gold/10" />
                    <DisplayParam label="Icône ville" value="MapPin h-3.5 w-3.5 text-muted-foreground inline" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Label « Suggestion IA »</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DisplayParam label="Police" value="text-xs font-semibold uppercase tracking-wider" />
                    <DisplayParam label="Couleur" value="text-gold" />
                    <DisplayParam label="Icône" value="Sparkles h-4 w-4 text-gold" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Corps du texte IA</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Taille" value="text-base (16px)" />
                    <DisplayParam label="Couleur" value="text-foreground/80" />
                    <DisplayParam label="Interligne" value="leading-relaxed" />
                    <DisplayParam label="Mise en forme" value="whitespace-pre-line" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Chargement</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DisplayParam label="Spinner" value="Loader2 h-6 w-6 animate-spin text-gold" />
                    <DisplayParam label="Texte" value="text-sm italic text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Boutons d'action (Listen / Geo / Mic)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Taille" value="w-16 h-16 rounded-full" />
                    <DisplayParam label="Fond" value="bg-black" />
                    <DisplayParam label="Icônes" value="h-7 w-7 text-white (Volume2, MapPin, Mic)" />
                    <DisplayParam label="Hover" value="hover:scale-105" />
                    <DisplayParam label="Ombre" value="shadow-lg" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Adresse géolocalisée</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DisplayParam label="Police" value="text-sm font-medium text-muted-foreground" />
                    <DisplayParam label="Emoji" value="📍 préfixe" />
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
    <div className="hidden xl:block w-96 shrink-0 sticky top-20">
      <div className="bg-card border border-border rounded-xl shadow-sm p-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aide — Design tokens</span>
        </div>
        <HelpContentPanel />
      </div>
    </div>
  </div>
);

export default DisplayPanel;
