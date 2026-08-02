"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Slot = {
  id: string;
  data_ora: string;
  durata_minuti: number;
};

type Prenotazione = {
  id: string;
  slot_id: string;
  tipo: "pt" | "valutazione";
  stato: "richiesto" | "confermato" | "rifiutato" | "annullato";
  nota_cliente: string | null;
  nota_trainer: string | null;
};

export default function AppuntamentiAreaCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [slotLiberi, setSlotLiberi] = useState<Slot[]>([]);
  const [mieProssime, setMieProssime] = useState<
    (Prenotazione & { data_ora: string })[]
  >([]);
  const [slotSelezionato, setSlotSelezionato] = useState<string | null>(null);
  const [tipoScelto, setTipoScelto] = useState<"pt" | "valutazione">("pt");
  const [notaCliente, setNotaCliente] = useState("");
  const [prenotando, setPrenotando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(true);

  const caricaTutto = async () => {
    const { data: prenotazioniData } = await supabase
      .from("prenotazioni")
      .select("*, slot_disponibili(data_ora, durata_minuti)")
      .eq("client_id", id)
      .in("stato", ["richiesto", "confermato"]);

    const idSlotOccupati = (prenotazioniData ?? []).map((p) => p.slot_id);

    let query = supabase
      .from("slot_disponibili")
      .select("id, data_ora, durata_minuti")
      .gte("data_ora", new Date().toISOString())
      .order("data_ora", { ascending: true });

    const { data: slotData } = await query;

    const liberi = (slotData ?? []).filter(
      (s) => !idSlotOccupati.includes(s.id)
    );
    setSlotLiberi(liberi);

    const mieMappate = (prenotazioniData ?? []).map((p: any) => ({
      id: p.id,
      slot_id: p.slot_id,
      tipo: p.tipo,
      stato: p.stato,
      nota_cliente: p.nota_cliente,
      nota_trainer: p.nota_trainer,
      data_ora: p.slot_disponibili?.data_ora,
    }));
    setMieProssime(mieMappate);

    setCaricando(false);
  };

  useEffect(() => {
    const guardia = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/area-cliente");
        return;
      }
      if (session.user.id !== id) {
        router.replace(`/area-cliente/${session.user.id}/appuntamenti`);
        return;
      }
      caricaTutto();
    };
    guardia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const prenota = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);
    if (!slotSelezionato) {
      setErrore("Scegli uno slot dalla lista.");
      return;
    }
    setPrenotando(true);

    const { error } = await supabase.from("prenotazioni").insert({
      slot_id: slotSelezionato,
      client_id: id,
      tipo: tipoScelto,
      nota_cliente: notaCliente || null,
    });

    if (error) {
      setErrore(`Errore: ${error.message}`);
      setPrenotando(false);
      return;
    }

    const slot = slotLiberi.find((s) => s.id === slotSelezionato);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    fetch("/api/notifica-trainer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        tipo: "richiesta_appuntamento",
        client_id: id,
        dettagli: {
          data_ora: slot ? new Date(slot.data_ora).toLocaleString("it-IT") : "",
          nota: `${tipoScelto === "pt" ? "Lezione PT" : "Valutazione"}${
            notaCliente ? ` — ${notaCliente}` : ""
          }`,
        },
      }),
    }).catch(() => {});

    setSlotSelezionato(null);
    setNotaCliente("");
    setPrenotando(false);
    caricaTutto();
  };

  const annulla = async (prenotazioneId: string) => {
    await supabase
      .from("prenotazioni")
      .update({ stato: "annullato" })
      .eq("id", prenotazioneId);
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
    <main className="min-h-screen px-6 py-10 max-w-2xl mx-auto">
      <a
        href={`/area-cliente/${id}`}
        className="text-sm text-muted hover:text-paper inline-block mb-4"
      >
        ← Il tuo spazio
      </a>
      <h1 className="font-display text-2xl uppercase mb-2">Appuntamenti</h1>
      <p className="text-xs text-muted font-mono mb-6">
        Valutazione o lezione PT individuale in presenza — 15€ a lezione, da
        saldare in palestra.
      </p>

      {mieProssime.length > 0 && (
        <div className="mb-8">
          <p className="text-sm text-muted mb-3">I tuoi prossimi appuntamenti</p>
          <div className="border border-line rounded-card divide-y divide-line overflow-hidden">
            {mieProssime.map((p) => (
              <div
                key={p.id}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm">
                    {new Date(p.data_ora).toLocaleString("it-IT", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {p.tipo === "pt" ? "Lezione PT" : "Valutazione"}
                  </p>
                  {p.nota_trainer && (
                    <p className="text-xs text-muted mt-0.5">{p.nota_trainer}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-1 rounded-card border ${
                      p.stato === "confermato"
                        ? "text-gold border-gold"
                        : "text-paper border-line"
                    }`}
                  >
                    {p.stato}
                  </span>
                  <button
                    onClick={() => annulla(p.id)}
                    className="text-xs text-muted hover:text-red-400"
                  >
                    annulla
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-muted mb-3">Scegli uno slot disponibile</p>

      {slotLiberi.length === 0 ? (
        <p className="text-muted text-sm mb-6">
          Nessuno slot disponibile al momento. Riprova più tardi.
        </p>
      ) : (
        <form onSubmit={prenota} className="mb-6">
          <div className="grid grid-cols-1 gap-2 mb-4 max-h-72 overflow-y-auto pr-1">
            {slotLiberi.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSlotSelezionato(s.id)}
                className={`text-left px-4 py-3 rounded-card border transition ${
                  slotSelezionato === s.id
                    ? "border-gold bg-panel2"
                    : "border-line bg-panel hover:border-gold"
                }`}
              >
                <p className="text-sm">
                  {new Date(s.data_ora).toLocaleString("it-IT", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-xs text-muted">{s.durata_minuti} min</p>
              </button>
            ))}
          </div>

          {slotSelezionato && (
            <div className="bg-panel border border-line rounded-card p-5">
              <label className="block text-sm text-muted mb-2">
                Cosa vuoi prenotare?
              </label>
              <div className="flex gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setTipoScelto("pt")}
                  className={`flex-1 py-2 rounded-card border text-sm font-display uppercase tracking-wide transition ${
                    tipoScelto === "pt"
                      ? "bg-gold text-ink border-gold"
                      : "border-line text-muted"
                  }`}
                >
                  Lezione PT
                </button>
                <button
                  type="button"
                  onClick={() => setTipoScelto("valutazione")}
                  className={`flex-1 py-2 rounded-card border text-sm font-display uppercase tracking-wide transition ${
                    tipoScelto === "valutazione"
                      ? "bg-gold text-ink border-gold"
                      : "border-line text-muted"
                  }`}
                >
                  Valutazione
                </button>
              </div>
              <input
                type="text"
                placeholder="Nota (facoltativa)"
                value={notaCliente}
                onChange={(e) => setNotaCliente(e.target.value)}
                className="w-full mb-3 px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
              />
              <button
                type="submit"
                disabled={prenotando}
                className="px-5 py-2 rounded-card bg-gold text-ink font-display uppercase text-sm tracking-wide disabled:opacity-50"
              >
                {prenotando ? "Invio…" : "Richiedi appuntamento"}
              </button>
              {errore && (
                <p className="text-sm text-red-400 mt-3" role="alert">
                  {errore}
                </p>
              )}
            </div>
          )}
        </form>
      )}
    </main>
  );
}
