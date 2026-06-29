# GitHub Pages deployment notes — Annies fjärilar

Version: 1.5.44

Den här mappen är förberedd som en ren statisk GitHub Pages-version med filer direkt i repo-roten.

## Publicera

1. Skapa ett GitHub-repo.
2. Lägg filerna i repo-roten, så att `index.html` ligger direkt i roten.
3. Pusha till `main`.
4. Gå till `Settings → Pages`.
5. Välj `Deploy from a branch`.
6. Välj `main` och `/root`.

`.nojekyll` finns redan i roten.

## Viktigt för den här appen

- `manifest.webmanifest` använder relativ `start_url` och `scope`.
- `script.js`, `styles.css`, `sw.js`, `supabase-config.js`, `assets/` och `data/` använder relativa paths som fungerar under GitHub Pages project URLs.
- Service worker-cache är bumpad till `1.5.44`.
- `reset-cache.html` pekar också på `1.5.44`.
- Inga secret/service-role keys ska läggas i repot. `supabase-config.js` ska bara innehålla public/publishable client key.
- Platsfunktionen kräver HTTPS. GitHub Pages ger HTTPS på `github.io`.
- Kartan använder Leaflet on-demand via CDN och OpenStreetMap tiles först när användaren trycker `Visa karta`.

## Supabase

Kör `supabase/schema.sql` i Supabase SQL Editor om databasen inte redan är uppdaterad. Den innehåller bland annat:

```sql
location jsonb,
story text
-- Fjärilskatalogen har också tags text[]
```

Om du använder login med e-post/lösenord behövs normalt ingen redirect-konfiguration. Om du senare byter till magic links/OAuth, lägg till GitHub Pages-URL:en i Supabase Auth redirect settings.

## Snabb test efter deploy

- Öppna sidan i inkognito.
- Kontrollera att Fjärilar-vyn laddar.
- Lägg till en bild i Samling.
- Testa platsknappen på mobil.
- Kontrollera att `Visa karta` bara syns för poster där plats sparats.
- Öppna `reset-cache.html` om en gammal PWA-version ligger kvar i mobilen.


## Borttaget som överflödigt för GitHub Pages

Följande Express/npm-devfiler är borttagna ur denna static-only-zip:

- `server.js`
- `package.json`
- `package-lock.json`

För lokal testning räcker en enkel statisk server, exempelvis `python3 -m http.server 8000`.


## Image performance notes v1.5.44

- Wikimedia reference images now use 900 px thumbnail URLs instead of full original file URLs.
- The original Wikimedia file URL is preserved as `original_url` in `data/butterflies.json`.
- The service worker keeps a separate cross-origin image cache for `upload.wikimedia.org` reference images after first successful load.
- Mobile butterfly cards now render as text/details first, image block second, and action button last. Desktop layout is left unchanged.

## v1.5.44 image fix

Den här versionen backar från den trasiga Wikimedia-thumbnail-rewrite som kunde ge placeholders. Referensbilderna använder åter de verifierade Commons/Upload-URL:erna, med mobil-layout och cache-bump kvar.

## v1.5.44 local species assets

- Referensbilderna för fjärilarna ligger nu lokalt i `assets/species/` som optimerade WebP-filer.
- De flesta arter använder 1 bild; arter med tydlig hane/hona-distinktion använder 2 bilder.
- Kortlayouten hanterar 1 respektive 2 bilder mer harmoniskt på mobil och desktop.

## v1.5.44 image layout refinement

- Dubbla artbilder hålls sida vid sida även på normal mobilbredd.
- Bildytan för dubbla bilder är lägre och jämnare så korten inte blir för tunga.
- Artbilder använder `object-fit: contain` i stället för hård cover-crop, så fjärilen inte klipps av.

## v1.5.44 image layout reset

- Artbilder fyller åter bildytan med `object-fit: cover`.
- Dubbla bilder staplas vertikalt på mobil och använder hela kortbredden.
- Enbildskort behåller generös bildyta.

## v1.5.44 favicon and double-image mobile fix

- Ny ren favicon baserad på den lilla tecknade fjärilen.
- `favicon.svg`, `favicon-192.png` och `favicon-512.png` ingår.
- Dubbla referensbilder staplas i mobilvyn och renderas med full bredd utan överlapp.
- Enbildskortens tidigare cover-beteende lämnas orört.

## v1.5.44 mobile double-image fix

- Dubbla referensbilder i mobilvyn renderas nu som två separata block ovanpå varandra.
- Varje bildblock har egen `aspect-ratio`, så kortet expanderar vertikalt och knappen hamnar efter bilderna.
- Överlapp mot `Lägg till i samling` är åtgärdat.

## v1.5.44 favicon and card-structure fix

- Favicon/PWA/Apple icons rebuilt from the provided butterfly image.
- Home screen name is set to `Annies Fjärilar`.
- Butterfly cards now use structural grid areas so mobile double-image cards expand vertically instead of overlapping the action row.

## v1.5.44 icon set replacement

- Replaced the previous generated favicon/PWA icons with the provided `butterfly-icon-pwa-set`.
- Icons are served from relative GitHub Pages-safe paths under `assets/favicon/`, `assets/apple/`, and `assets/pwa/`.
- Manifest name/short_name are set to `Annies Fjärilar`.
- Legacy fallbacks are included at `assets/favicon.ico`, `assets/favicon.svg`, and root compatibility PNG aliases.
