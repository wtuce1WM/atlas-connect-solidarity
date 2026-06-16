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
                    <DisplayParam label="Position" value="fixed left-0 right-0 top-0" />
                    <DisplayParam label="Z-index" value="z-30" />
                    <DisplayParam label="Conteneur" value="mx-auto lg:w-1/2 lg:mr-auto lg:ml-0" />
                    <DisplayParam label="Padding" value="px-4 py-3" />
                    <DisplayParam label="Layout" value="flex items-center" />
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
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Logo / Branding</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Balise" value='<a href="/"> → <span>' />
                    <DisplayParam label="Texte normal" value='"ONE WORLD MOROCCO"' preview={<span className="font-bold" style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>ONE WORLD MOROCCO</span>} />
                    <DisplayParam label="Texte compact" value='"1WM" (prop compact=true)' preview={<span className="font-bold" style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>1WM</span>} />
                    <DisplayParam label="Police" value="text-lg font-bold tracking-tight, Montserrat" />
                    <DisplayParam label="Couleur texte" value="text-foreground (unifié)" />
                    <DisplayParam label="Responsive compact" value='hidden md:flex (logo masqué mobile si compact)' />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Hamburger</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Icône ouvert" value="<X> (lucide) h-6 w-6" />
                    <DisplayParam label="Icône fermé" value="<Menu> (lucide) h-6 w-6" />
                    <DisplayParam label="Bouton" value="w-10 h-10 rounded-lg hover:bg-muted/50" />
                    <DisplayParam label="Couleur" value="text-foreground" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Menu déployé</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DisplayParam label="Mobile/Tablette" value="Dropdown pleine largeur, bg-white, max-h-[calc(100vh-53px)] overflow-y-auto" />
                    <DisplayParam label="Desktop (lg+)" value="Sidebar gauche w-1/2, bg-white, pleine hauteur. Zone droite bg-black/20 ferme au clic." />
                    <DisplayParam label="Animation mobile" value="animate-in slide-in-from-top-2 fade-in duration-150" />
                    <DisplayParam label="Animation desktop" value="animate-in slide-in-from-left-2 fade-in duration-200" />
                    <DisplayParam label="Contenu footer" value="Description marque, icônes sociales, liens entreprise, WhatsApp, contact, copyright" />
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
                        <tr><td className="py-2 pr-4">Notre Mission</td><td className="py-2 pr-4 font-mono text-xs">/mission</td><td className="py-2 pr-4 font-mono text-xs">footer.ourMission</td><td className="py-2 text-xs">text-foreground text-sm font-semibold hover:text-gold</td></tr>
                        <tr><td className="py-2 pr-4">Contact</td><td className="py-2 pr-4 font-mono text-xs">/contact</td><td className="py-2 pr-4 font-mono text-xs">footer.contact</td><td className="py-2 text-xs">text-foreground text-sm font-semibold hover:text-gold</td></tr>
                        <tr><td className="py-2 pr-4 font-semibold">Rejoignez-nous</td><td className="py-2 pr-4 font-mono text-xs">/devenir-affilie</td><td className="py-2 pr-4 font-mono text-xs">nav.joinNow</td><td className="py-2 text-xs">bg-gold text-gold-foreground rounded-lg px-4 py-2 text-sm font-semibold</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Comportement</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DisplayParam label="Fermeture auto" value="Clic zone d'ombre droite (desktop) ou navigation (tous)" />
                    <DisplayParam label="Props" value='variant: "default" | "morocco" | "city", compact?: boolean, rightContent?: ReactNode' />
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
                    <DisplayParam label="Montserrat (→ Venus)" value="300, 400, 600" preview={<span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>Marrakech</span>} />
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
                          <td className="py-2 pr-4">Montserrat, sans-serif</td>
                          <td className="py-2 pr-4 text-xs">weight: 300, uppercase, tracking: 0.20em</td>
                          <td className="py-2"><span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300, textTransform: "uppercase" as const, letterSpacing: "0.20em", fontSize: 14 }}>MARRAKECH</span></td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-mono text-xs">&lt;h2&gt;</td>
                          <td className="py-2 pr-4">Montserrat, sans-serif</td>
                          <td className="py-2 pr-4 text-xs">weight: 300, uppercase, tracking: 0.15em</td>
                          <td className="py-2"><span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300, textTransform: "uppercase" as const, letterSpacing: "0.15em", fontSize: 14 }}>HÉBERGEMENTS</span></td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-mono text-xs">&lt;h3&gt;</td>
                          <td className="py-2 pr-4">Montserrat, sans-serif</td>
                          <td className="py-2 pr-4 text-xs">weight: 300, uppercase, tracking: 0.12em</td>
                          <td className="py-2"><span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300, textTransform: "uppercase" as const, letterSpacing: "0.12em", fontSize: 14 }}>SOUS-TITRE</span></td>
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
                    <DisplayParam label="Sous-titre (plateforme)" value="text-lg md:text-base text-foreground/70 font-medium tracking-wide text-center" />
                    <DisplayParam label="H1 principal" value="text-3xl md:text-4xl lg:text-5xl font-bold text-black text-center" />
                    <DisplayParam label="H1 balise" value="<h1>" />
                    <DisplayParam label="H1 max-width" value="max-w-5xl" />
                    <DisplayParam label="H1 responsive" value="hidden md:block (masqué sur mobile)" />
                    <DisplayParam label="H1 contenu dynamique" value="Varie selon la catégorie sélectionnée (all, Hôtellerie, Restauration...)" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Onglets catégories (Hero)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Layout" value="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide" />
                    <DisplayParam label="Label actif" value="text-sm font-semibold text-black border-b-2 border-black" />
                    <DisplayParam label="Label inactif" value="text-sm font-semibold text-black/60 border-transparent" />
                    <DisplayParam label="Hover inactif" value="hover:text-black hover:border-black/40" />
                    <DisplayParam label="Icône taille" value="h-5 w-5 shrink-0" />
                    <DisplayParam label="Scroll auto" value="Centrage automatique de l'onglet actif au clic" />
                  </div>
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Clé</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Label FR</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Label EN</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Icône</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr><td className="py-2 pr-4 font-mono text-xs">all</td><td className="py-2 pr-4">Tout</td><td className="py-2 pr-4">All</td><td className="py-2 text-xs">LayoutGrid</td></tr>
                        <tr><td className="py-2 pr-4 font-mono text-xs">Hôtellerie</td><td className="py-2 pr-4">Hôtels</td><td className="py-2 pr-4">Hotels</td><td className="py-2 text-xs">BedDouble</td></tr>
                        <tr><td className="py-2 pr-4 font-mono text-xs">Restauration</td><td className="py-2 pr-4">Restaurants</td><td className="py-2 pr-4">Restaurants</td><td className="py-2 text-xs">UtensilsCrossed</td></tr>
                        <tr><td className="py-2 pr-4 font-mono text-xs">Tourisme</td><td className="py-2 pr-4">Activités</td><td className="py-2 pr-4">Activities</td><td className="py-2 text-xs">Mountain</td></tr>
                        <tr><td className="py-2 pr-4 font-mono text-xs">Commerce</td><td className="py-2 pr-4">Commerce</td><td className="py-2 pr-4">Shopping</td><td className="py-2 text-xs">ShoppingBag</td></tr>
                        <tr><td className="py-2 pr-4 font-mono text-xs">Bien-être</td><td className="py-2 pr-4">Bien-être</td><td className="py-2 pr-4">Wellness</td><td className="py-2 text-xs">Sparkles</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Fond Hero</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DisplayParam label="Overlay gradient" value="bg-gradient-to-b from-white/20 via-white/40 to-white" />
                    <DisplayParam label="Image de fond" value="Désactivée (commentée)" />
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
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">CTAs — Boutons d'action</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DisplayParam label="Source des libellés" value="Champs website_cta, reserve_now_cta, online_shop_cta en DB" />
                    <DisplayParam label="Modes de présentation" value="website_presentation_mode, presentation_mode, online_shop_presentation_mode" />
                    <DisplayParam label="Contrôle externe" value="website_force_external, reserve_now_force_external, online_shop_force_external" />
                  </div>
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Mode</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Libellé FR</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">Libellé EN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr><td className="py-2 pr-4 font-mono text-xs">acheter_en_ligne</td><td className="py-2 pr-4">Acheter en ligne</td><td className="py-2">Shop Online</td></tr>
                        <tr><td className="py-2 pr-4 font-mono text-xs">reserver_en_ligne</td><td className="py-2 pr-4">Réserver en ligne</td><td className="py-2">Book Online</td></tr>
                        <tr><td className="py-2 pr-4 font-mono text-xs">consulter_offre</td><td className="py-2 pr-4">Consulter notre offre</td><td className="py-2">View Our Offer</td></tr>
                        <tr><td className="py-2 pr-4 font-mono text-xs">plus_informations</td><td className="py-2 pr-4">Plus d'informations</td><td className="py-2">More Information</td></tr>
                        <tr><td className="py-2 pr-4 font-mono text-xs">contactez_nous</td><td className="py-2 pr-4">Contactez nous</td><td className="py-2">Contact Us</td></tr>
                        <tr><td className="py-2 pr-4 font-mono text-xs">la_carte</td><td className="py-2 pr-4">La carte</td><td className="py-2">The Menu</td></tr>
                        <tr><td className="py-2 pr-4 font-mono text-xs">les_boissons</td><td className="py-2 pr-4">Les boissons</td><td className="py-2">Drinks</td></tr>
                      </tbody>
                    </table>
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
                    <DisplayParam label="Couleur" value="text-foreground" />
                    <DisplayParam label="Interligne" value="leading-relaxed" />
                    <DisplayParam label="Animation" value="reveal mot par mot (45ms), opacity + blur + translate-y" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Noms d'établissements (liens cliquables)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DisplayParam label="Police" value="text-base font-semibold (16px, 600)" />
                    <DisplayParam label="Décoration" value="underline decoration-gold/40 underline-offset-2" />
                    <DisplayParam label="Hover" value="hover:decoration-gold" />
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>

    <div className="w-72 shrink-0 sticky top-4 p-4 rounded-lg border bg-muted/30 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Guide Affichage</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Ce panneau documente les paramètres d'affichage actuels du site : classes Tailwind, tokens de design, valeurs CSS.
      </p>
      <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
        <li><strong>Header</strong> : hamburger universel, sidebar desktop 50%</li>
        <li><strong>Accueil</strong> : Hero, polices, onglets catégories</li>
        <li><strong>Onglets</strong> : barre sticky de recherche</li>
        <li><strong>SlidePanel</strong> : fiche, CTAs dynamiques</li>
        <li><strong>Overlay IA</strong> : réponse textuelle IA</li>
      </ul>
    </div>
  </div>
);

export default DisplayPanel;