"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import StoricoCheck from "@/components/StoricoCheck";
import PulsanteReportPDF from "@/components/ReportPDF";

type Check = {
  id: string;
  data: string;
  peso_kg: number | null;
  massa_grassa_percentuale: number | null;
  massa_magra_percentuale: number | null;
  vita_cm: number | null;
  fianchi_cm: number | null;
  petto_cm: number | null;
  braccio_cm: number | null;
  coscia_cm: number | null;
  nota: string | null;
  risposta_trainer: string | null;
};

type Slot = {
  id: string;
  data_ora: string;
  durata_minuti: number;
};

type PrenotazioneValutazione = {
  id: string;
  slot_id: string;
  stato: "richiesto" | "confermato" | "rifiutato" | "annullato";
  data_ora: string;
};

export default function CheckAreaCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [piano, setPiano] = useState<"plus" | "premium">("plus");
  const [checks, setChecks] = useState<Check[]>([]);

  const [altezza, setAltezza] = useState("");
  const [altezzaSalvata, setAltezzaSalvata] = useState<string | null>(null);
  const [modificaAltezza, setModificaAltezza] = useState(false);
  const [salvandoAltezza, setSalvandoAltezza] = useState(false);

  const [prossimaValutazione, setProssimaValutazione] =
    useState<PrenotazioneValutazione | null>(null);
  const [slotLiberi, setSlotLiberi] = useState<Slot[]>([]);
  const [prenotando, setPrenotando] = useState<string | null>(null);
  const [errorePrenotazione, setErrorePrenotazione] = useState<string | null>(null);

  const [pesoNuovo, setPesoNuovo] = useState("");
  const [vitaNuova, setVitaNuova] = useState("");
  const [fianchiNuovi, setFianchiNuovi] = useState("");
  const [pettoNuovo, setPettoNuovo] = useState("");
  const [braccioNuovo, setBraccioNuovo] = useState("");
  const [cosciaNuova, setCosciaNuova] = useState("");
  const [notaNuova, setNotaNuova] = useState("");
  const [caricando, setCaricando] = useState(true);
  const [inviandoDati, setInviandoDati] = useState(false);
  const [datiInviati, setDatiInviati] = useState(false);

  const caricaTutto = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome_completo")
      .eq("id", id)
      .single();
    setNome(profile?.nome_completo ?? "");

    const { data: dati } = await supabase
      .from("dati_cliente")
      .select("piano, altezza_cm")
      .eq("client_id", id)
      .maybeSingle();
    setPiano(dati?.piano === "premium" ? "premium" : "plus");
    setAltezzaSalvata(dati?.altezza_cm ? String(dati.altezza_cm) : null);
    setAltezza(dati?.altezza_cm ? String(dati.altezza_cm) : "");

    // Prenotazione di valutazione attiva del cliente (richiesta o confermata)
    const { data: prenotazioneData } = await supabase
      .from("prenotazioni")
      .select("id, slot_id, stato, slot_disponibili(data_ora)")
      .eq("client_id", id)
      .eq("tipo", "valutazione")
      .in("stato", ["richiesto", "confermato"])
      .maybeSingle();

    if (prenotazioneData) {
      setProssimaValutazione({
        id: prenotazioneData.id,
        slot_id: prenotazioneData.slot_id,
        stato: prenotazioneData.stato,
        data_ora: (prenotazioneData as any).slot_disponibili?.data_ora,
      });
    } else {
      setProssimaValutazione(null);
    }

    // Slot liberi (non occupati da nessuna prenotazione attiva)
    const { data: tutteLePrenotazioni } = await supabase
      .from("prenotazioni")
      .select("slot_id")
      .in("stato", ["richiesto", "confermato"]);
    const idSlotOccupati = (tutteLePrenotazioni ?? []).map((p) => p.slot_id);

    const { data: slotData } = await supabase
      .from("slot_disponibili")
      .select("id, data_ora, durata_minuti")
      .gte("data_ora", new Date().toISOString())
      .order("data_ora", { ascending: true });

    setSlotLiberi((slotData ?? []).filter((s) => !idSlotOccupati.includes(s.id)));

    const { data: checkData } = await supabase
      .from("check_valutazioni")
      .select("*")
      .eq("client_id", id)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12);
    setChecks(checkData ?? []);

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
        router.replace(`/area-cliente/${session.user.id}/check`);
        return;
      }
      caricaTutto();
    };
    guardia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const salvaAltezza = async () => {
    setSalvandoAltezza(true);
    await supabase
      .from("dati_cliente")
      .update({ altezza_cm: altezza ? parseFloat(altezza) : null })
      .eq("client_id", id);
    setAltezzaSalvata(altezza || null);
    setModificaAltezza(false);
    setSalvandoAltezza(false);
  };

  const prenotaValutazione = async (slot: Slot) => {
    setErrorePrenotazione(null);
    setPrenotando(slot.id);

    const { error } = await supabase.from("prenotazioni").insert({
      slot_id: slot.id,
      client_id: id,
      tipo: "valutazione",
    });

    if (error) {
      setErrorePrenotazione(`Errore: ${error.message}`);
      setPrenotando(null);
      return;
    }

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
          data_ora: new Date(slot.data_ora).toLocaleString("it-IT"),
          nota: "Valutazione",
        },
      }),
    }).catch(() => {});

    setPrenotando(null);
    caricaTutto();
  };

  const annullaValutazione = async () => {
    if (!prossimaValutazione) return;
    await supabase
      .from("prenotazioni")
      .update({ stato: "annullato" })
      .eq("id", prossimaValutazione.id);
    caricaTutto();
  };

  const inviaDati = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviandoDati(true);
    setDatiInviati(false);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    await fetch("/api/notifica-trainer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        tipo: "dati_check",
        client_id: id,
        dettagli: {
          peso_kg: pesoNuovo || null,
          vita_cm: vitaNuova || null,
          fianchi_cm: fianchiNuovi || null,
          petto_cm: pettoNuovo || null,
          braccio_cm: braccioNuovo || null,
          coscia_cm: cosciaNuova || null,
          nota: notaNuova || null,
        },
      }),
    }).catch(() => {});

    setPesoNuovo("");
    setVitaNuova("");
    setFianchiNuovi("");
    setPettoNuovo("");
    setBraccioNuovo("");
    setCosciaNuova("");
    setNotaNuova("");
    setInviandoDati(false);
    setDatiInviati(true);
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

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl uppercase">
          Check di valutazione
        </h1>
        {piano === "premium" && (
          <PulsanteReportPDF nomeCliente={nome} checks={checks} />
        )}
      </div>

      {/* Altezza — dato fisso */}
      <div className="bg-panel border border-line rounded-card p-5 mb-6">
        <p className="text-xs text-muted uppercase tracking-wide mb-2">Altezza</p>
        {!modificaAltezza ? (
          <div className="flex items-center justify-between">
            <p className="text-sm">
              {altezzaSalvata ? `${altezzaSalvata} cm` : "Non ancora impostata"}
            </p>
            <button
              onClick={() => setModificaAltezza(true)}
              className="text-xs text-gold"
            >
              {altezzaSalvata ? "modifica" : "imposta"}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              placeholder="cm"
              value={altezza}
              onChange={(e) => setAltezza(e.target.value)}
              className="flex-1 px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
            />
            <button
              onClick={salvaAltezza}
              disabled={salvandoAltezza}
              className="px-4 py-2 rounded-card bg-gold text-ink font-display uppercase text-xs tracking-wide disabled:opacity-50"
            >
              {salvandoAltezza ? "…" : "Salva"}
            </button>
          </div>
        )}
      </div>

      {/* Prossima valutazione: prenotata o da prenotare */}
      <div className="bg-panel border border-line rounded-card p-5 mb-6">
        {prossimaValutazione ? (
          <>
            <div className="flex items-center gap-4 mb-3">
              <div className="bg-gold text-ink rounded-card px-4 py-2 text-center min-w-[56px]">
                <p className="font-display text-xl leading-none">
                  {new Date(prossimaValutazione.data_ora)
                    .getDate()
                    .toString()
                    .padStart(2, "0")}
                </p>
                <p className="font-mono text-[10px] uppercase">
                  {new Date(prossimaValutazione.data_ora).toLocaleDateString(
                    "it-IT",
                    { month: "short" }
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">
                  Prossima valutazione
                </p>
                <p className="text-sm">
                  {new Date(prossimaValutazione.data_ora).toLocaleDateString(
                    "it-IT",
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </p>
              </div>
            </div>
            <p className="text-xs font-mono mb-3">
              {prossimaValutazione.stato === "confermato" ? (
                <span className="text-gold">✓ Confermata dal trainer</span>
              ) : (
                <span className="text-muted">In attesa di conferma</span>
              )}
            </p>
            <button
              onClick={annullaValutazione}
              className="text-xs text-muted hover:text-red-400"
            >
              annulla
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted mb-3">
              Nessuna valutazione prenotata — scegli uno slot disponibile:
            </p>
            {slotLiberi.length === 0 ? (
              <p className="text-muted text-sm">
                Nessuno slot disponibile al momento.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                {slotLiberi.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => prenotaValutazione(s)}
                    disabled={prenotando === s.id}
                    className="text-left px-4 py-2.5 rounded-card border border-line bg-ink hover:border-gold transition disabled:opacity-50"
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
                  </button>
                ))}
              </div>
            )}
            {errorePrenotazione && (
              <p className="text-sm text-red-400 mt-3" role="alert">
                {errorePrenotazione}
              </p>
            )}
          </>
        )}
      </div>

      <div className="bg-panel border border-line rounded-card p-6 mb-4">
        <StoricoCheck checks={checks} />
      </div>

      <form
        onSubmit={inviaDati}
        className="bg-panel border border-line rounded-card p-6"
      >
        <p className="text-sm text-muted mb-1">Invia le tue misurazioni</p>
        <p className="text-xs text-muted mb-3">
          Il trainer le riceverà via email e registrerà il check ufficiale
          (con anche massa grassa e magra).
        </p>
        <div className="mb-3">
          <input
            type="number"
            step="0.1"
            placeholder="Peso kg"
            value={pesoNuovo}
            onChange={(e) => setPesoNuovo(e.target.value)}
            className="w-full px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
          />
        </div>
        <p className="text-xs text-muted uppercase tracking-wide mb-2">
          Circonferenze (cm)
        </p>
        <div className="grid grid-cols-5 gap-2 mb-3">
          <input
            type="number"
            step="0.1"
            placeholder="Vita"
            value={vitaNuova}
            onChange={(e) => setVitaNuova(e.target.value)}
            className="px-2 py-2 rounded-card bg-ink border border-line text-paper text-sm"
          />
          <input
            type="number"
            step="0.1"
            placeholder="Fianchi"
            value={fianchiNuovi}
            onChange={(e) => setFianchiNuovi(e.target.value)}
            className="px-2 py-2 rounded-card bg-ink border border-line text-paper text-sm"
          />
          <input
            type="number"
            step="0.1"
            placeholder="Petto"
            value={pettoNuovo}
            onChange={(e) => setPettoNuovo(e.target.value)}
            className="px-2 py-2 rounded-card bg-ink border border-line text-paper text-sm"
          />
          <input
            type="number"
            step="0.1"
            placeholder="Braccio"
            value={braccioNuovo}
            onChange={(e) => setBraccioNuovo(e.target.value)}
            className="px-2 py-2 rounded-card bg-ink border border-line text-paper text-sm"
          />
          <input
            type="number"
            step="0.1"
            placeholder="Coscia"
            value={cosciaNuova}
            onChange={(e) => setCosciaNuova(e.target.value)}
            className="px-2 py-2 rounded-card bg-ink border border-line text-paper text-sm"
          />
        </div>
        <input
          type="text"
          placeholder="Nota (facoltativa)"
          value={notaNuova}
          onChange={(e) => setNotaNuova(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
        />
        <button
          type="submit"
          disabled={inviandoDati}
          className="px-5 py-2 rounded-card bg-gold text-ink font-display uppercase text-sm tracking-wide disabled:opacity-50"
        >
          {inviandoDati ? "Invio…" : "Invia al trainer"}
        </button>
        {datiInviati && (
          <p className="text-xs text-gold font-mono mt-3">
            ✓ Dati inviati al trainer
          </p>
        )}
      </form>
    </main>
  );
}
