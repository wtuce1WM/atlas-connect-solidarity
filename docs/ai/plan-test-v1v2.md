# Plan de test comparatif — Moteur IA V1 vs V2

> Objectif : valider que le moteur V2 (`embed-ai-chat-v2`) est au moins aussi pertinent que V1, avec moins de zéro-résultat, moins de tokens génératifs et une latence comparable, avant de basculer le switch global dans le Backoffice.

## Protocole de test

1. Ouvrir le widget `/embed/ask` avec `?engine=v1`.
2. Envoyer la phrase de test.
3. Noter : nombre de résultats, pertinence, temps de réponse, comportement spécifique attendu.
4. Recharger la page avec `?engine=v2`.
5. Refaire la même phrase.
6. Répéter 3 fois par phrase pour lisser la variance.

## Cas de test

### 1. Exclusion nette
**Phrase :** *"un bar avec vue sur la Koutoubia, pas un hotel"*

- **Attendu V2 :** Kabana Rooftop et autres bars/rooftops, sans Riad Danka.
- **Piège V1 :** la négation "pas un hotel" est traitée dans le message brut, ce qui peut filtrer à tort ou retourner 0 résultat.
- **Observé :** V1 retourne 0 résultats dans le cas connu.

### 2. Vue panoramique
**Phrase :** *"un bar avec vue sur l'Atlas"*

- **Attendu :** établissements avec badge ou attribut "vue montagne / panorama", sans rayon strict de 1 km.
- **Piège :** la Koutoubia est un point (rayon 1 km), l'Atlas est un panorama (attribut, pas distance).
- **Observé :** V1 peut tomber dans un rayon trop large ou ignorer le critère d'attribut.

### 3. Proximité comptée
**Phrase :** *"Que faire à proximité ?"*

- **Attendu :** nombre d'établissements actifs à moins de 1 km, regroupés par Structure du Front.
- **Piège :** le compteur doit refléter les établissements actifs uniquement.
- **Observé :** cohérence du nombre affiché avec la base.

### 4. Réservation en ligne
**Phrase :** *"On peut réserver en ligne ?"*

- **Attendu :** liste d'établissements avec texte immersif, indication oui/non selon les liens URL 1-5 (Réserver / Réservez / Billeterie en ligne), boutons Téléphone et WhatsApp.
- **Piège :** ne pas confondre "a un site web" avec "a un lien de réservation en ligne".
- **Observé :** pertinence du texte et exactitude des liens.

### 5. Météo
**Phrase :** *"Quel temps fait-il à Essaouira ?"*

- **Attendu :** widget météo multi-jours pour Essaouira.
- **Piège :** la ville doit être détectée et remplacer le contexte par défaut de Marrakech.
- **Observé :** V1 et V2 identiques (route Class A).

### 6. Catégorie simple
**Phrase :** *"un restaurant italien"*

- **Attendu :** restaurants avec sous-catégorie / cuisine italienne, triés par score.
- **Piège :** synonymes et traductions.
- **Observé :** nombre et qualité des résultats.

### 7. Négation catégorielle
**Phrase :** *"un restaurant, pas français"*

- **Attendu :** V2 exclut la cuisine française via le champ `exclude` du classifieur.
- **Piège V1 :** le mot "français" est présent dans la requête brute, V1 peut retourner des restaurants français.
- **Observé :** présence ou absence de restaurants français dans les résultats.

### 8. Ville hors Marrakech
**Phrase :** *"hotel à Essaouira"*

- **Attendu :** le contexte géo bascule sur Essaouira (rayon 80 km de fallback), pas Marrakech.
- **Piège :** le widget doit lire la ville dans la phrase, pas imposer la ville hôte.
- **Observé :** résultats situés à Essaouira ou dans son rayon.

### 9. Critère prix (hôtels et riads uniquement)
**Phrase :** *"un hotel pas cher à Marrakech"*

- **Attendu :** hôtels/riads avec gamme de prix basse.
- **Important :** le filtre prix ne fonctionne actuellement que pour les hôtels et les riads (pas les restaurants, bars, activités, etc.).
- **Observé :** cohérence entre la gamme prix affichée et la demande.

### 10. POI proche
**Phrase :** *"café près de la place Jemaa el-Fna"*

- **Attendu :** cafés dans un rayon court autour du POI, avec preuve de proximité (badge, mention textuelle, distance).
- **Piège :** la distance seule ne suffit pas si l'établissement n'a pas de terrasse/rooftop avec vue sur le POI.
- **Observé :** pertinence des résultats, pas seulement la distance.

### 11. Ambiguë / Conversationnelle
**Phrase :** *"je cherche un endroit sympa pour ce soir"*

- **Attendu :** V2 route vers une suggestion contextuelle ou une question de clarification.
- **Observé :** V1 peut tomber en Class C génératif coûteux, V2 doit rester Class B si possible.

### 12. Fallback génératif
**Phrase :** *"conseille-moi une sortie romantique à Marrakech"*

- **Attendu :** réponse synthétique en Class C avec suggestions pertinentes.
- **Observé :** qualité du texte, citations d'établissements existants, coût en tokens.

## Indicateurs à surveiller dans le Backoffice

Chemin : **Backoffice / IA / Moteur IA / Mode test**

- **Zero results** : doit baisser en V2.
- **Taux d'erreur** : doit être ≤ V1.
- **Répartition Class A / B / C** : V2 doit produire plus de Class B et moins de Class C que V1.
- **Coût USD** : V2 doit être plus bas (moins de recours au modèle génératif).
- **Latence médiane** : V2 doit être au moins comparable à V1.
- **Tokens totaux** : V2 doit consommer moins, surtout sur les Class A et B.

## Seuil de bascule global

Ne pas activer le moteur V2 pour tous les widgets tant que :

- V2 n'a pas accumulé **au moins 300 tours** dans le tableau comparatif.
- Le **taux de zéro-résultat** de V2 n'est pas strictement inférieur à celui de V1.
- Le **taux d'erreur** de V2 n'est pas ≤ celui de V1.
- Le **coût** de V2 n'est pas inférieur à V1.

En attendant, utiliser `?engine=v2` sur des widgets ciblés pour accumuler des données sans risquer la production globale.
