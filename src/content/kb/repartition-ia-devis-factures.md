Globalement d'accord sur le principe, mais deux corrections importantes.

**Ce qui est juste**
- Découper en petits prompts ciblés (1 fichier / 1 intention) : oui, c'est exactement ce qui fait baisser la facture.
- Faire la réflexion produit/workflow ailleurs (ChatGPT/Claude) et me donner un plan figé : oui.
- Modules métier indépendants (CRM / Devis / Facturation / Paiements) : oui, c'est la bonne granularité pour ton projet.

**Ce qui est faux ou risqué**
1. **Le SQL écrit ailleurs.** ChatGPT ne voit pas ta base : 189 colonnes sur `businesses`, `affiliates`, `user_roles`, `has_role()`, `is_affiliate()`, `is_own_affiliate_business()`, tes conventions GRANT+RLS. Un schéma « propre » écrit à l'aveugle produira des FK vers les mauvaises tables, des policies qui doublonnent tes fonctions security definer, et des noms qui ne collent pas. Le SQL doit être écrit **ici**, contre le schéma réel. En revanche : donne-moi les **décisions** (versionner un devis ? snapshot des lignes à la facturation ? annulation = statut ou table ?) — c'est ça qui coûte cher à deviner.
2. **Le code écrit ailleurs puis « intégré ».** Coller des `QuoteService.ts`/`QuoteRepository.ts` génériques dans ton projet coûte *plus* cher : tu paies l'écriture ailleurs, puis tu me paies pour tout réécrire aux conventions maison (client Cloud, hooks, `AffiliateToolsTab`-style, toasts, guards). Ton projet n'a pas de couche repository/DDD — l'introduire crée exactement le bricolage parallèle que tu refuses.
3. **Paiement.** Ne pars pas sur du Stripe BYOK/Edge Function custom comme suggéré. Lovable a un système de paiement intégré, sans clé à gérer. À trancher avant d'écrire une seule table.
4. **100-150 règles.** Trop. Tu as déjà `.lovable/memory` + les fiches KB. 20-30 règles vivantes valent mieux que 150 qu'on ne relit jamais.

**Ce que je ferais concrètement pour le module Devis→Facture**
- Hors Lovable : le workflow (états, qui valide, quand la facture est figée, gestion des annulations/avoirs, TVA/devise, numérotation légale) — en français, en une page.
- Ici, prompt 1 : la migration complète (tables + enums + GRANT + RLS + triggers + index), écrite contre le schéma réel.
- Ici, prompt 2 : la page backoffice liste.
- Prompt 3 : le détail + validation Staff.
- Prompt 4 : le lien de paiement + passage en facture.
- Prompt 5 : l'email transactionnel.

Le point le plus rentable qui manque dans sa réponse : **décider la numérotation des factures et le figeage des lignes avant tout code**. C'est le seul choix qu'on ne peut pas corriger après coup sans casser l'historique comptable.

Tu veux qu'on démarre par cette page de décisions, ou tu l'as déjà ?
