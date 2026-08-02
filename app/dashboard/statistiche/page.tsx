"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const PREZZO_PLUS = 10;
const PREZZO_PREMIUM = 30;
const PREZZO_PT = 15;

type Statistiche = {
  totaleClienti: number;
  clientiPlus: number;
  clientiPremium: number;
  nuoviUltimoMese: number;
  fatturatoRicorrente: number;
  lezioniPtQuestoMese: number;
  ricavoPtQuestoMese: number;
  prenotazioniSettimana: number;
};

function Metrica({
  etichetta,
  valore,
  sottotitolo,
}: {
  etichetta: string;
  valore: string;
  sottotitolo?: string;
}) {
  return (
    <div className="bg-panel border border-line rounded-card p-5">
      <p className="text-xs text-muted uppercase tracking-wide mb-2">
        {etichetta}
      </p>
      <p className="font-display text-3xl text-gold">{valore}</p>
      {sottotitolo && (
        <p className="text-xs text-muted mt-1">{sottotitolo}</p>
      )}
    </div>
  );
}

export default function StatisticheTrainer() {
  const router = useRouter();
  const [stat, setStat] = useState<Statistiche | null>(null);
  const [caricando, setCaricando] = useState(true);

  useEffect(() => {
    const guardia = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: clienti } = await supabase
        .from("profiles")
        .select("id, created_at")
        .eq("role", "cliente");

      const idClienti = (clienti ?? []).map((c) => c.id);

      const { data: piani } = await supabase
        .from("dati_cliente")
        .select("client_id, piano")
        .in("client_id", idClienti.length > 0 ? idClienti : ["-"]);

      const mappaPiani: Record<string, "plus" | "premium"> = {};
      (piani ?? []).forEach((p) => {
        mappaPiani[p.client_id] = p.piano === "premium" ? "premium" : "plus";
      });

      const clientiPlus = idClienti.filter(
        (id) => (mappaPiani[id] ?? "plus") === "plus"
      ).length;
      const clientiPremium = idClienti.filter(
        (id) => mappaPiani[id] === "premium"
      ).length;

      const unMeseFa = new Date();
      unMeseFa.setDate(unMeseFa.getDate() - 30);
      const nuoviUltimoMese = (clienti ?? []).filter(
        (c) => new Date(c.created_at) >= unMeseFa
      ).length;

      const fatturatoRicorrente =
        clientiPlus * PREZZO_PLUS + clientiPremium * PREZZO_PREMIUM;

      const inizioMese = new Date();
      inizioMese.setDate(1);
      inizioMese.setHours(0, 0, 0, 0);

      const { data: prenotazioniPt } = await supabase
        .from("prenotazioni")
        .select("id, stato, slot_disponibili(data_ora)")
        .eq("tipo", "pt")
        .in("stato", ["richiesto", "confermato"]);

      const lezioniPtQuestoMese = (prenotazioniPt ?? []).filter((p: any) => {
        const d = p.slot_disponibili?.data_ora
          ? new Date(p.slot_disponibili.data_ora)
          : null;
        return d && d >= inizioMese;
      }).length;

      const oraAdesso = new Date();
      const fineSettimana = new Date();
      fineSettimana.setDate(fineSettimana.getDate() + 7);

      const { data: tutteLePrenotazioni } = await supabase
        .from("prenotazioni")
        .select("id, slot_disponibili(data_ora)")
        .in("stato", ["richiesto", "confermato"]);

      const prenotazioniSettimana = (tutteLePrenotazioni ?? []).filter(
        (p: any) => {
          const d = p.slot_disponibili?.data_ora
            ? new Date(p.slot_disponibili.data_ora)
            : null;
          return d && d >= oraAdesso && d <= fineSettimana;
        }
      ).length;

      setStat({
        totaleClienti: idClienti.length,
        clientiPlus,
        clientiPremium,
        nuoviUltimoMese,
        fatturatoRicorrente,
        lezioniPtQuestoMese,
        ricavoPtQuestoMese: lezioniPtQuestoMese * PREZZO_PT,
        prenotazioniSettimana,
      });
      setCaricando(false);
    };
    guardia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (caricando || !stat) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm text-muted">Caricamento…</p>
      </main>
    );
  }

  const percentualePremium =
    stat.totaleClienti > 0
      ? Math.round((stat.clientiPremium / stat.totaleClienti) * 100)
      : 0;

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <a href="/dashboard" className="text-sm text-muted hover:text-paper">
        ← Tutti i clienti
      </a>
      <h1 className="font-display text-3xl uppercase mt-3 mb-8">
        Statistiche
      </h1>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Metrica etichetta="Clienti totali" valore={String(stat.totaleClienti)} />
        <Metrica
          etichetta="Nuovi (30gg)"
          valore={`+${stat.nuoviUltimoMese}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Metrica
          etichetta="Plus"
          valore={String(stat.clientiPlus)}
          sottotitolo={`${PREZZO_PLUS}€/mese ciascuno`}
        />
        <Metrica
          etichetta="Premium"
          valore={String(stat.clientiPremium)}
          sottotitolo={`${percentualePremium}% della base clienti`}
        />
      </div>

      <div className="mb-3">
        <Metrica
          etichetta="Fatturato ricorrente stimato"
          valore={`${stat.fatturatoRicorrente}€/mese`}
          sottotitolo="Solo abbonamenti Plus + Premium, esclusi PT e prime visite"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Metrica
          etichetta="Lezioni PT questo mese"
          valore={String(stat.lezioniPtQuestoMese)}
          sottotitolo={`≈ ${stat.ricavoPtQuestoMese}€`}
        />
        <Metrica
          etichetta="Appuntamenti prossimi 7gg"
          valore={String(stat.prenotazioniSettimana)}
        />
      </div>

      <p className="text-xs text-muted font-mono mt-6">
        Il fatturato è una stima basata sui prezzi standard (Plus {PREZZO_PLUS}€,
        Premium {PREZZO_PREMIUM}€, PT {PREZZO_PT}€) — non tiene conto di sconti,
        mancati pagamenti o prezzi personalizzati.
      </p>
    </main>
  );
}
