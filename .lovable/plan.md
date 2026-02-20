

## Stocker une phrase type TTS en base de donnees

### Concept

Utiliser la table `staff_notes` existante pour stocker une phrase d'introduction/conclusion configurable par le staff, qui sera injectee dans la reponse vocale TTS sur la page de recherche.

### Fonctionnement

1. **Stockage** : Creer une entree dans `staff_notes` avec la cle `tts_intro_phrase` (et optionnellement `tts_outro_phrase`) contenant le texte a injecter
2. **Lecture** : Sur `SearchPage`, charger cette phrase au montage via un `useEffect` + requete Supabase
3. **Injection** : Prependre la phrase au debut du texte TTS genere (avant "J'ai trouve X resultats...")

### Exemple concret

Le staff saisit dans le backoffice :
> "Bienvenue sur WTUCE, votre guide de confiance au Maroc."

Le TTS dira :
> "Bienvenue sur WTUCE, votre guide de confiance au Maroc. J'ai trouve 5 resultats a Essaouira. Voici les meilleurs resultats..."

### Implementation technique

**Etape 1 : Initialiser la donnee en base**

Inserer une ligne dans `staff_notes` :
```sql
INSERT INTO staff_notes (key, content)
VALUES ('tts_intro_phrase', 'Bienvenue sur WTUCE, votre guide de confiance au Maroc.')
ON CONFLICT DO NOTHING;
```

**Etape 2 : Modifier SearchPage.tsx**

- Ajouter un `useState` pour stocker la phrase chargee
- Ajouter un `useEffect` qui fait un `supabase.from('staff_notes').select('content').eq('key', 'tts_intro_phrase').single()`
- Prependre `introPhrase + " "` au debut de la variable `speech` dans les deux endroits ou le TTS est construit (recherche vocale automatique + bouton "Ecouter les resultats")

**Etape 3 : Interface d'edition dans le backoffice**

- Ajouter un champ dans `StaffDashboard` (ou un onglet existant) permettant au staff de modifier la phrase TTS
- Simple champ texte avec bouton "Sauvegarder" qui fait un `upsert` sur `staff_notes` avec la cle `tts_intro_phrase`

### Points importants

- La table `staff_notes` a deja les bonnes politiques RLS : lecture/ecriture reservee au staff
- Comme `staff_notes` est protegee par RLS (staff uniquement), il faudra faire la requete de lecture via une edge function ou rendre cette ligne specifique lisible publiquement via une politique RLS dediee
- Pas de migration de schema necessaire, la table existe deja
- Le texte est en clair (pas de HTML), directement utilisable par le TTS

