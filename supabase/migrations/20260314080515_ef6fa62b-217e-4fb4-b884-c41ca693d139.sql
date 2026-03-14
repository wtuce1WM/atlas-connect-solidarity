
INSERT INTO knowledge_entries (category, title, content, tags, source)
VALUES (
  'bug-fix',
  'Correction massive des coordonnées GPS (663 établissements)',
  '<h2>Problème</h2>
<p>Les coordonnées GPS (latitude/longitude) de <strong>663 établissements</strong> étaient extraites de la <strong>position caméra</strong> (<code>@lat,lng</code>) dans l''URL Google Maps, au lieu des coordonnées du <strong>marqueur réel</strong> (<code>!3d</code> / <code>!4d</code>).</p>
<p>Cela provoquait un décalage de ~200 à 500m sur la longitude, rendant les itinéraires imprécis (destination décalée).</p>

<h2>Exemples</h2>
<table>
<tr><th>Établissement</th><th>Longitude avant (caméra)</th><th>Longitude après (marqueur)</th><th>Écart</th></tr>
<tr><td>Maison de la Photographie</td><td>-7.9868135</td><td>-7.9842386</td><td>~290m</td></tr>
<tr><td>YVES Marrakech</td><td>-7.9964474</td><td>-7.9938725</td><td>~290m</td></tr>
<tr><td>Musée des Terrasses des Arts</td><td>-8.0028638</td><td>-7.9979875</td><td>~540m</td></tr>
<tr><td>ANIMA Garden</td><td>-7.8285326</td><td>-7.8259577</td><td>~290m</td></tr>
</table>

<h2>Règle d''extraction</h2>
<p><strong>Toujours</strong> utiliser les paramètres <code>!3d</code> (latitude) et <code>!4d</code> (longitude) de l''URL Google Maps, qui correspondent au marqueur de l''établissement. Ne <strong>jamais</strong> utiliser <code>@lat,lng</code> qui correspond à la position de la caméra/vue.</p>
<pre><code>-- Extraction correcte via regexp
latitude  = regexp_match(google_maps_url, ''!3d(-?[0-9]+\.?[0-9]*)'')[1]
longitude = regexp_match(google_maps_url, ''!4d(-?[0-9]+\.?[0-9]*)'')[1]</code></pre>

<h2>Migration appliquée (14 mars 2026)</h2>
<pre><code>UPDATE businesses
SET 
  latitude  = (regexp_match(google_maps_url, ''!3d(-?[0-9]+\.?[0-9]*)''))[1]::double precision,
  longitude = (regexp_match(google_maps_url, ''!4d(-?[0-9]+\.?[0-9]*)''))[1]::double precision
WHERE is_active = true
  AND google_maps_url ~ ''!3d(-?[0-9]+\.?[0-9]*)''
  AND google_maps_url ~ ''!4d(-?[0-9]+\.?[0-9]*)''
  AND latitude IS NOT NULL
  AND (
    ABS(latitude - (regexp_match(google_maps_url, ''!3d(-?[0-9]+\.?[0-9]*)''))[1]::double precision) &gt; 0.0001
    OR ABS(longitude - (regexp_match(google_maps_url, ''!4d(-?[0-9]+\.?[0-9]*)''))[1]::double precision) &gt; 0.0001
  );</code></pre>
<p><strong>663 lignes corrigées.</strong></p>',
  ARRAY['gps', 'coordonnées', 'google-maps', 'itinéraire', 'bug-fix', 'migration'],
  'chat'
);
