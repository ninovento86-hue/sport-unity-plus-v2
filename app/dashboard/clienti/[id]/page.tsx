"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import StoricoCheck from "@/components/StoricoCheck";
import GraficoCarico from "@/components/GraficoCarico";
import Chat from "@/components/Chat";

type Esercizio = {
  id?: string;
  giorno: string;
  nome: string;
  serie: string;
  ripetizioni: string;
  recupero_secondi: string;
  video_url: string;
  note: string;
};

type Scheda = {
  id: string;
  titolo: string;
  attiva: boolean;
  updated_at: string;
  esercizi: {
    id: string;
    giorno: string;
    nome: string;
    serie: number | null;
    ripetizioni: string | null;
    recupero_secondi: number;
    video_url: string | null;
    note: string | null;
  }[];
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

const ESERCIZIO_VUOTO: Esercizio = {
  giorno: "Giorno 1",
  nome: "",
  serie: "",
  ripetizioni: "",
  recupero_secondi: "90",
  video_url: "",
  note: "",
};

const TIPI_FOTO: { chiave: Foto["tipo"]; etichetta: string }[] = [
  { chiave: "frontale", etichetta: "Frontale" },
  { chiave: "laterale", etichetta: "Laterale" },
  { chiave: "retro", etichetta: "Di schiena" },
];

function raggruppaPerGiorno<T extends { giorno: string }>(esercizi: T[]) {
  const gruppi: Record<string, T[]> = {};
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

export default function SchedaCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const [nomeCliente, setNomeCliente] = useState("");
  const [obiettivo, setObiettivo] = useState("");
  const [noteTrainer, setNoteTrainer] = useState("");
  const [prossimaValutazione, setProssimaValutazione] = useState("");
  const [piano, setPiano] = useState<"plus" | "premium">("plus");
  const [pianoAlimentare, setPianoAlimentare] = useState("");
  const [datiId, setDatiId] = useState<string | null>(null);

  const [schede, setSchede] = useState<Scheda[]>([]);
  const [carichi, setCarichi] = useState<Record<string, string>>({});
  const [storicoCarichi, setStoricoCarichi] = useState<
    Record<string, { data: string; carico_kg: number | null }[]>
  >({});
  const [salvandoCarico, setSalvandoCarico] = useState<string | null>(null);
  const [erroreScheda, setErroreScheda] = useState<string | null>(null);
  const [erroreCheck, setErroreCheck] = useState<string | null>(null);
  const [nuovoTitolo, setNuovoTitolo] = useState("");
  const [nuoviEsercizi, setNuoviEsercizi] = useState<Esercizio[]>([
    { ...ESERCIZIO_VUOTO },
  ]);
  const [mostraStorico, setMostraStorico] = useState(false);

  const [checks, setChecks] = useState<Check[]>([]);
  const [risposte, setRisposte] = useState<Record<string, string>>({});
  const [confermaValutazione, setConfermaValutazione] = useState<
    "in_attesa" | "confermato" | "annullato" | null
  >(null);
  const [appuntamenti, setAppuntamenti] = useState<
    {
      id: string;
      data_ora: string;
      stato: "richiesto" | "confermato" | "rifiutato" | "annullato";
      nota_cliente: string | null;
      nota_trainer: string | null;
    }[]
  >([]);
  const [elaborandoAppuntamento, setElaborandoAppuntamento] = useState<string | null>(null);
  const [salvandoRisposta, setSalvandoRisposta] = useState<string | null>(null);
  const [pesoNuovo, setPesoNuovo] = useState("");
  const [grassoNuovo, setGrassoNuovo] = useState("");
  const [magraNuova, setMagraNuova] = useState("");
  const [notaCheckNuova, setNotaCheckNuova] = useState("");
  const [salvandoCheck, setSalvandoCheck] = useState(false);

  const [foto, setFoto] = useState<Foto[]>([]);
  const [urlFoto, setUrlFoto] = useState<Record<string, string>>({});
  const [caricandoFotoTipo, setCaricandoFotoTipo] = useState<string | null>(
    null
  );

  const [caricando, setCaricando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvandoScheda, setSalvandoScheda] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const caricaTutto = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome_completo")
      .eq("id", id)
      .single();
    setNomeCliente(profile?.nome_completo ?? "");

    const { data: dati } = await supabase
      .from("dati_cliente")
      .select("*")
      .eq("client_id", id)
      .maybeSingle();
    if (dati) {
      setDatiId(dati.id);
      setObiettivo(dati.obiettivo ?? "");
      setNoteTrainer(dati.note_trainer ?? "");
      setProssimaValutazione(dati.prossima_valutazione ?? "");
      setPiano(dati.piano === "premium" ? "premium" : "plus");
      setPianoAlimentare(dati.piano_alimentare ?? "");

      if (dati.prossima_valutazione) {
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
    }

    const { data: appuntamentiData } = await supabase
      .from("appuntamenti_pt")
      .select("*")
      .eq("client_id", id)
      .order("data_ora", { ascending: true });
    setAppuntamenti(appuntamentiData ?? []);

    const { data: schedeData } = await supabase
      .from("schede_allenamento")
      .select("id, titolo, attiva, updated_at, esercizi(*)")
      .eq("client_id", id)
      .order("updated_at", { ascending: false });
    setSchede(
      (schedeData ?? []).map((s: any) => ({
        ...s,
        esercizi: (s.esercizi ?? []).sort(
          (a: any, b: any) => a.ordine - b.ordine
        ),
      }))
    );

    const tuttiGliEserciziId = (schedeData ?? []).flatMap((s: any) =>
      (s.esercizi ?? []).map((e: any) => e.id)
    );
    if (tuttiGliEserciziId.length > 0) {
      const { data: carichiData } = await supabase
        .from("carichi_esercizio")
        .select("esercizio_id, carico_kg, data")
        .in("esercizio_id", tuttiGliEserciziId)
        .order("data", { ascending: true });

      const mappaUltimo: Record<string, string> = {};
      const mappaStorico: Record<
        string,
        { data: string; carico_kg: number | null }[]
      > = {};
      (carichiData ?? []).forEach((c) => {
        mappaUltimo[c.esercizio_id] = c.carico_kg?.toString() ?? "";
        if (!mappaStorico[c.esercizio_id]) mappaStorico[c.esercizio_id] = [];
        mappaStorico[c.esercizio_id].push({
          data: c.data,
          carico_kg: c.carico_kg,
        });
      });
      setCarichi(mappaUltimo);
      setStoricoCarichi(mappaStorico);
    }

    const { data: checkData } = await supabase
      .from("check_valutazioni")
      .select("*")
      .eq("client_id", id)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);
    setChecks(checkData ?? []);
    const mappaRisposte: Record<string, string> = {};
    (checkData ?? []).forEach((c) => {
      mappaRisposte[c.id] = c.risposta_trainer ?? "";
    });
    setRisposte(mappaRisposte);

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
  }, [id]);

  const salvaDatiCliente = async () => {
    setSalvando(true);
    const payload = {
      obiettivo,
      note_trainer: noteTrainer,
      prossima_valutazione: prossimaValutazione || null,
      piano,
      piano_alimentare: pianoAlimentare,
      promemoria_inviato: false,
      updated_at: new Date().toISOString(),
    };
    if (datiId) {
      await supabase.from("dati_cliente").update(payload).eq("id", datiId);
    } else {
      const { data } = await supabase
        .from("dati_cliente")
        .insert({ client_id: id, ...payload })
        .select()
        .single();
      if (data) setDatiId(data.id);
    }
    setSalvando(false);
  };

  const aggiungiRigaEsercizio = (giornoSuggerito?: string) => {
    setNuoviEsercizi((prev) => [
      ...prev,
      { ...ESERCIZIO_VUOTO, giorno: giornoSuggerito ?? prev[prev.length - 1]?.giorno ?? "Giorno 1" },
    ]);
  };

  const aggiornaEsercizio = (
    index: number,
    campo: keyof Esercizio,
    valore: string
  ) => {
    setNuoviEsercizi((prev) =>
      prev.map((es, i) => (i === index ? { ...es, [campo]: valore } : es))
    );
  };

  const rimuoviRigaEsercizio = (index: number) => {
    setNuoviEsercizi((prev) => prev.filter((_, i) => i !== index));
  };

  const salvaCarico = async (esercizioId: string) => {
    setSalvandoCarico(esercizioId);
    const valore = carichi[esercizioId];
    if (valore) {
      await supabase.from("carichi_esercizio").insert({
        esercizio_id: esercizioId,
        client_id: id,
        carico_kg: parseFloat(valore),
        aggiornato_da: "trainer",
      });
      caricaTutto();
    }
    setSalvandoCarico(null);
  };

  const creaScheda = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroreScheda(null);
    const esercizi = nuoviEsercizi.filter((es) => es.nome.trim() !== "");
    if (!nuovoTitolo || esercizi.length === 0) {
      setErroreScheda("Scrivi un titolo e almeno un esercizio con il nome.");
      return;
    }

    setSalvandoScheda(true);

    await supabase
      .from("schede_allenamento")
      .update({ attiva: false })
      .eq("client_id", id)
      .eq("attiva", true);

    const { data: nuovaScheda, error: erroreScheda1 } = await supabase
      .from("schede_allenamento")
      .insert({ client_id: id, titolo: nuovoTitolo, attiva: true })
      .select()
      .single();

    if (erroreScheda1 || !nuovaScheda) {
      setErroreScheda(
        `Errore nel salvare la scheda: ${erroreScheda1?.message ?? "sconosciuto"}`
      );
      setSalvandoScheda(false);
      return;
    }

    const { error: erroreEsercizi } = await supabase.from("esercizi").insert(
      esercizi.map((es, i) => ({
        scheda_id: nuovaScheda.id,
        ordine: i,
        giorno: es.giorno || "Giorno 1",
        nome: es.nome,
        serie: es.serie ? parseInt(es.serie) : null,
        ripetizioni: es.ripetizioni || null,
        recupero_secondi: es.recupero_secondi
          ? parseInt(es.recupero_secondi)
          : 90,
        video_url: es.video_url || null,
        note: es.note || null,
      }))
    );

    if (erroreEsercizi) {
      setErroreScheda(
        `La scheda è stata creata ma gli esercizi non si sono salvati: ${erroreEsercizi.message}`
      );
      setSalvandoScheda(false);
      caricaTutto();
      return;
    }

    setNuovoTitolo("");
    setNuoviEsercizi([{ ...ESERCIZIO_VUOTO }]);
    setSalvandoScheda(false);
    caricaTutto();
  };

  const aggiungiCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroreCheck(null);
    setSalvandoCheck(true);
    const { error } = await supabase.from("check_valutazioni").insert({
      client_id: id,
      peso_kg: pesoNuovo ? parseFloat(pesoNuovo) : null,
      massa_grassa_percentuale: grassoNuovo ? parseFloat(grassoNuovo) : null,
      massa_magra_percentuale: magraNuova ? parseFloat(magraNuova) : null,
      nota: notaCheckNuova || null,
      inserito_da: "trainer",
    });
    if (error) {
      setErroreCheck(`Errore: ${error.message}`);
      setSalvandoCheck(false);
      return;
    }
    setPesoNuovo("");
    setGrassoNuovo("");
    setMagraNuova("");
    setNotaCheckNuova("");
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
        caricato_da: "trainer",
      });
      caricaTutto();
    }

    setCaricandoFotoTipo(null);
    const input = fileInputs.current[tipo];
    if (input) input.value = "";
  };

  const salvaRisposta = async (checkId: string) => {
    setSalvandoRisposta(checkId);
    await supabase
      .from("check_valutazioni")
      .update({ risposta_trainer: risposte[checkId] || null })
      .eq("id", checkId);
    setSalvandoRisposta(null);
  };

  const rispondiAppuntamento = async (
    appuntamentoId: string,
    stato: "confermato" | "rifiutato"
  ) => {
    setElaborandoAppuntamento(appuntamentoId);
    const appuntamento = appuntamenti.find((a) => a.id === appuntamentoId);

    await supabase
      .from("appuntamenti_pt")
      .update({ stato })
      .eq("id", appuntamentoId);

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
        client_id: id,
        dettagli: {
          stato,
          data_ora: appuntamento
            ? new Date(appuntamento.data_ora).toLocaleString("it-IT")
            : "",
        },
      }),
    }).catch(() => {});

    setElaborandoAppuntamento(null);
    caricaTutto();
  };

  const eliminaCliente = async () => {
    if (
      !window.confirm(
        `Eliminare definitivamente ${nomeCliente}? Verranno cancellati anche schede, check e foto. Non si può annullare.`
      )
    ) {
      return;
    }
    setEliminando(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch("/api/elimina-cliente", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ client_id: id }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      const risposta = await res.json();
      alert(`Errore durante l'eliminazione: ${risposta.errore ?? "sconosciuto"}`);
      setEliminando(false);
    }
  };

  if (caricando) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm text-muted">Caricamento…</p>
      </main>
    );
  }

  const schedaAttiva = schede.find((s) => s.attiva);
  const schedeStoriche = schede.filter((s) => !s.attiva);
  const giorniNuovaScheda = Array.from(
    new Set(nuoviEsercizi.map((es) => es.giorno || "Giorno 1"))
  );

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <a href="/dashboard" className="text-sm text-muted hover:text-paper">
          ← Tutti i clienti
        </a>
        <button
          onClick={eliminaCliente}
          disabled={eliminando}
          className="text-xs font-mono text-muted hover:text-red-400 transition disabled:opacity-50"
        >
          {eliminando ? "Eliminazione…" : "🗑 Elimina cliente"}
        </button>
      </div>
      <h1 className="font-display text-3xl uppercase mt-3 mb-8">
        {nomeCliente}
      </h1>

      {/* Obiettivo, note e prossima valutazione */}
      <section className="bg-panel border border-line rounded-card p-6 mb-8">
        <h2 className="font-display uppercase text-lg mb-4">
          Obiettivo, note e prossima valutazione
        </h2>
        <label className="block text-sm text-muted mb-2">Piano</label>
        <div className="flex gap-3 mb-4">
          <button
            type="button"
            onClick={() => setPiano("plus")}
            className={`flex-1 py-2 rounded-card border text-sm font-display uppercase tracking-wide transition ${
              piano === "plus"
                ? "bg-gold text-ink border-gold"
                : "border-line text-muted"
            }`}
          >
            Plus
          </button>
          <button
            type="button"
            onClick={() => setPiano("premium")}
            className={`flex-1 py-2 rounded-card border text-sm font-display uppercase tracking-wide transition ${
              piano === "premium"
                ? "bg-gold text-ink border-gold"
                : "border-line text-muted"
            }`}
          >
            Premium
          </button>
        </div>
        <label className="block text-sm text-muted mb-1">Obiettivo</label>
        <input
          value={obiettivo}
          onChange={(e) => setObiettivo(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-card bg-ink border border-line text-paper"
          placeholder="Es. ricomposizione corporea, forza, 10km sotto i 50'…"
        />
        <label className="block text-sm text-muted mb-1">
          Note (visibili al cliente)
        </label>
        <textarea
          value={noteTrainer}
          onChange={(e) => setNoteTrainer(e.target.value)}
          rows={3}
          className="w-full mb-4 px-3 py-2 rounded-card bg-ink border border-line text-paper"
        />
        <label className="block text-sm text-muted mb-1">
          Data prossima valutazione
        </label>
        <input
          type="date"
          value={prossimaValutazione}
          onChange={(e) => setProssimaValutazione(e.target.value)}
          className="w-full mb-2 px-3 py-2 rounded-card bg-ink border border-line text-paper"
        />
        {prossimaValutazione && confermaValutazione && (
          <p className="text-xs font-mono mb-4">
            {confermaValutazione === "confermato" && (
              <span className="text-gold">✓ Il cliente ha confermato</span>
            )}
            {confermaValutazione === "annullato" && (
              <span className="text-red-400">✕ Il cliente ha annullato</span>
            )}
            {confermaValutazione === "in_attesa" && (
              <span className="text-muted">In attesa di conferma dal cliente</span>
            )}
          </p>
        )}
        {piano === "premium" && (
          <>
            <label className="block text-sm text-muted mb-1">
              Piano alimentare (solo premium, visibile al cliente)
            </label>
            <textarea
              value={pianoAlimentare}
              onChange={(e) => setPianoAlimentare(e.target.value)}
              rows={5}
              placeholder={
                "Es.\nColazione: ...\nPranzo: ...\nCena: ...\nNote generali: ..."
              }
              className="w-full mb-4 px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
            />
          </>
        )}
        <button
          onClick={salvaDatiCliente}
          disabled={salvando}
          className="px-5 py-2 rounded-card bg-gold text-ink font-display uppercase text-sm tracking-wide disabled:opacity-50"
        >
          {salvando ? "Salvataggio…" : "Salva"}
        </button>
      </section>

      {/* Scheda attiva + creazione nuova */}
      <section className="mb-8">
        <h2 className="font-display uppercase text-lg mb-4">
          Scheda di allenamento
        </h2>

        {schedaAttiva && (
          <div className="border border-line rounded-card p-5 mb-4 bg-panel2">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display uppercase tracking-wide">
                Attuale: {schedaAttiva.titolo}
              </p>
              <span className="font-mono text-xs text-muted">
                {new Date(schedaAttiva.updated_at).toLocaleDateString("it-IT")}
              </span>
            </div>
            {raggruppaPerGiorno(schedaAttiva.esercizi).map((gruppo) => (
              <div key={gruppo.giorno} className="mb-4 last:mb-0">
                <p className="font-mono text-xs text-gold uppercase tracking-wide mb-2">
                  {gruppo.giorno}
                </p>
                <div className="divide-y divide-line">
                  {gruppo.esercizi.map((es) => (
                    <div key={es.id} className="py-2">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-sm">
                          {es.nome}
                          {es.video_url && (
                            <a
                              href={es.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-gold text-xs"
                            >
                              ▶ video
                            </a>
                          )}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-muted whitespace-nowrap">
                            {es.serie ?? "—"}×{es.ripetizioni ?? "—"} · rec.{" "}
                            {es.recupero_secondi}s
                          </span>
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
                        </div>
                      </div>
                      {storicoCarichi[es.id] && (
                        <div className="mt-1">
                          <GraficoCarico voci={storicoCarichi[es.id]} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={creaScheda}
          className="bg-panel border border-line rounded-card p-6"
        >
          <p className="text-sm text-muted mb-3">
            Crea una nuova scheda (quella attuale passa in storico)
          </p>
          <label className="block text-sm text-muted mb-1">Titolo</label>
          <input
            value={nuovoTitolo}
            onChange={(e) => setNuovoTitolo(e.target.value)}
            className="w-full mb-4 px-3 py-2 rounded-card bg-ink border border-line text-paper"
            placeholder="Es. Blocco forza — settimane 1-4"
          />

          {giorniNuovaScheda.map((giorno) => (
            <div key={giorno} className="mb-4">
              <p className="font-mono text-xs text-gold uppercase tracking-wide mb-2">
                {giorno}
              </p>
              {nuoviEsercizi.map((es, i) =>
                es.giorno === giorno ? (
                  <div key={i} className="border border-line rounded-card p-3 mb-2">
                    <div className="grid grid-cols-12 gap-2 mb-2 items-center">
                      <input
                        placeholder="Esercizio"
                        value={es.nome}
                        onChange={(e) =>
                          aggiornaEsercizio(i, "nome", e.target.value)
                        }
                        className="col-span-4 px-2 py-2 rounded-card bg-ink border border-line text-paper text-sm"
                      />
                      <input
                        placeholder="Serie"
                        value={es.serie}
                        onChange={(e) =>
                          aggiornaEsercizio(i, "serie", e.target.value)
                        }
                        className="col-span-2 px-2 py-2 rounded-card bg-ink border border-line text-paper text-sm"
                      />
                      <input
                        placeholder="Rip."
                        value={es.ripetizioni}
                        onChange={(e) =>
                          aggiornaEsercizio(i, "ripetizioni", e.target.value)
                        }
                        className="col-span-2 px-2 py-2 rounded-card bg-ink border border-line text-paper text-sm"
                      />
                      <input
                        placeholder="Recupero (s)"
                        value={es.recupero_secondi}
                        onChange={(e) =>
                          aggiornaEsercizio(
                            i,
                            "recupero_secondi",
                            e.target.value
                          )
                        }
                        className="col-span-3 px-2 py-2 rounded-card bg-ink border border-line text-paper text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => rimuoviRigaEsercizio(i)}
                        className="col-span-1 text-muted hover:text-paper text-sm"
                        aria-label="Rimuovi esercizio"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      placeholder="Link video/gif dimostrativo (facoltativo)"
                      value={es.video_url}
                      onChange={(e) =>
                        aggiornaEsercizio(i, "video_url", e.target.value)
                      }
                      className="w-full px-2 py-2 rounded-card bg-ink border border-line text-paper text-xs"
                    />
                  </div>
                ) : null
              )}
              <button
                type="button"
                onClick={() => aggiungiRigaEsercizio(giorno)}
                className="text-xs text-gold"
              >
                + Esercizio in {giorno}
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              aggiungiRigaEsercizio(`Giorno ${giorniNuovaScheda.length + 1}`)
            }
            className="text-sm text-gold mb-4 block"
          >
            + Aggiungi un altro giorno
          </button>

          <div>
            <button
              type="submit"
              disabled={salvandoScheda}
              className="px-5 py-2 rounded-card bg-gold text-ink font-display uppercase text-sm tracking-wide disabled:opacity-50"
            >
              {salvandoScheda ? "Salvataggio…" : "Pubblica scheda"}
            </button>
            {erroreScheda && (
              <p className="text-sm text-red-400 mt-3" role="alert">
                {erroreScheda}
              </p>
            )}
          </div>
        </form>

        {schedeStoriche.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setMostraStorico((v) => !v)}
              className="text-sm text-muted hover:text-paper"
            >
              {mostraStorico ? "Nascondi" : "Mostra"} storico schede (
              {schedeStoriche.length})
            </button>
            {mostraStorico && (
              <div className="mt-3 space-y-3">
                {schedeStoriche.map((s) => (
                  <div
                    key={s.id}
                    className="border border-line rounded-card p-4 opacity-70"
                  >
                    <div className="flex justify-between mb-2">
                      <span className="font-display uppercase text-sm">
                        {s.titolo}
                      </span>
                      <span className="font-mono text-xs text-muted">
                        {new Date(s.updated_at).toLocaleDateString("it-IT")}
                      </span>
                    </div>
                    {raggruppaPerGiorno(s.esercizi).map((gruppo) => (
                      <div key={gruppo.giorno} className="mb-1">
                        <p className="font-mono text-[10px] text-muted uppercase">
                          {gruppo.giorno}
                        </p>
                        {gruppo.esercizi.map((es) => (
                          <p key={es.id} className="text-xs text-muted">
                            {es.nome} — {es.serie ?? "—"}×
                            {es.ripetizioni ?? "—"}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Check di valutazione */}
      <section className="mb-8">
        <h2 className="font-display uppercase text-lg mb-4">
          Check di valutazione
        </h2>
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
            value={notaCheckNuova}
            onChange={(e) => setNotaCheckNuova(e.target.value)}
            className="w-full mb-3 px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
          />
          <button
            type="submit"
            disabled={salvandoCheck}
            className="px-5 py-2 rounded-card bg-gold text-ink font-display uppercase text-sm tracking-wide disabled:opacity-50"
          >
            {salvandoCheck ? "Salvataggio…" : "Salva check"}
          </button>
          {erroreCheck && (
            <p className="text-sm text-red-400 mt-3" role="alert">
              {erroreCheck}
            </p>
          )}
        </form>

        {piano === "premium" && checks.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-muted mb-3">
              Rispondi ai check (visibile al cliente — servizio Premium)
            </p>
            <div className="space-y-3">
              {checks.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="border border-line rounded-card p-4 bg-panel2"
                >
                  <div className="flex justify-between text-xs font-mono text-muted mb-2">
                    <span>{new Date(c.data).toLocaleDateString("it-IT")}</span>
                    <span>
                      {c.peso_kg ? `${c.peso_kg} kg` : ""}
                      {c.nota ? ` — ${c.nota}` : ""}
                    </span>
                  </div>
                  <textarea
                    value={risposte[c.id] ?? ""}
                    onChange={(e) =>
                      setRisposte((prev) => ({
                        ...prev,
                        [c.id]: e.target.value,
                      }))
                    }
                    onBlur={() => salvaRisposta(c.id)}
                    rows={2}
                    placeholder="Scrivi un commento per il cliente…"
                    className="w-full px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
                  />
                  {salvandoRisposta === c.id && (
                    <p className="text-[10px] text-muted font-mono mt-1">
                      salvataggio…
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Appuntamenti PT (Premium) */}
      {piano === "premium" && (
        <section className="mb-8">
          <h2 className="font-display uppercase text-lg mb-4">
            Appuntamenti PT (15€ a lezione, in presenza)
          </h2>
          {appuntamenti.length === 0 ? (
            <p className="text-muted text-sm">Nessuna richiesta ancora.</p>
          ) : (
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
                    {a.nota_cliente && (
                      <p className="text-xs text-muted mt-0.5">{a.nota_cliente}</p>
                    )}
                  </div>
                  {a.stato === "richiesto" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => rispondiAppuntamento(a.id, "confermato")}
                        disabled={elaborandoAppuntamento === a.id}
                        className="text-xs px-3 py-1.5 rounded-card bg-gold text-ink font-display uppercase tracking-wide disabled:opacity-50"
                      >
                        Conferma
                      </button>
                      <button
                        onClick={() => rispondiAppuntamento(a.id, "rifiutato")}
                        disabled={elaborandoAppuntamento === a.id}
                        className="text-xs px-3 py-1.5 rounded-card border border-line text-muted font-display uppercase tracking-wide disabled:opacity-50"
                      >
                        Rifiuta
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-1 rounded-card border ${
                        a.stato === "confermato"
                          ? "text-gold border-gold"
                          : "text-muted border-line"
                      }`}
                    >
                      {a.stato}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Messaggi con il cliente (Premium) */}
      {piano === "premium" && (
        <section className="mb-8">
          <h2 className="font-display uppercase text-lg mb-4">
            Messaggi con {nomeCliente}
          </h2>
          <div className="bg-panel border border-line rounded-card p-6">
            <Chat clientId={id} ruolo="trainer" />
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
            Carica foto per questo cliente
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
                  onChange={(e) => caricaFoto(e, t.chiave)}
                  disabled={caricandoFotoTipo !== null}
                  className="hidden"
                />
              </label>
            ))}
          </div>
        </div>

        {foto.length === 0 ? (
          <p className="text-muted text-sm">Nessuna foto ancora.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {foto.map((f) => (
              <div key={f.id}>
                {urlFoto[f.id] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlFoto[f.id]}
                    alt={`Foto ${f.tipo} del ${f.data_scatto}`}
                    className="w-full aspect-[3/4] object-cover rounded-card border border-line"
                  />
                )}
                <p className="font-mono text-[10px] text-muted mt-1">
                  {f.tipo} ·{" "}
                  {new Date(f.data_scatto).toLocaleDateString("it-IT")}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
