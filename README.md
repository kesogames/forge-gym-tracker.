# Forge · Gym Tracker

Premium, mobile-first krachttrainings-app in het Nederlands. Schema's maken, trainingen met één tik starten, sets razendsnel registreren en direct zien of je sterker wordt.

**Local-first:** alle gegevens staan eerst op het apparaat (IndexedDB). De app werkt volledig offline, een actieve training overleeft refresh, afsluiten en vergrendelen. Met Supabase-keys erbij krijg je accounts en sync tussen apparaten, beveiligd met Row Level Security.

## Starten

```bash
npm install
npm run dev          # http://localhost:3000
```

Productie:

```bash
npm run build
npm start            # http://localhost:3000
```

Op je telefoon testen in hetzelfde wifi-netwerk: `npm run dev -- -H 0.0.0.0` en open `http://<ip-van-je-laptop>:3000`. Installeren als app (PWA) en meldingen vereisen HTTPS, dus doe dat na deployen.

## Wat zit erin

| Onderdeel | Inhoud |
|---|---|
| Training | Start uit schema, vorige training of leeg. Live timer (uu:mm:ss) berekend uit de opgeslagen starttijd, pauzeren/hervatten, totale vs. actieve tijd, rusttimer met geluid/trilling/melding, vorige prestatie per oefening, vooraf ingevulde waarden (nooit automatisch voltooid), warming-up/drop/falen-sets, RPE/RIR, notities op training/oefening/set, supersets, alternatieven, live PR-detectie |
| Samenvatting | Totale en actieve tijd, start/eind, oefeningen, werksets, volume, records, vergelijking met vorige keer, spiergroepen, badges, XP |
| Dashboard | Begroeting, start/hervat, weekdoel, statistieken met verschil t.o.v. vorige periode, grafieken (volume per week, krachtprogressie, tijd per sessie, volume per oefening, frequentie en sets per spiergroep), filters op periode/oefening/spiergroep/schema, uitdagingen, recente trainingen |
| Schema's | Builder met dagen, sets, rep ranges, rust, doelgewicht, supersets, notities; slepen of pijltjes om te herschikken; dupliceren, archiveren, favorieten; voorbeelden (PPL, Upper/Lower, Full Body) |
| Oefeningen | 151 oefeningen met Nederlandse naam, uitvoering, spiergroepen, materiaal, type, rusttijd, alternatieven en afbeeldingen; filters; eigen oefeningen met foto |
| Progressie | Sets per spiergroep vs. vorige week en eigen weekdoel, rustige signalen, per oefening (gewicht/reps/volume/1RM, periodevergelijking), lichaamsgewicht, records, badges en levels |
| Historie | Alle trainingen met filters (periode, oefening, spiergroep, schema, duur, volume, status), detail, achteraf bewerken, opnieuw uitvoeren |
| Instellingen | Thema (donker/licht/systeem), kg/lb, weekdoel, rust, telmethode, lichaamsgewicht in volume, account & sync, CSV/JSON-export, back-up importeren |

## Berekeningen (centraal in `src/lib/domain`)

- **Tijd** (`time.ts`): verstreken tijd = nu − starttijd − pauzes. Nooit een teller, dus correct na vergrendelen, achtergrond en refresh. Opslag in ISO 8601 UTC, weergave in lokale tijd.
- **Volume** (`volume.ts`): gewicht × herhalingen, alleen voltooide werksets. Warming-up en niet-afgevinkte sets tellen niet. Tijd en afstand apart. Lichaamsgewicht: standaard alleen extra gewicht, optioneel (lichaamsgewicht + extra). Assisted: lichaamsgewicht − ondersteuning. Eenzijdig: per kant, niet verdubbeld.
- **Settelling**: primair = 1 set, secundair apart geregistreerd; optioneel gewogen (secundair = 0,5). De actieve methode staat altijd in beeld.
- **Records** (`records.ts`): volledig herberekend uit de historie met deterministische id's, dus nooit dubbel. De eerste uitvoering is een nulmeting, geen record. 1RM = Epley (t/m 12 reps), altijd als schatting getoond.
- **Gamification** (`gamification.ts`): XP wordt afgeleid uit data (trainingen, werksets, records, behaalde weekdoelen, badges), dus opnieuw opslaan geeft geen dubbele XP. Badges worden eenmalig op sleutel opgeslagen.

## Architectuur

```
src/app/            schermen (App Router, client-side)
src/components/     UI, training, grafieken
src/lib/domain/     pure rekenlogica (getest)
src/lib/db/         Dexie-schema, repository (alle schrijfacties), zod-validatie, opslagstatus
src/lib/sync/       Supabase-sync (outbox, pull/push, soft deletes)
src/lib/data/       oefeningen, spiergroepen, voorbeeldschema's
supabase/           migratie (schema + RLS) en seed
tests/unit          domein- en repository-tests (fake IndexedDB)
tests/db            migratie + RLS tegen echte Postgres
tests/e2e           Playwright: volledige stroom + alle schermen mobiel/desktop
```

Een uitgevoerde training bewaart een **momentopname** van elke oefening (naam, afbeelding, spieren, type). Schema's of oefeningen aanpassen verandert de historie dus nooit.

## Supabase koppelen (optioneel)

1. Maak een project op supabase.com.
2. Voer `supabase/migrations/20261018000000_init.sql` uit (SQL Editor of `supabase db push`), daarna `supabase/seed.sql`.
3. Kopieer `.env.example` naar `.env.local` en vul `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY` in (Project Settings → API).
4. Authentication → Providers: e-mail aan. Zet "Confirm email" naar wens.
5. Herstart de app. In Instellingen verschijnt "Account & sync". Bij de eerste login worden bestaande lokale gegevens naar je account gestuurd.

Sync: eerst ophalen, dan versturen. Lokale wijzigingen die nog niet verstuurd zijn winnen; verder last-write-wins op `updated_at`. Verwijderingen zijn soft deletes (`deleted_at`). Logt een andere gebruiker in op hetzelfde apparaat, dan worden de lokale gegevens eerst gewist.

## Testen

```bash
npm run lint
npm run typecheck
npm test                 # unit + repository
npm run test:db          # migratie + RLS (vereist Postgres, zie .env.example)
npm run build
npm run test:e2e         # vereist eerst npm run build
```

Lokale Postgres voor `test:db` (Debian/Ubuntu): `pg_ctlcluster 16 main start`, `sudo -u postgres psql -c "alter user postgres password 'postgres'" -c "create database gym_rls_test"`.

Demo-gegevens bekijken (10 weken historie): `npm run demo` en importeer `demo-backup.json` via Instellingen → Back-up importeren. Gebruik dit niet in je echte profiel; het overschrijft niets maar voegt trainingen toe.

## Deployen

Vercel: importeer de repo, voeg de twee `NEXT_PUBLIC_SUPABASE_*` variabelen toe (optioneel), deploy. Elke Node-host met `npm run build && npm start` werkt ook.

## Bekende beperkingen

- Rust-meldingen als de app volledig op de achtergrond staat zijn afhankelijk van de browser. Op iOS werken meldingen alleen als geïnstalleerde PWA (iOS 16.4+) en kan de timer pas bij terugkeer melden. De tijd zelf klopt altijd.
- Sync is last-write-wins per rij; gelijktijdig dezelfde set op twee apparaten bewerken kan één wijziging overschrijven.
- Afbeeldingen zijn foto's uit free-exercise-db (Unlicense, publiek domein); een paar oefeningen zonder bron tonen een nette placeholder.
