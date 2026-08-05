INSERT INTO public.knowledge_entries (category, title, content, tags, source, is_active)
VALUES (
  'business-rules',
  'Chaabi Payment — Questionnaire d''intégration PSP',
  $$<div class="space-y-4">
<h3 class="text-lg font-semibold">Contexte</h3>
<p>Chaabi Payment (filiale du Groupe Chaabi Bank) est un PSP marocain. Il permet d'accepter des paiements en ligne en MAD et en cartes locales/internationales. Avant de signer, il faut valider que leur API et leur pricing correspondent aux besoins de 1WM.</p>

<h3 class="text-lg font-semibold">1. Offre &amp; prix</h3>
<ul class="list-disc pl-5 space-y-1">
<li>Taux par transaction pour carte marocaine (CMI/Visa/Mastercard)</li>
<li>Taux pour carte internationale (cross-border)</li>
<li>Frais fixes : setup, abonnement mensuel/annuel, clôture</li>
<li>Délai d'encaissement (D+1, D+3, D+7 ?)</li>
<li>Paiement fractionné possible ?</li>
<li>Coût des remboursements et des litiges/chargebacks</li>
</ul>

<h3 class="text-lg font-semibold">2. Moyens de paiement acceptés</h3>
<ul class="list-disc pl-5 space-y-1">
<li>Cartes CMI, Visa, Mastercard</li>
<li>Apple Pay / Google Pay</li>
<li>Paiement mobile / QR code</li>
<li>Virement ou paiement en agence</li>
<li>Devises supportées (MAD, EUR, USD ?)</li>
</ul>

<h3 class="text-lg font-semibold">3. API &amp; intégration technique</h3>
<ul class="list-disc pl-5 space-y-1">
<li>URL de la documentation API et du sandbox</li>
<li>Mode d'authentification (API key, OAuth, certificat...)</li>
<li>Création d'une session/paiement (checkout)</li>
<li>Redirection après paiement et callback serveur (webhooks)</li>
<li>Paiement intégré (iframe, SDK JS) ou redirection obligatoire</li>
<li>Librairies disponibles (JS, Node, PHP, Python...)</li>
</ul>

<h3 class="text-lg font-semibold">4. Webhooks &amp; sécurité</h3>
<ul class="list-disc pl-5 space-y-1">
<li>Événements disponibles : succès, échec, remboursement</li>
<li>Secret webhook pour authentifier les appels</li>
<li>Gestion 3D Secure et des transactions refusées</li>
<li>Exigences PCI-DSS : qui en est responsable ?</li>
</ul>

<h3 class="text-lg font-semibold">5. Back-office &amp; rapports</h3>
<ul class="list-disc pl-5 space-y-1">
<li>Dashboard de suivi des transactions</li>
<li>Exports comptables / Excel</li>
<li>Reconciliation automatique</li>
</ul>

<h3 class="text-lg font-semibold">6. Processus d'adhésion</h3>
<ul class="list-disc pl-5 space-y-1">
<li>Documents nécessaires (RC, RIB, attestation bancaire, etc.)</li>
<li>Délai d'activation du compte test et du compte production</li>
<li>Contact technique dédié</li>
</ul>

<h3 class="text-lg font-semibold">7. Points de vigilance spécifiques 1WM</h3>
<ul class="list-disc pl-5 space-y-1">
<li>Peut-on différer l'encaissement (modèle escrow) pour les réservations ?</li>
<li>Multi-affiliés : peut-on identifier la transaction par affilié / établissement ?</li>
<li>Facturation des frais : par transaction ou retrait mensuel ?</li>
<li>Support de l'anglais pour le dashboard ?</li>
</ul>

<h3 class="text-lg font-semibold">Prochaine étape</h3>
<p>Demander un <strong>compte sandbox</strong> dès la première réunion pour pouvoir tester une intégration minimale via une edge function Lovable Cloud.</p>
</div>$$,
  ARRAY['psp', 'payment', 'chaabi', 'integration', 'maroc', 'moyens-paiement'],
  'manual',
  true
);