# Annies fjärilar

Annies fjärilar med två vyer, egen samling, egna fjärilsarter, IndexedDB-cache och Supabase-synk. Den här iterationen använder ett tvåtypsnittssystem med Inter + Latin Modern Roman och bucketnamnet `fjarilsbilder`.

## Starta lokalt

Det här är en statisk GitHub Pages-version. Ingen Express-server behövs.

Kör valfri enkel statisk server från repo-roten, till exempel:

```bash
python3 -m http.server 8000
```

Öppna:

```text
http://localhost:8000
```

## Vad som är nytt i denna version

- Supabase-konfiguration ligger i `supabase-config.js`.
- Bilder komprimeras i webbläsaren till max cirka 1 MB och max 2000 px på längsta sidan.
- Nya samlingsposter sparas lokalt först och synkas sedan till Supabase när användaren är inloggad.
- Egna fjärilar sparas lokalt först och synkas sedan till Supabase.
- Bilder laddas upp till privat Storage bucket: `fjarilsbilder`.
- Metadata sparas i tabellerna `sightings` och `custom_butterflies`.
- Molnbilder hämtas privat med inloggad session, inte via publik bucket.
- Appen har enkel PWA-bas: `manifest.webmanifest` och `sw.js` cachear statiska filer efter första besöket.
- Klick på fjärilsbilder öppnar en enkel lightbox med liten zoom.
- Export och import av JSON finns kvar som manuell backup.

## Supabase

Frontend använder:

```js
SUPABASE_URL = 'https://fzypmhotdnkxsszjddav.supabase.co'
SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_x1UKSpx1-znb4ClYFG_Ulg_9dH6lY_c'
BUCKET = 'fjarilsbilder'
```

Detta är en publishable key, alltså en klientnyckel. Använd aldrig secret/service-role key i frontend.

## SQL setup

Kör filen:

```text
supabase/schema.sql
```

i Supabase SQL Editor. Den skapar/uppdaterar:

- `public.sightings`
- `public.custom_butterflies`
- RLS-policies för båda tabellerna
- Storage-policies för bucket `fjarilsbilder`

Filen är skriven för att tåla att delar redan finns: den använder `create table if not exists`, `alter table ... add column if not exists` och droppar/skapar om policies.

## Rekommenderade bucket settings

```text
Bucket name: fjarilsbilder
Public bucket: OFF
Restrict file size: ON, 1 MB
Restrict MIME types: ON, image/webp,image/jpeg
```

PNG fungerar under test om du tillät det, men appen försöker ladda upp WebP/JPEG.

## Auth

Skapa en användare manuellt i Supabase:

```text
Authentication → Users → Add user
```

Första versionen är enklast med ett gemensamt konto för syster/systerdotter. Stäng av öppen registrering när kontot är skapat.

## Offline-first-flöde

1. Användaren väljer bild.
2. Appen komprimerar bilden lokalt.
3. Samlingsposten sparas direkt i IndexedDB.
4. UI uppdateras direkt.
5. Om användaren är inloggad och online laddas bilden upp till Supabase Storage.
6. Metadata sparas i Supabase-databasen.
7. Om nätet saknas ligger posten kvar lokalt som väntande och synkas senare.

## GitHub Pages

För GitHub Pages publicerar du de statiska filerna:

```text
index.html
styles.css
script.js
supabase-config.js
sw.js
manifest.webmanifest
assets/
data/
```

Service worker kräver HTTPS eller localhost, vilket GitHub Pages ger.

## Data

- Grunddata: `data/butterflies.json`
- Original-CSV: `data/svenska_dagfjarilar_30_med_bilder.csv`
- Supabase setup: `supabase/schema.sql`

Grundarternas referensbilder hämtas från Wikimedia Commons. Egna bilder betraktas som privata och lagras i användarens privata Supabase-bucketmapp.


## Om du ser en gammal version lokalt

Tidigare testversioner kan ha registrerat en service worker på `localhost:3000`. Om webbläsaren visar den gamla `Fjärils-guiden`-layouten, öppna:

```text
http://localhost:3000/reset-cache.html
```

Sidan avregistrerar gamla service workers, tar bort cache och skickar dig vidare till nya versionen.



## GitHub Pages-ready package v1.5.34

Den här zippen är förberedd för GitHub Pages:

- `.nojekyll` finns i roten.
- `manifest.webmanifest` har relativ `start_url` och `scope`.
- Alla appens egna asset/script/style paths är relativa.
- Service worker och cache-busters är bumpade till `1.5.34`.
- `reset-cache.html` pekar på `1.5.34`.
- `.gitignore` är tillagd för lokal utveckling.
- `GITHUB_PAGES_DEPLOY.md` innehåller en kort deploy-checklista.

Platsfunktionen är frivillig: poster utan `location` renderar inget kartalternativ.
