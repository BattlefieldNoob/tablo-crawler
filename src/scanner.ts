import { TabloClient, TavoloSummary } from "./http";
import { hasMinimumParticipants, isWithinDistance, hasGenderBalance } from "./filter";
import { formatDistance, formatSummary, formatTavoloMessage } from "./format";
import type { AppConfig } from "./config";
import type { MessageService } from "./message";

export async function scanMultipleDays(client: TabloClient, message: MessageService, config: AppConfig) {
  const today = new Date();
  let totalFound = 0;
  let balanced = 0;
  const allProcessed: Array<[string, string]> = [];

  for (let offset = 1; offset <= config.daysToScan; offset++) {
    const d = new Date(today.getTime() + offset * 86400000);
    const dateString = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const params = {
      mappa: "0",
      page: "0",
      orderType: "filtering",
      raggio: "4",
      lat: "45.408153",
      lng: "11.875273",
      dateTavolo: `["${dateString}"]`,
      ageMax: "37",
      ageMin: "18",
      itemPerPage: "20",
    };

    const list = await client.getTavoliNewOrder(params);
    totalFound += list.tavoli.length;

    const kept: { id: string; distance: string; }[] = [];
    for (const t of list.tavoli) {
      const full = await client.getTavolo(t.idTavolo);
      if (!hasMinimumParticipants(full.tavolo, config.minParticipants)) continue;
      if (!isWithinDistance(t.distanza, config.maxDistance)) continue;
      kept.push({ id: t.idTavolo, distance: t.distanza ?? "" });

      const formattedDistance = formatDistance(t.distanza);
      const msg = formatTavoloMessage(full.tavolo, dateString, formattedDistance);
      console.log(`📋 Dettagli tavolo ${t.idTavolo} (${dateString}) - Distanza: ${formattedDistance}km:\n${msg}`);
      if (hasGenderBalance(full.tavolo)) {
        balanced++;
        await message.send(msg);
      }
    }

    kept.sort((a,b) => (Number(a.distance) || 1e9) - (Number(b.distance) || 1e9));
    for (const k of kept) allProcessed.push([k.id, k.distance]);
  }

  const summary = formatSummary(totalFound, balanced, config.daysToScan);
  console.log(summary);
  if (balanced === 0) await message.send(`⚖️ Nessun tavolo con equilibrio di genere trovato nei prossimi ${config.daysToScan} giorni. Trovati ${totalFound} tavoli totali.`);
  else await message.send(summary);
}
