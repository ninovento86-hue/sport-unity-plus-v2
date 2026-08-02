"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Prenotazione = {
  id: string;
  slot_id: string;
  client_id: string;
  tipo: "pt" | "valutazione";
  stato: "richiesto" | "confermato" | "rifiutato" | "annullato";
  nota_cliente: string | null;
  nota_trainer: string | null;
};

type Slot = {
  id: string;
  data_ora: string;
  durata_minuti: number;
  prenotazione: Prenotazione | null;
  nome_cliente: string | null;
};

export default function CalendarioTrainer() {
  const router = useRouter();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [nuovaData, setNuovaData] = useState("");
  const [nuovaDurata, setNuovaDurata] = useState("60");
  const [creandoSlot, setCreandoSlot] = useState(false);
  const [erroreSlot, setErroreSlot] = useState<string | null>(null);
  const [elaborando, setElaborando] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(true);

  const caricaTutto = async () => {
    const { data: slotData } = await supabase
      .from("slot_disponibili")
      .select("id, data_ora, durata_minuti")
      .gte("data_ora", new Date().toISOString())
      .order("data_ora", { ascending: true });

    const { data: prenotazioniData } = await supabase
      .from("prenotazioni")
      .select("*")
      .in("stato", ["richiesto", "confermato"]);

    const idClienti = Array.from(
      new Set((prenotazioniData ?? []).map((p) => p.client_id))
    );
    let mappaNomi: Record<string, string> = {};
    if (idClienti.length > 0) {
      const { data: profili } = await supabase
        .from("profiles")
        .select("id, nome_completo")
        .in("id", idClienti);
      mappaNomi = Object.fromEntries(
        (profili ?? []).map((p) => [p.id, p.nome_completo])
      );
    }

    const slotConPrenotazione: Slot[] = (slotData ?? []).map((s) => {
      const prenotazione =
        (prenotazioniData ?? []).find((p) => p.slot_id === s.id) ?? null;
      return {
        ...s,
        prenotazione,
        nome_cliente: prenotazione ? mappaNomi[prenotazione.client_id] ?? null : null,
      };
    });

    setSlots(slotConPrenotazione);
    setCaricando(false);
  };

  useEffect(() => {
    const guardia = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      caricaTutto();
    };
    guardia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const creaSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroreSlot(null);
    if (!nuovaData) return;
    setCreandoSlot(true);

    const { error } = await supabase.from("slot_disponibili").insert({
      data_ora: new Date(nuovaData).toISOString(),
      durata_minuti: parseInt(nuovaDurata) || 60,
    });

    if (error) {
      setErroreSlot(`Errore: ${error.message}`);
      setCreandoSlot(false);
      return;
    }

    setNuovaData("");
    setCreandoSlot(false);
    caricaTutto();
  };

  const eliminaSlot = async (slotId: string) => {
    await supabase.from("slot_disponibili").delete().eq("id", slotId);
    caricaTutto();
  };

  const rispondiPrenotazione = async (
    prenotazione: Prenotazione,
    stato: "confermato" | "rifiutato"
  ) => {
    setElaborando(prenotazione.id);
    await supabase
      .from("prenotazioni")
      .update({ stato, updated_at: new Date().toISOString() })
      .eq("id", prenotazione.id);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    fetch("/api/notifica-cliente", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        tipo: "esito_appuntamento",
        client_id: prenotazione.client_id,
        dettagli: {
          stato,
          data_ora: slots.find((s) => s.prenotazione?.id === prenotazione.id)
            ? new Date(
                slots.find((s) => s.prenotazione?.id === prenotazione.id)!.data_ora
              ).toLocaleString("it-IT")
            : "",
        },
      }),
    }).catch(() => {});

    setElaborando(null);
    caricaTutto();
  };

  if (caricando) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm text-muted">Caricamento…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <a href="/dashboard" className="text-sm text-muted hover:text-paper">
        ← Tutti i clienti
      </a>
      <h1 className="font-display text-3xl uppercase mt-3 mb-8">
        Calendario appuntamenti
      </h1>

      <form
        onSubmit={creaSlot}
        className="bg-panel border border-line rounded-card p-6 mb-8"
      >
        <p className="text-sm text-muted mb-3">Aggiungi uno slot disponibile</p>
        <div className="flex gap-2 mb-3">
          <input
            type="datetime-local"
            required
            value={nuovaData}
            onChange={(e) => setNuovaData(e.target.value)}
            className="flex-1 px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
          />
          <select
            value={nuovaDurata}
            onChange={(e) => setNuovaDurata(e.target.value)}
            className="px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
          >
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={creandoSlot}
          className="px-5 py-2 rounded-card bg-gold text-ink font-display uppercase text-sm tracking-wide disabled:opacity-50"
        >
          {creandoSlot ? "Aggiunta…" : "Aggiungi slot"}
        </button>
        {erroreSlot && (
          <p className="text-sm text-red-400 mt-3" role="alert">
            {erroreSlot}
          </p>
        )}
      </form>

      <h2 className="font-display uppercase text-lg mb-4">
        Prossimi slot ({slots.length})
      </h2>

      {slots.length === 0 ? (
        <p className="text-muted text-sm">
          Nessuno slot futuro. Aggiungine uno qui sopra.
        </p>
      ) : (
        <div className="border border-line rounded-card divide-y divide-line overflow-hidden">
          {slots.map((s) => (
            <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm">
                  {new Date(s.data_ora).toLocaleString("it-IT", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  <span className="text-muted text-xs ml-2">
                    ({s.durata_minuti} min)
                  </span>
                </p>
                {s.prenotazione && (
                  <p className="text-xs text-muted mt-0.5">
                    {s.nome_cliente} —{" "}
                    {s.prenotazione.tipo === "pt" ? "Lezione PT" : "Valutazione"}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!s.prenotazione ? (
                  <>
                    <span className="text-[10px] font-mono uppercase px-2 py-1 rounded-card border border-line text-muted">
                      libero
                    </span>
                    <button
                      onClick={() => eliminaSlot(s.id)}
                      className="text-xs text-muted hover:text-red-400"
                    >
                      elimina
                    </button>
                  </>
                ) : s.prenotazione.stato === "richiesto" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => rispondiPrenotazione(s.prenotazione!, "confermato")}
                      disabled={elaborando === s.prenotazione.id}
                      className="text-xs px-3 py-1.5 rounded-card bg-gold text-ink font-display uppercase tracking-wide disabled:opacity-50"
                    >
                      Conferma
                    </button>
                    <button
                      onClick={() => rispondiPrenotazione(s.prenotazione!, "rifiutato")}
                      disabled={elaborando === s.prenotazione.id}
                      className="text-xs px-3 py-1.5 rounded-card border border-line text-muted font-display uppercase tracking-wide disabled:opacity-50"
                    >
                      Rifiuta
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono uppercase px-2 py-1 rounded-card border text-gold border-gold">
                    confermato
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
"Add appuntamenti page"
