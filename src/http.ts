// Tablo API constants
export const TABLO_API_SUCCESS_CODE = 0;

export interface UtentiInvitoResponse {
  code: number;
  message?: string;
  persone: PersonaInvito[];
}

export interface PersonaInvito {
  idUtente: string;
  nome: string;
  cognome: string;
  sessoMaschile?: string; // "0" | "1"
  dataDiNascita?: string;
  distanza?: string; // as string number
  posizioneCitta?: string;
  numPartecipazioni?: string;
  numInviti?: string;
}

// Tavoli (tables) models
export interface TavoliNewOrderResponse {
  code: number;
  message?: string;
  tavoli: TavoloSummary[];
}

export interface TavoloSummary {
  idPartecipanti: string[];
  idTavolo: string;
  distanza?: string;
  nomeRistorante?: string;
}

export interface TavoloResponse {
  code: number;
  message?: string;
  tavolo: TavoloDetails;
}

export interface TavoloDetails {
  nomeRistorante: string;
  partecipanti: Partecipante[];
}

export interface Partecipante {
  idUtente: string;
  sessoMaschile: boolean;
  nome: string;
  cognome: string;
  dataDiNascita: string;
  partecipante: boolean;
  avatar?: string;
  isBrand?: boolean;
}

export class TabloClient {
  constructor(private baseUrl: string, private authToken: string) { }

  async getNewUtentiInvitoRistorante(idRistorante: string): Promise<UtentiInvitoResponse> {
    const url = new URL(`/tavoliService/getNewUtentiInvitoRistorante`, this.baseUrl);
    url.searchParams.set("idRistorante", idRistorante);

    const res = await fetch(url, {
      method: "GET",
      headers: { "X-AUTH-TOKEN": this.authToken },
    });
    if (!res.ok) throw new Error(`API status ${res.status}`);
    return (await res.json()) as UtentiInvitoResponse;
  }

  async getTavoliNewOrder(params: Record<string, string>): Promise<TavoliNewOrderResponse> {
    const url = new URL(`/tavoliService/getTavoliNewOrder`, this.baseUrl);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url, {
      method: "GET",
      headers: { "X-AUTH-TOKEN": this.authToken },
    });
    if (!res.ok) throw new Error(`API status ${res.status}`);
    return (await res.json()) as TavoliNewOrderResponse;
  }

  async getTavolo(idTavolo: string): Promise<TavoloResponse> {
    const url = new URL(`/tavoliService/getTavolo`, this.baseUrl);
    url.searchParams.set("idTavolo", idTavolo);
    const res = await fetch(url, {
      method: "GET",
      headers: { "X-AUTH-TOKEN": this.authToken },
    });
    if (!res.ok) throw new Error(`API status ${res.status}`);
    return (await res.json()) as TavoloResponse;
  }
}

export function toNumberOrNull(v?: string): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
