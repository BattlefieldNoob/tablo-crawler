import type { TavoloDetails } from "./http";

export function formatDistance(d: string | undefined): string {
  const n = d ? Number(d) : 0;
  return n.toFixed(1);
}

export function formatTavoloMessage(t: TavoloDetails, dateString: string, formattedDistance: string): string {
  const lines: string[] = [];
  lines.push(`🍽️ ${t.nomeRistorante}`);
  lines.push(`📅 Data: ${dateString}`);
  lines.push(`👥 Partecipanti (${t.partecipanti.length}):`);
  for (const p of t.partecipanti) {
    const gender = p.sessoMaschile ? "👨" : "👩";
    lines.push(`  ${gender} ${p.nome} ${p.cognome} (${p.dataDiNascita.slice(0,4)})`);
  }
  return lines.join("\n");
}

export function formatSummary(total: number, balanced: number, days: number): string {
  return `📊 Scansione multi-giorno completata: ${total} tavoli totali, ${balanced} con equilibrio di genere (prossimi ${days} giorni)`;
}
