UPDATE public.knowledge_entries
SET content = content || '

<h2>🚀 Activation & Déploiement</h2>
<p>Le système OG dynamique nécessite que le fichier <code>vercel.json</code> soit déployé en production. Toute modification de la logique de détection des bots ou de l''Edge Function <code>og-meta</code> ne sera <strong>active qu''après publication</strong> du site.</p>
<ul>
  <li><strong>Edge Function <code>og-meta</code></strong> : déploiement automatique et instantané (backend Lovable Cloud).</li>
  <li><strong>Fichier <code>vercel.json</code></strong> : nécessite un clic sur <strong>Publish → Update</strong> dans Lovable pour être pris en compte par Vercel.</li>
</ul>

<h3>Procédure</h3>
<ol>
  <li>Cliquer sur <strong>Publish</strong> (icône en haut à droite de l''éditeur Lovable).</li>
  <li>Cliquer sur <strong>Update</strong> dans la dialog.</li>
  <li>Attendre la fin du déploiement (~30s).</li>
</ol>

<h3>🧪 Test après publication</h3>
<p>Vérifier en simulant un bot WhatsApp :</p>
<pre><code>curl -A "WhatsApp/2.0" https://oneworldmorocco.com/business/holy-surf-surf-camp-sidi-kaouki</code></pre>
<p>La réponse doit contenir <code>&lt;meta property="og:image"&gt;</code> pointant vers l''image de la fiche (et non l''image par défaut).</p>

<h3>⚠️ Cache des plateformes sociales</h3>
<p>WhatsApp, Facebook, LinkedIn, etc. mettent en cache les aperçus pendant plusieurs jours. Pour forcer un rafraîchissement après modification :</p>
<ul>
  <li><strong>Facebook</strong> : <a href="https://developers.facebook.com/tools/debug/" target="_blank">Sharing Debugger</a> → "Scrape Again"</li>
  <li><strong>LinkedIn</strong> : <a href="https://www.linkedin.com/post-inspector/" target="_blank">Post Inspector</a></li>
  <li><strong>Twitter/X</strong> : <a href="https://cards-dev.twitter.com/validator" target="_blank">Card Validator</a></li>
  <li><strong>WhatsApp</strong> : aucun outil officiel — ajouter un paramètre fictif à l''URL (ex. <code>?v=2</code>) pour contourner le cache local du chat.</li>
</ul>',
updated_at = now()
WHERE id = '343e453a-30f7-4f06-a69c-07f41f3cd065';