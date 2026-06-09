# Domaine personnalisé & DNS (oneworldmorocco.com)

## Symptôme
En collant `https://oneworldmorocco.com/<slug>` dans Chrome, message :
> The DNS records for oneworldmorocco.com are not properly configured. Please check your DNS settings.

→ Le domaine n'est pas (ou plus) correctement connecté côté DNS à Lovable.

## Procédure de résolution

1. **Vérifier le statut dans Lovable**
   - Project Settings → Domains
   - Statuts possibles : `Offline`, `Action required`, `Verifying`, `Setting up`, `Failed`, `Active`.

2. **Configurer les DNS chez le registrar**
   - **A record** — Name `@` → Value `185.158.133.1`
   - **A record** — Name `www` → Value `185.158.133.1`
   - **TXT record** — Name `_lovable` → Value fournie par Lovable dans le dialogue *Connect Domain*

3. **Supprimer tout enregistrement A / CNAME conflictuel** pointant ailleurs.

4. **Cloudflare (ou proxy similaire)**
   - Cocher *"Domain uses Cloudflare or a similar proxy"* dans la section Advanced du dialogue *Connect Domain*.
   - Cela bascule la vérification en mode CNAME, compatible avec un DNS proxifié.

5. **Attendre la propagation DNS** (jusqu'à 72 h, souvent < 1 h).
   - Vérification : [https://dnschecker.org](https://dnschecker.org)

6. Une fois le statut **Active** dans Lovable, l'URL `https://oneworldmorocco.com/<slug>` fonctionne et le SSL est provisionné automatiquement.

## Notes

- Le site est hébergé **directement sur Lovable** (pas de Vercel ni proxy intermédiaire).
- Ajouter à la fois `oneworldmorocco.com` ET `www.oneworldmorocco.com` comme entrées séparées dans Lovable ; définir l'un comme **Primary** (l'autre redirige).
- Si CAA records présents, autoriser Let's Encrypt pour le SSL.
