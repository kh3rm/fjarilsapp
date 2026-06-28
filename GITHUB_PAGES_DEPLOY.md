# GitHub Pages deployment notes — Annies fjärilar

Version: 1.5.34

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
- Service worker-cache är bumpad till `1.5.34`.
- `reset-cache.html` pekar också på `1.5.34`.
- Inga secret/service-role keys ska läggas i repot. `supabase-config.js` ska bara innehålla public/publishable client key.
- Platsfunktionen kräver HTTPS. GitHub Pages ger HTTPS på `github.io`.
- Kartan använder Leaflet on-demand via CDN och OpenStreetMap tiles först när användaren trycker `Visa karta`.

## Supabase

Kör `supabase/schema.sql` i Supabase SQL Editor om databasen inte redan är uppdaterad. Den innehåller bland annat:

```sql
alter table public.sightings add column if not exists location jsonb;
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
