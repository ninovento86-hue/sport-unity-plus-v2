"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import TimerButton from "@/components/TimerButton";
import StoricoCheck from "@/components/StoricoCheck";
import Chat from "@/components/Chat";
import jsPDF from "jspdf";

type Esercizio = {
  id: string;
  giorno: string;
  ordine: number;
  nome: string;
  serie: number | null;
  ripetizioni: string | null;
  recupero_secondi: number;
  video_url: string | null;
  note: string | null;
};

type Scheda = {
  id: string;
  titolo: string;
  updated_at: string;
  esercizi: Esercizio[];
};

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

type Foto = {
  id: string;
  storage_path: string;
  tipo: "frontale" | "laterale" | "retro";
  data_scatto: string;
};

const TIPI_FOTO: { chiave: Foto["tipo"]; etichetta: string }[] = [
  { chiave: "frontale", etichetta: "Frontale" },
  { chiave: "laterale", etichetta: "Laterale" },
  { chiave: "retro", etichetta: "Di schiena" },
];

function raggruppaPerGiorno(esercizi: Esercizio[]) {
  const gruppi: Record<string, Esercizio[]> = {};
  const ordine: string[] = [];
  for (const es of esercizi) {
    if (!gruppi[es.giorno]) {
      gruppi[es.giorno] = [];
      ordine.push(es.giorno);
    }
    gruppi[es.giorno].push(es);
  }
  return ordine.map((giorno) => ({ giorno, esercizi: gruppi[giorno] }));
}

export default function AreaCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const [nome, setNome] = useState("");
  const [obiettivo, setObiettivo] = useState("");
  const [noteTrainer, setNoteTrainer] = useState("");
  const [piano, setPiano] = useState<"plus" | "premium">("plus");
  const [pianoAlimentare, setPianoAlimentare] = useState("");
  const [prossimaValutazione, setProssimaValutazione] = useState<string | null>(null);
  const [confermaValutazione, setConfermaValutazione] = useState<
    "in_attesa" | "confermato" | "annullato" | null
  >(null);
  const [salvandoConferma, setSalvandoConferma] = useState(false);

  const [appuntamenti, setAppuntamenti] = useState<
    {
      id: string;
      data_ora: string;
      stato: "richiesto" | "confermato" | "rifiutato" | "annullato";
      nota_cliente: string | null;
      nota_trainer: string | null;
    }[]
  >([]);
  const [nuovaDataOra, setNuovaDataOra] = useState("");
  const [nuovaNotaAppuntamento, setNuovaNotaAppuntamento] = useState("");
  const [prenotando, setPrenotando] = useState(false);

  const [scheda, setScheda] = useState<Scheda | null>(null);
  const [carichi, setCarichi] = useState<Record<string, string>>({});
  const [salvandoCarico, setSalvandoCarico] = useState<string | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [foto, setFoto] = useState<Foto[]>([]);
  const [urlFoto, setUrlFoto] = useState<Record<string, string>>({});

  const [pesoNuovo, setPesoNuovo] = useState("");
  const [grassoNuovo, setGrassoNuovo] = useState("");
  const [magraNuova, setMagraNuova] = useState("");
  const [notaNuova, setNotaNuova] = useState("");
  const [caricando, setCaricando] = useState(true);
  const [salvandoCheck, setSalvandoCheck] = useState(false);
  const [caricandoFotoTipo, setCaricandoFotoTipo] = useState<string | null>(null);

  const caricaTutto = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome_completo")
      .eq("id", id)
      .single();
    setNome(profile?.nome_completo ?? "");

    const { data: dati } = await supabase
      .from("dati_cliente")
      .select("*")
      .eq("client_id", id)
      .maybeSingle();
    setObiettivo(dati?.obiettivo ?? "");
    setNoteTrainer(dati?.note_trainer ?? "");
    setPiano(dati?.piano === "premium" ? "premium" : "plus");
    setPianoAlimentare(dati?.piano_alimentare ?? "");
    setProssimaValutazione(dati?.prossima_valutazione ?? null);

    const { data: schedaData } = await supabase
      .from("schede_allenamento")
      .select("id, titolo, updated_at, esercizi(*)")
      .eq("client_id", id)
      .eq("attiva", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (schedaData) {
      setScheda({
        ...schedaData,
        esercizi: (schedaData.esercizi as Esercizio[]).sort(
          (a, b) => a.ordine - b.ordine
        ),
      });

      const idEsercizi = (schedaData.esercizi as Esercizio[]).map((e) => e.id);
      if (idEsercizi.length > 0) {
        const { data: carichiData } = await supabase
          .from("carichi_esercizio")
          .select("esercizio_id, carico_kg, data")
          .in("esercizio_id", idEsercizi)
          .order("data", { ascending: false });
        const mappa: Record<string, string> = {};
        (carichiData ?? []).forEach((c) => {
          // il primo che troviamo per esercizio è il più recente
          if (!(c.esercizio_id in mappa)) {
            mappa[c.esercizio_id] = c.carico_kg?.toString() ?? "";
          }
        });
        setCarichi(mappa);
      }
    }

    const { data: checkData } = await supabase
      .from("check_valutazioni")
      .select("*")
      .eq("client_id", id)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12);
    setChecks(checkData ?? []);

    const { data: fotoData } = await supabase
      .from("foto_progressi")
      .select("*")
      .eq("client_id", id)
      .order("data_scatto", { ascending: false })
      .limit(9);
    setFoto(fotoData ?? []);

    if (fotoData) {
      const urls: Record<string, string> = {};
      for (const f of fotoData) {
        const { data } = await supabase.storage
          .from("foto-progressi")
          .createSignedUrl(f.storage_path, 3600);
        if (data) urls[f.id] = data.signedUrl;
      }
      setUrlFoto(urls);
    }

    if (dati?.prossima_valutazione) {
      const { data: conferma } = await supabase
        .from("conferme_valutazione")
        .select("stato")
        .eq("client_id", id)
        .eq("data_valutazione", dati.prossima_valutazione)
        .maybeSingle();
      setConfermaValutazione(conferma?.stato ?? "in_attesa");
    }

    const { data: appuntamentiData } = await supabase
      .from("appuntamenti_pt")
      .select("*")
      .eq("client_id", id)
      .order("data_ora", { ascending: true });
    setAppuntamenti(appuntamentiData ?? []);

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
        router.replace(`/area-cliente/${session.user.id}`);
        return;
      }
      caricaTutto();
    };
    guardia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const disconnetti = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const salvaCarico = async (esercizioId: string) => {
    setSalvandoCarico(esercizioId);
    const valore = carichi[esercizioId];
    if (valore) {
      await supabase.from("carichi_esercizio").insert({
        esercizio_id: esercizioId,
        client_id: id,
        carico_kg: parseFloat(valore),
        aggiornato_da: "cliente",
      });
    }
    setSalvandoCarico(null);
  };

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

  const prenotaAppuntamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuovaDataOra) return;
    setPrenotando(true);

    await supabase.from("appuntamenti_pt").insert({
      client_id: id,
      data_ora: new Date(nuovaDataOra).toISOString(),
      nota_cliente: nuovaNotaAppuntamento || null,
    });

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
          data_ora: new Date(nuovaDataOra).toLocaleString("it-IT"),
          nota: nuovaNotaAppuntamento,
        },
      }),
    }).catch(() => {});

    setNuovaDataOra("");
    setNuovaNotaAppuntamento("");
    setPrenotando(false);
    caricaTutto();
  };

  const annullaAppuntamento = async (appuntamentoId: string) => {
    await supabase
      .from("appuntamenti_pt")
      .update({ stato: "annullato" })
      .eq("id", appuntamentoId);
    caricaTutto();
  };

  const scaricaReportPDF = () => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text("Sport Unity Club — Report progressi", 14, y);
    y += 8;
    doc.setFontSize(11);
    doc.text(`${nome} — generato il ${new Date().toLocaleDateString("it-IT")}`, 14, y);
    y += 12;

    doc.setFontSize(14);
    doc.text("Check di valutazione", 14, y);
    y += 8;
    doc.setFontSize(10);
    if (checks.length === 0) {
      doc.text("Nessun check registrato.", 14, y);
      y += 6;
    } else {
      checks.slice(0, 15).forEach((c) => {
        const riga = `${new Date(c.data).toLocaleDateString("it-IT")}  —  peso: ${
          c.peso_kg ?? "—"
        } kg  ·  massa grassa: ${c.massa_grassa_percentuale ?? "—"}%  ·  massa magra: ${
          c.massa_magra_percentuale ?? "—"
        }%`;
        doc.text(riga, 14, y);
        y += 6;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
    }

    y += 6;
    doc.setFontSize(14);
    doc.text("Carichi esercizi (scheda attuale)", 14, y);
    y += 8;
    doc.setFontSize(10);
    if (!scheda || scheda.esercizi.length === 0) {
      doc.text("Nessuna scheda attiva.", 14, y);
    } else {
      scheda.esercizi.forEach((es) => {
        const c = carichi[es.id];
        const riga = `${es.giorno} — ${es.nome}: ${c ? `${c} kg` : "—"}`;
        doc.text(riga, 14, y);
        y += 6;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
    }

    doc.save(`report-${nome.replace(/\s+/g, "-").toLowerCase()}.pdf`);
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

  const caricaFoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    tipo: Foto["tipo"]
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCaricandoFotoTipo(tipo);

    const estensione = file.name.split(".").pop();
    const percorso = `${id}/${tipo}-${Date.now()}.${estensione}`;

    const { error: erroreUpload } = await supabase.storage
      .from("foto-progressi")
      .upload(percorso, file);

    if (!erroreUpload) {
      await supabase.from("foto_progressi").insert({
        client_id: id,
        storage_path: percorso,
        tipo,
        caricato_da: "cliente",
      });
      caricaTutto();
    }

    setCaricandoFotoTipo(null);
    const input = fileInputs.current[tipo];
    if (input) input.value = "";
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

  const sessioniFoto = Array.from(
    new Set(foto.map((f) => f.data_scatto))
  ).map((data) => ({
    data,
    foto: foto.filter((f) => f.data_scatto === data),
  }));

  return (
    <main className="min-h-screen px-6 py-10 max-w-2xl mx-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icona.png" alt="" className="h-8 mb-6" />
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-xs tracking-[0.3em] text-gold uppercase">
          Il tuo spazio
        </p>
        <button
          onClick={disconnetti}
          className="text-xs font-mono text-muted hover:text-paper transition"
        >
          Esci →
        </button>
      </div>
      <h1 className="font-display text-3xl uppercase mb-2">Ciao {nome}</h1>
      {piano === "premium" && (
        <p className="text-[10px] font-mono uppercase tracking-widest text-gold border border-gold rounded px-2 py-0.5 inline-block mb-6">
          Servizio Premium
        </p>
      )}

      {(obiettivo || noteTrainer) && (
        <section className="bg-panel border border-line rounded-card p-6 mb-8">
          {obiettivo && (
            <>
              <p className="text-xs text-muted uppercase tracking-wide mb-1">
                Obiettivo
              </p>
              <p className="mb-4">{obiettivo}</p>
            </>
          )}
          {noteTrainer && (
            <>
              <p className="text-xs text-muted uppercase tracking-wide mb-1">
                Nota dal tuo trainer
              </p>
              <p>{noteTrainer}</p>
            </>
          )}
        </section>
      )}

      {piano === "premium" && pianoAlimentare && (
        <section className="bg-panel border border-line rounded-card p-6 mb-8">
          <p className="text-xs text-gold uppercase tracking-wide mb-2">
            Piano alimentare
          </p>
          <pre className="whitespace-pre-wrap font-body text-sm text-paper">
            {pianoAlimentare}
          </pre>
        </section>
      )}

      {/* Scheda con timer, raggruppata per giorno */}
      <section className="mb-8">
        <h2 className="font-display uppercase text-lg mb-4">
          La tua scheda
        </h2>
        {!scheda ? (
          <p className="text-muted text-sm">
            Il trainer non ha ancora caricato una scheda.
          </p>
        ) : (
          <div className="border border-line rounded-card p-5 bg-panel2">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display uppercase tracking-wide">
                {scheda.titolo}
              </p>
              <span className="font-mono text-xs text-muted">
                {new Date(scheda.updated_at).toLocaleDateString("it-IT")}
              </span>
            </div>
            {raggruppaPerGiorno(scheda.esercizi).map((gruppo) => (
              <div key={gruppo.giorno} className="mb-5 last:mb-0">
                <p className="font-mono text-xs text-gold uppercase tracking-wide mb-2">
                  {gruppo.giorno}
                </p>
                <div className="divide-y divide-line">
                  {gruppo.esercizi.map((es) => (
                    <div
                      key={es.id}
                      className="flex items-center justify-between py-3 gap-3"
                    >
                      <div>
                        <p className="text-sm">
                          {es.nome}
                          {es.video_url && (
                            <a
                              href={es.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-gold text-xs align-middle"
                            >
                              ▶ video
                            </a>
                          )}
                        </p>
                        <p className="font-mono text-xs text-muted">
                          {es.serie ? `${es.serie} serie` : ""}
                          {es.serie && es.ripetizioni ? " × " : ""}
                          {es.ripetizioni ? `${es.ripetizioni} rip.` : ""}
                          {es.note ? ` — ${es.note}` : ""}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="number"
                            step="0.5"
                            placeholder="kg"
                            value={carichi[es.id] ?? ""}
                            onChange={(ev) =>
                              setCarichi((prev) => ({
                                ...prev,
                                [es.id]: ev.target.value,
                              }))
                            }
                            onBlur={() => salvaCarico(es.id)}
                            className="w-16 px-2 py-1 rounded-card bg-ink border border-line text-paper text-xs font-mono"
                          />
                          <span className="text-[10px] text-muted font-mono">
                            {salvandoCarico === es.id ? "salvo…" : "carico"}
                          </span>
                        </div>
                      </div>
                      <TimerButton secondi={es.recupero_secondi} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Check di valutazione */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display uppercase text-lg">
            Check di valutazione
          </h2>
          {piano === "premium" && (
            <button
              onClick={scaricaReportPDF}
              className="text-xs font-mono text-gold border border-gold rounded-card px-3 py-1.5 hover:bg-gold hover:text-ink transition"
            >
              ↓ Report PDF
            </button>
          )}
        </div>

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
            Salva check
          </button>
        </form>
      </section>

      {/* Calendario prossima valutazione */}
      {dataValutazione && (
        <section className="mb-8">
          <div className="bg-panel border border-line rounded-card p-5">
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
        </section>
      )}

      {/* Appuntamenti PT in presenza (Premium) */}
      {piano === "premium" && (
        <section className="mb-8">
          <h2 className="font-display uppercase text-lg mb-4">
            Prenota una lezione PT
          </h2>
          <p className="text-xs text-muted font-mono mb-4">
            Lezione individuale in presenza — 15€, da saldare in palestra.
          </p>

          <form
            onSubmit={prenotaAppuntamento}
            className="bg-panel border border-line rounded-card p-6 mb-4"
          >
            <label className="block text-sm text-muted mb-1">
              Data e ora richiesta
            </label>
            <input
              type="datetime-local"
              required
              value={nuovaDataOra}
              onChange={(e) => setNuovaDataOra(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
            />
            <input
              type="text"
              placeholder="Nota (facoltativa)"
              value={nuovaNotaAppuntamento}
              onChange={(e) => setNuovaNotaAppuntamento(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
            />
            <button
              type="submit"
              disabled={prenotando}
              className="px-5 py-2 rounded-card bg-gold text-ink font-display uppercase text-sm tracking-wide disabled:opacity-50"
            >
              {prenotando ? "Invio…" : "Richiedi appuntamento"}
            </button>
          </form>

          {appuntamenti.length > 0 && (
            <div className="border border-line rounded-card divide-y divide-line overflow-hidden">
              {appuntamenti.map((a) => (
                <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm">
                      {new Date(a.data_ora).toLocaleString("it-IT", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {a.nota_trainer && (
                      <p className="text-xs text-muted mt-0.5">{a.nota_trainer}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-1 rounded-card border ${
                        a.stato === "confermato"
                          ? "text-gold border-gold"
                          : a.stato === "rifiutato" || a.stato === "annullato"
                          ? "text-muted border-line"
                          : "text-paper border-line"
                      }`}
                    >
                      {a.stato}
                    </span>
                    {(a.stato === "richiesto" || a.stato === "confermato") && (
                      <button
                        onClick={() => annullaAppuntamento(a.id)}
                        className="text-xs text-muted hover:text-red-400"
                      >
                        annulla
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Messaggi con il trainer (Premium) */}
      {piano === "premium" && (
        <section className="mb-8">
          <h2 className="font-display uppercase text-lg mb-4">
            Messaggi con il tuo trainer
          </h2>
          <div className="bg-panel border border-line rounded-card p-6">
            <Chat clientId={id} ruolo="cliente" />
          </div>
        </section>
      )}

      {/* Foto progressi */}
      <section>
        <h2 className="font-display uppercase text-lg mb-4">
          Foto progressi
        </h2>

        <div className="bg-panel border border-line rounded-card p-5 mb-6">
          <p className="text-xs text-muted uppercase tracking-wide mb-3">
            Carica le foto di oggi
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TIPI_FOTO.map((t) => (
              <label
                key={t.chiave}
                className="aspect-[3/4] rounded-card border border-dashed border-line flex flex-col items-center justify-center gap-1 text-[11px] text-muted font-mono text-center cursor-pointer hover:border-gold transition"
              >
                {caricandoFotoTipo === t.chiave ? "…" : "＋"}
                <span>{t.etichetta}</span>
                <input
                  ref={(el) => {
                    fileInputs.current[t.chiave] = el;
                  }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => caricaFoto(e, t.chiave)}
                  disabled={caricandoFotoTipo !== null}
                  className="hidden"
                />
              </label>
            ))}
          </div>
        </div>

        {sessioniFoto.map((sessione) => (
          <div key={sessione.data} className="mb-5">
            <p className="font-mono text-xs text-muted mb-2">
              {new Date(sessione.data).toLocaleDateString("it-IT")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TIPI_FOTO.map((t) => {
                const f = sessione.foto.find((x) => x.tipo === t.chiave);
                return (
                  <div key={t.chiave}>
                    {f && urlFoto[f.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={urlFoto[f.id]}
                        alt={`Foto ${t.etichetta.toLowerCase()} del ${sessione.data}`}
                        className="w-full aspect-[3/4] object-cover rounded-card border border-line"
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] rounded-card border border-line flex items-center justify-center text-[10px] text-muted font-mono">
                        —
                      </div>
                    )}
                    <p className="text-[10px] text-muted mt-1 text-center">
                      {t.etichetta}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
