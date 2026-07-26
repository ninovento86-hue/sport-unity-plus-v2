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

export default function CheckAreaCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [piano, setPiano] = useState<"plus" | "premium">("plus");
  const [checks, setChecks] = useState<Check[]>([]);

  const [prossimaValutazione, setProssimaValutazione] = useState<string | null>(null);
  const [confermaValutazione, setConfermaValutazione] = useState<
    "in_attesa" | "confermato" | "annullato" | null
  >(null);
  const [salvandoConferma, setSalvandoConferma] = useState(false);

  const [pesoNuovo, setPesoNuovo] = useState("");
  const [grassoNuovo, setGrassoNuovo] = useState("");
  const [magraNuova, setMagraNuova] = useState("");
  const [notaNuova, setNotaNuova] = useState("");
  const [caricando, setCaricando] = useState(true);
  const [salvandoCheck, setSalvandoCheck] = useState(false);

  const caricaTutto = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome_completo")
      .eq("id", id)
      .single();
    setNome(profile?.nome_completo ?? "");

    const { data: dati } = await supabase
      .from("dati_cliente")
      .select("piano, prossima_valutazione")
      .eq("client_id", id)
      .maybeSingle();
    setPiano(dati?.piano === "premium" ? "premium" : "plus");
    setProssimaValutazione(dati?.prossima_valutazione ?? null);

    if (dati?.prossima_valutazione) {
      const { data: conferma } = await supabase
        .from("conferme_valutazione")
        .select("stato")
        .eq("client_id", id)
        .eq("data_valutazione", dati.prossima_valutazione)
        .maybeSingle();
      setConfermaValutazione(conferma?.stato ?? "in_attesa");
    } else {
      setConfermaValutazione(null);
    }

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

  const rispondiValutazione = async (stato: "confermato" | "annullato") => {
    if (!prossimaValutazione) return;
    setSalvandoConferma(true);
    await supabase.from("conferme_valutazione").upsert(
      {
        client_id: id,
        data_valutazione: prossimaValutazione,
        stato,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,data_valutazione" }
    );
    setConfermaValutazione(stato);
    setSalvandoConferma(false);

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
        tipo: "conferma_valutazione",
        client_id: id,
        dettagli: { stato, data: prossimaValutazione },
      }),
    }).catch(() => {});
  };

  const aggiungiCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoCheck(true);
    await supabase.from("check_valutazioni").insert({
      client_id: id,
      peso_kg: pesoNuovo ? parseFloat(pesoNuovo) : null,
      massa_grassa_percentuale: grassoNuovo ? parseFloat(grassoNuovo) : null,
      massa_magra_percentuale: magraNuova ? parseFloat(magraNuova) : null,
      nota: notaNuova || null,
      inserito_da: "cliente",
    });
    setPesoNuovo("");
    setGrassoNuovo("");
    setMagraNuova("");
    setNotaNuova("");
    setSalvandoCheck(false);
    caricaTutto();
  };

  if (caricando) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm text-muted">Caricamento…</p>
      </main>
    );
  }

  const dataValutazione = prossimaValutazione
    ? new Date(prossimaValutazione)
    : null;

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

      {/* Prossima valutazione / conferma presenza */}
      {dataValutazione && (
        <div className="bg-panel border border-line rounded-card p-5 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-gold text-ink rounded-card px-4 py-2 text-center min-w-[56px]">
              <p className="font-display text-xl leading-none">
                {dataValutazione.getDate().toString().padStart(2, "0")}
              </p>
              <p className="font-mono text-[10px] uppercase">
                {dataValutazione.toLocaleDateString("it-IT", { month: "short" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">
                Prossima valutazione
              </p>
              <p className="text-sm">
                {dataValutazione.toLocaleDateString("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {confermaValutazione === "confermato" ? (
            <p className="text-xs font-mono text-gold">✓ Hai confermato la presenza</p>
          ) : confermaValutazione === "annullato" ? (
            <p className="text-xs font-mono text-muted">
              Hai annullato — contatta il trainer per un nuovo appuntamento
            </p>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => rispondiValutazione("confermato")}
                disabled={salvandoConferma}
                className="flex-1 py-2 rounded-card bg-gold text-ink font-display uppercase text-xs tracking-wide disabled:opacity-50"
              >
                Confermo
              </button>
              <button
                onClick={() => rispondiValutazione("annullato")}
                disabled={salvandoConferma}
                className="flex-1 py-2 rounded-card border border-line text-muted font-display uppercase text-xs tracking-wide disabled:opacity-50"
              >
                Non posso venire
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-panel border border-line rounded-card p-6 mb-4">
        <StoricoCheck checks={checks} />
      </div>

      <form
        onSubmit={aggiungiCheck}
        className="bg-panel border border-line rounded-card p-6"
      >
        <p className="text-sm text-muted mb-3">Registra un nuovo check</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <input
            type="number"
            step="0.1"
            placeholder="Peso kg"
            value={pesoNuovo}
            onChange={(e) => setPesoNuovo(e.target.value)}
            className="px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
          />
          <input
            type="number"
            step="0.1"
            placeholder="Massa grassa %"
            value={grassoNuovo}
            onChange={(e) => setGrassoNuovo(e.target.value)}
            className="px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
          />
          <input
            type="number"
            step="0.1"
            placeholder="Massa magra %"
            value={magraNuova}
            onChange={(e) => setMagraNuova(e.target.value)}
            className="px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
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
          disabled={salvandoCheck}
          className="px-5 py-2 rounded-card bg-gold text-ink font-display uppercase text-sm tracking-wide disabled:opacity-50"
        >
          {salvandoCheck ? "Salvataggio…" : "Salva check"}
        </button>
      </form>
    </main>
  );
}
