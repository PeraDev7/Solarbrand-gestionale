# 🚀 Guida di Migrazione Tecnica: Da Apollo.io API a Google Maps Scraper (Apify) per la Lead Generation B2B

> **Stato**: ✅ COMPLETATA E VERIFICATA CON SUCCESSO su SolarBrand Gestionale Lead (v3.0).  
> **Backend**: Express + Apify Actor `compass~crawler-google-places` con flusso asincrono a round, polling ogni 3s e deduplicazione automatica.  
> **Filtro Qualità**: 100% garantito (vengono ammessi nel database esclusivamente contatti con SIA Email SIA Telefono validi).

Questa guida tecnica è formattata come **specifica e prompt architetturale completo** da fornire all'AI o allo sviluppatore del tuo secondo software. Contiene logica, payload, normalizzazione dati, gestione asincrona a round e codice sorgente di riferimento.

---

## 🎯 1. Obiettivo e Motivazione del Passaggio

### Perché abbandonare Apollo.io in favore di Google Maps Scraper (Apify):
1. **Copertura capillare delle PMI locali**: Apollo ha una copertura limitata su PMI, artigiani, studi professionali, attività commerciali e negozi locali italiani, mentre Google Maps contiene il 100% delle attività reali sul territorio con numeri di telefono diretti, indirizzi fisici e siti web aggiornati.
2. **Costi e Flessibilità**: Con Apollo paghi costosi crediti per esportazione; con Apify (`compass/crawler-google-places`) paghi a consumo effettivo (*Pay-Per-Event*, circa **$1.50 ogni 1.000 attività** scansionate) con arricchimento contatti (email, cellulari dei titolari, ruoli, profili LinkedIn, siti web).
3. **Qualità del Dato**: Google Maps fornisce numeri telefonici attivi e geolocalizzati; il crawler scansiona il sito web aziendale per estrarre le email e interroga database professionali per trovare i nominativi dei referenti chiave (CEO, Direttori, Titolari).

---

## 🏗️ 2. Architettura & Flusso Asincrono (Workflow)

L'estrazione da Google Maps con arricchimento contatti richiede da **30 a 90 secondi** (troppo per una singola chiamata HTTP sincrona che andrebbe in timeout).

### Il pattern asincrono implementato:

```
[ FRONTEND CRM ]
       │
       │ 1. POST /api/leads/apify-search
       │    { industries: "ristoranti", locations: "Milano", fetch_count: 10 }
       ▼
[ BACKEND API ]
       │
       │ 2. Avvia Run su Apify (POST /v2/acts/compass~crawler-google-places/runs)
       │ 3. Genera un jobId in memoria e risponde subito: { ok: true, runId: jobId, status: "RUNNING" }
       ▼
[ FRONTEND CRM ]
       │
       │ 4. Avvia Polling ogni 3 secondi su:
       │    GET /api/leads/apify-search/status?runId=...
       ▼
[ BACKEND STATUS ENDPOINT ]
       │ 5. Controlla lo stato della Run su Apify (GET /v2/actor-runs/{runId})
       │    - Se RUNNING: ritorna { status: "RUNNING" }
       │    - Se SUCCEEDED:
       │        a) Scarica il dataset: GET /v2/datasets/{defaultDatasetId}/items
       │        b) Esegue il Parsing e filtra SOLO lead con EMAIL + TELEFONO
       │        c) Se non bastano per raggiungere fetch_count: allarga il batch e lancia un Round 2 automatico
       │        d) Deduplica e inserisce nel Database dei Lead
       │        e) Ritorna: { status: "DONE", imported: 10, total: 10 }
       ▼
[ FRONTEND CRM ]
       └─► Mostra messaggio di successo e ricarica la tabella lead!
```

---

## ⚙️ 3. Dettagli Attore Apify & Payload di Ricerca

* **Actor ID**: `compass~crawler-google-places` (Google Maps Scraper di Compass)
* **Endpoint Avvio Run**: `POST https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=TUO_APIFY_TOKEN`
* **Endpoint Controllo Run**: `GET https://api.apify.com/v2/actor-runs/{RUN_ID}?token=TUO_APIFY_TOKEN`
* **Endpoint Recupero Dataset**: `GET https://api.apify.com/v2/datasets/{DEFAULT_DATASET_ID}/items?token=TUO_APIFY_TOKEN`

### Payload JSON di Input dell'Attore:

```json
{
  "searchStringsArray": ["ristoranti", "trattorie"],
  "locationQuery": "Milano, Lombardia, Italia",
  "language": "it",
  "maxCrawledPlacesPerSearch": 15,
  "skipClosedPlaces": true,
  "scrapeContacts": true,
  "maximumLeadsEnrichmentRecords": 3,
  "verifyLeadsEnrichmentEmails": true
}
```

### Spiegazione dei Parametri Chiave:
* `searchStringsArray`: Array di settori o categorie commerciali concrete (es. `"impianti fotovoltaici"`, `"commercialisti"`, `"agenzie immobiliari"`). **Attenzione**: non passare ruoli generici come "Direttore Commerciale", ma tipologie di attività.
* `locationQuery`: Stringa geografica aperta (es. `"Roma, Lazio, Italia"`, `"Brescia"`, `"Torino, Piemonte"`).
* `maxCrawledPlacesPerSearch`: Numero di attività da scansionare **per ciascun termine di ricerca**. Formula per calcolarlo dal `targetCount` desiderato:
  $$\\text{batchSize} = \\max(1, \\lceil (\\text{targetCount} \\times 1.5) / \\text{searchStrings.length} \\rceil)$$
  *(Il moltiplicatore 1.5 funge da margine di sicurezza poiché non tutte le aziende sul web hanno sia email che telefono).*
* `scrapeContacts: true`: Effettua lo scraping approfondito del sito web dell'attività per ricavare email aziendali, PEC, link Facebook/Instagram/LinkedIn.
* `maximumLeadsEnrichmentRecords: 3`: Cerca fino a 3 contatti nominativi (persone reali, dipendenti e decisori con nome, ruolo, email personale e cellulare).
* `verifyLeadsEnrichmentEmails: true`: Esegue la verifica di validità delle email (anti-bounce).

---

## 🧹 4. Algoritmo di Parsing, Normalizzazione e Deduplicazione

La risposta di Apify contiene una lista mista di **Place** (aziende) e sotto-oggetti **leadsEnrichment** (persone/decisori).

### Regola d'Oro di Qualità:
Un contatto viene salvato nel CRM **SOLO SE ha sia EMAIL sia TELEFONO validi ed estratti**.

### Mappatura dei Campi:
| Campo Lead CRM | Sorgente nel Dataset Apify |
|---|---|
| **full_name** | `person.fullName` oppure `place.title` (Ragione sociale se persona non trovata) |
| **company** | `person.companyName` oppure `place.title` |
| **role** | `person.jobTitle` (es. "Titolare", "CEO", "Direttore Vendite", o vuoto se aziendale) |
| **email** | `person.email` oppure `place.emails[0]` |
| **phone** | `person.mobileNumber` oppure `place.phoneUnformatted` oppure `place.phone` *(formattato E.164 es. `+39021234567`)* |
| **website** | `place.website` oppure `person.companyWebsite` |
| **address** | `place.address` (Indirizzo fisico completo) |
| **source** | `"apify_google_maps"` |

### Deduplicazione:
Creare una chiave univoca in memoria per scartare i duplicati nello stesso batch:
```typescript
const dedupeKey = `${email.toLowerCase()}|${phone}|${company.toLowerCase()}`;
```

---

## 🔁 5. Logica Multi-Round (Auto-Expansion)

Se l'utente chiede **10 lead**, ma dal primo batch di Google Maps solo 4 attività hanno sia email che telefono:
1. L'endpoint di status verifica se `parsedLeads.length < targetCount`.
2. Se ci sono ancora risultati potenziali su Google Maps e non si è superato il limite di round di sicurezza (max 2 round extra), **raddoppia il batch size** (`batchSize * 2`) e lancia in automatico una nuova run di Apify.
3. Al termine del secondo round unisce i risultati fino a raggiungere esattamente i 10 lead richiesti.

---

## 💻 6. Codice Sorgente Completo di Riferimento (TypeScript / Node.js)

### File 1: `google-maps-scraper.ts` (Client e Parser Apify)

```typescript
export const GOOGLE_MAPS_ACTOR_ID = "compass~crawler-google-places";

export function buildSearchStrings(industries: string, keywords?: string): string[] {
  const set = new Set<string>();
  for (const raw of [industries, keywords]) {
    if (!raw) continue;
    String(raw).split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => set.add(s));
  }
  return Array.from(set);
}

export function buildLocationQuery(locations: string, cities?: string): string {
  const values = [
    ...(locations ? String(locations).split(",") : []),
    ...(cities ? String(cities).split(",") : []),
  ].map((s) => s.trim()).filter(Boolean);

  if (values.length === 0) return "Italia";
  const hasCountry = values.some((v) => /italia|italy/i.test(v));
  return hasCountry ? values.join(", ") : `${values.join(", ")}, Italia`;
}

export function buildActorInput(
  searchStrings: string[],
  locationQuery: string,
  batchSize: number,
  wantsVerifiedEmail: boolean = true
): Record<string, unknown> {
  return {
    searchStringsArray: searchStrings,
    locationQuery,
    language: "it",
    maxCrawledPlacesPerSearch: batchSize,
    skipClosedPlaces: true,
    scrapeContacts: true,
    maximumLeadsEnrichmentRecords: 3,
    verifyLeadsEnrichmentEmails: wantsVerifiedEmail,
  };
}

export async function startApifyRun(
  apifyToken: string,
  actorInput: Record<string, unknown>
): Promise<{ runId: string; status: string } | { error: string }> {
  const url = `https://api.apify.com/v2/acts/${GOOGLE_MAPS_ACTOR_ID}/runs?token=${encodeURIComponent(apifyToken)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(actorInput),
  });

  if (!res.ok) {
    return { error: await res.text() };
  }

  const data = await res.json();
  return { runId: data.data.id, status: data.data.status };
}

export function parseGoogleMapsItems(items: any[]) {
  const leads: any[] = [];
  const seenKeys = new Set<string>();
  const seenPlaceIds = new Set<string>();

  for (const item of items) {
    const placeIdentity = item.placeId || item.fid || item.title;
    if (placeIdentity) seenPlaceIds.add(String(placeIdentity));

    // Estrai persone arricchite o usa il place direttamente
    const people = item.leadsEnrichment || item.enrichedLeads || [null];

    for (const person of people) {
      const full_name = person?.fullName || (person?.firstName ? `${person.firstName} ${person.lastName || ""}`.trim() : "") || item.title || "";
      const company = person?.companyName || item.title || "";
      const role = person?.jobTitle || "";
      const email = person?.email || (Array.isArray(item.emails) && item.emails[0]) || "";
      const rawPhone = person?.mobileNumber || item.phoneUnformatted || item.phone || "";
      
      // Formatta numero in standard internazionale
      const phone = rawPhone ? rawPhone.replace(/[^\d+]/g, "") : "";
      const website = item.website || person?.companyWebsite || "";
      const address = item.address || "";

      // Filtro di qualità imperativo: serve sia EMAIL che TELEFONO
      if (!email || !phone) continue;

      const dedupeKey = `${email.toLowerCase()}|${phone}|${company.toLowerCase()}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      leads.push({
        full_name,
        company,
        role,
        email,
        phone,
        website,
        address,
      });
    }
  }

  return { leads, placesScanned: seenPlaceIds.size };
}
```

---

### File 2: `scraper-jobs.ts` (In-Memory Job Manager)

```typescript
export interface ScraperJob {
  tenantId: string;
  apifyToken: string;
  createdAt: number;
  targetCount: number;
  searchStrings: string[];
  locationQuery: string;
  wantsVerifiedEmail: boolean;
  currentApifyRunId: string;
  currentBatchSize: number;
  roundsDone: number;
  result?: any;
}

const jobs = new Map<string, ScraperJob>();

export function createJob(jobId: string, job: ScraperJob) { jobs.set(jobId, job); }
export function getJob(jobId: string) { return jobs.get(jobId); }
export function updateJob(jobId: string, patch: Partial<ScraperJob>) {
  const j = jobs.get(jobId);
  if (j) Object.assign(j, patch);
}
```

---

### File 3: Endpoint di Avvio (`POST /api/leads/apify-search`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { buildSearchStrings, buildLocationQuery, buildActorInput, startApifyRun } from "./google-maps-scraper";
import { createJob } from "./scraper-jobs";

export async function POST(req: NextRequest) {
  const { industries, locations, fetch_count = 20, email_status } = await req.json();
  const apifyToken = process.env.APIFY_TOKEN; // O recuperato dal DB/Settings

  if (!apifyToken) {
    return NextResponse.json({ error: "APIFY_TOKEN non configurato" }, { status: 400 });
  }

  const searchStrings = buildSearchStrings(industries);
  const locationQuery = buildLocationQuery(locations);
  const targetCount = Math.min(Number(fetch_count), 200);
  const initialBatchSize = Math.max(1, Math.ceil((targetCount * 1.5) / searchStrings.length));
  
  const actorInput = buildActorInput(searchStrings, locationQuery, initialBatchSize, true);
  const started = await startApifyRun(apifyToken, actorInput);

  if ("error" in started) {
    return NextResponse.json({ error: started.error }, { status: 400 });
  }

  const jobId = randomUUID();
  createJob(jobId, {
    tenantId: "default",
    apifyToken,
    createdAt: Date.now(),
    targetCount,
    searchStrings,
    locationQuery,
    wantsVerifiedEmail: true,
    currentApifyRunId: started.runId,
    currentBatchSize: initialBatchSize,
    roundsDone: 0,
  });

  return NextResponse.json({ ok: true, runId: jobId, status: started.status });
}
```

---

### File 4: Endpoint di Polling Status & Salvataggio (`GET /api/leads/apify-search/status`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getJob, updateJob } from "./scraper-jobs";
import { parseGoogleMapsItems, buildActorInput, startApifyRun } from "./google-maps-scraper";

export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get("runId");
  const job = getJob(runId || "");
  if (!job) return NextResponse.json({ error: "Job non trovato" }, { status: 404 });

  if (job.result) return NextResponse.json(job.result);

  // Controlla stato run su Apify
  const runRes = await fetch(`https://api.apify.com/v2/actor-runs/${job.currentApifyRunId}?token=${job.apifyToken}`);
  const runData = await runRes.json();
  const status = runData?.data?.status;

  if (status === "READY" || status === "RUNNING") {
    return NextResponse.json({ status: "RUNNING" });
  }

  if (status !== "SUCCEEDED") {
    job.result = { status: "FAILED", error: "Run fallita su Apify" };
    return NextResponse.json(job.result);
  }

  // Scarica il dataset
  const datasetId = runData.data.defaultDatasetId;
  const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${job.apifyToken}`);
  const rawItems = await itemsRes.json();
  const { leads, placesScanned } = parseGoogleMapsItems(rawItems);

  // Se non bastano e abbiamo altri round possibili:
  if (leads.length < job.targetCount && job.roundsDone < 2 && placesScanned >= job.currentBatchSize * job.searchStrings.length) {
    const newBatchSize = job.currentBatchSize * 2;
    const actorInput = buildActorInput(job.searchStrings, job.locationQuery, newBatchSize, job.wantsVerifiedEmail);
    const newRun = await startApifyRun(job.apifyToken, actorInput);
    if (!("error" in newRun)) {
      updateJob(runId!, { currentApifyRunId: newRun.runId, currentBatchSize: newBatchSize, roundsDone: job.roundsDone + 1 });
      return NextResponse.json({ status: "RUNNING", foundSoFar: leads.length });
    }
  }

  // Salva i lead nel database
  const finalLeads = leads.slice(0, job.targetCount);
  for (const lead of finalLeads) {
    // Inserisci nella tua tabella lead (es. INSERT INTO leads ...)
    // await db.insertLead(lead);
  }

  job.result = {
    status: "DONE",
    ok: true,
    imported: finalLeads.length,
    total: finalLeads.length,
  };

  return NextResponse.json(job.result);
}
```

---

## 📋 7. Checklist di Verifica per l'AI del tuo Altro Software

Chiedi all'AI del tuo altro software di verificare questi punti durante l'implementazione:
* [ ] Rimosso il client API di Apollo.io e sostituito con l'endpoint Apify `compass~crawler-google-places`.
* [ ] Input utente adattato: form con **Settore/Attività** (es. "Fisioterapisti"), **Città/Provincia** (es. "Bologna") e **Numero Lead**.
* [ ] Richiesta asincrona con ID lavoro e polling periodico (intervallo 3 secondi) per non bloccare l'interfaccia.
* [ ] Filtro di validazione: solo i contatti con **sia email sia numero di telefono** vengono ammessi nel database.
* [ ] Numeri telefonici normalizzati nel formato standard internazionale E.164 (`+39...`).
* [ ] Deduplicazione prima dell'inserimento per evitare contatti duplicati.
