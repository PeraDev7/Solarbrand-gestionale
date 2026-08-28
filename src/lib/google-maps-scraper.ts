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
  try {
    const url = `https://api.apify.com/v2/acts/${GOOGLE_MAPS_ACTOR_ID}/runs?token=${encodeURIComponent(apifyToken)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(actorInput),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { error: `Errore Apify (${res.status}): ${errText}` };
    }

    const data = await res.json();
    return { runId: data.data.id, status: data.data.status };
  } catch (err: any) {
    return { error: `Errore di rete con Apify: ${err?.message || 'sconosciuto'}` };
  }
}

export interface ParsedGoogleMapsLead {
  full_name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  website: string;
  address: string;
}

export function parseGoogleMapsItems(items: any[]): { leads: ParsedGoogleMapsLead[]; placesScanned: number } {
  const leads: ParsedGoogleMapsLead[] = [];
  const seenKeys = new Set<string>();
  const seenPlaceIds = new Set<string>();

  if (!Array.isArray(items)) {
    return { leads, placesScanned: 0 };
  }

  for (const item of items) {
    if (!item) continue;
    const placeIdentity = item.placeId || item.fid || item.title || item.url;
    if (placeIdentity) seenPlaceIds.add(String(placeIdentity));

    // Estrai persone arricchite oppure usa il place se non ci sono persone
    const enrichedList = item.leadsEnrichment || item.enrichedLeads;
    const people = Array.isArray(enrichedList) && enrichedList.length > 0 ? enrichedList : [null];

    for (const person of people) {
      const full_name = person?.fullName || (person?.firstName ? `${person.firstName} ${person.lastName || ""}`.trim() : "") || item.title || "";
      const company = person?.companyName || item.title || "";
      const role = person?.jobTitle || (person ? "Referente aziendale" : "");
      const email = (person?.email || (Array.isArray(item.emails) && item.emails[0]) || "").toLowerCase().trim();
      const rawPhone = person?.mobileNumber || item.phoneUnformatted || item.phone || "";
      
      // Formatta numero telefonico
      const phone = rawPhone ? String(rawPhone).replace(/[^\d+]/g, "").trim() : "";
      const website = item.website || person?.companyWebsite || "";
      const address = [item.address, item.city, item.state, item.countryCode].filter(Boolean).join(", ") || item.address || "";

      // Filtro di qualità fondamentale: serve SIA EMAIL SIA TELEFONO
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

