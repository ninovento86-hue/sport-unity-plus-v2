"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import StoricoCheck from "@/components/StoricoCheck";

type Esercizio = {
  id?: string;
  nome: string;
  serie: string;
  ripetizioni: string;
  recupero_secondi: string;
  note: string;
};

type Scheda = {
  id: string;
  titolo: string;
  attiva: boolean;
  updated_at: string;
  esercizi: {
    id: string;
    nome: string;
    serie: number | null;
    ripetizioni: string | null;
    recupero_secondi: number;
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
};

type Foto = {
  id: string;
  storage_path: string;
  tipo: string;
  data_scatto: string;
};

const ESERCIZIO_VUOTO: Esercizio = {
  nome: "",
  serie: "",
  ripetizioni: "",
  recupero_secondi: "90",
  note: "",
};

export default function SchedaCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [nomeCliente, setNomeCliente] = useState("");
  const [obiettivo, setObiettivo] = useState("");
  const [noteTrainer, setNoteTrainer] = useState("");
  const [prossimaValutazione, setProssimaValutazione] = useState("");
  const [datiId, setDatiId] = useState<string | null>(null);

  const [schede, setSchede] = useState<Scheda[]>([]);
  const [nuovoTitolo, setNuovoTitolo] = useState("");
  const [nuoviEsercizi, setNuoviEsercizi] = useState<Esercizio[]>([
    { ...ESERCIZIO_VUOTO },
  ]);
  const [mostraStorico, setMostraStorico] = useState(false);

  const [checks, setChecks] = useState<Check[]>([]);
  const [foto, setFoto] = useState<Foto[]>([]);
  const [urlFoto, setUrlFoto] = useState<Record<string, string>>({});

  const [caricando, setCaricando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvandoScheda, setSalvandoScheda] = useState(false);

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
    }

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

    const { data: checkData } = await supabase
      .from("check_valutazioni")
      .select("*")
      .eq("client_id", id)
      .order("data", { ascending: false })
      .limit(20);
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

  const aggiungiRigaEsercizio = () => {
    setNuoviEsercizi((prev) => [...prev, { ...ESERCIZIO_VUOTO }]);
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

  const creaScheda = async (e: React.FormEvent) => {
    e.preventDefault();
    const esercizi = nuoviEsercizi.filter((es) => es.nome.trim() !== "");
    if (!nuovoTitolo || esercizi.length === 0) return;

    setSalvandoScheda(true);

    // la nuova scheda diventa quella attiva, le altre passano in storico
    await supabase
      .from("schede_allenamento")
      .update({ attiva: false })
      .eq("client_id", id)
      .eq("attiva", true);

    const { data: nuovaScheda } = await supabase
      .from("schede_allenamento")
      .insert({ client_id: id, titolo: nuovoTitolo, attiva: true })
      .select()
      .single();

    if (nuovaScheda) {
      await supabase.from("esercizi").insert(
        esercizi.map((es, i) => ({
          scheda_id: nuovaScheda.id,
          ordine: i,
          nome: es.nome,
          serie: es.serie ? parseInt(es.serie) : null,
          ripetizioni: es.ripetizioni || null,
          recupero_secondi: es.recupero_secondi
            ? parseInt(es.recupero_secondi)
            : 90,
          note: es.note || null,
        }))
      );
    }

    setNuovoTitolo("");
    setNuoviEsercizi([{ ...ESERCIZIO_VUOTO }]);
    setSalvandoScheda(false);
    caricaTutto();
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

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <a href="/dashboard" className="text-sm text-muted hover:text-paper">
        ← Tutti i clienti
      </a>
      <h1 className="font-display text-3xl uppercase mt-3 mb-8">
        {nomeCliente}
      </h1>

      {/* Obiettivo, note e prossima valutazione */}
      <section className="bg-panel border border-line rounded-card p-6 mb-8">
        <h2 className="font-display uppercase text-lg mb-4">
          Obiettivo, note e prossima valutazione
        </h2>
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
          className="w-full mb-4 px-3 py-2 rounded-card bg-ink border border-line text-paper"
        />
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
            <div className="flex items-center justify-between mb-2">
              <p className="font-display uppercase tracking-wide">
                Attuale: {schedaAttiva.titolo}
              </p>
              <span className="font-mono text-xs text-muted">
                {new Date(schedaAttiva.updated_at).toLocaleDateString("it-IT")}
              </span>
            </div>
            <div className="divide-y divide-line">
              {schedaAttiva.esercizi.map((es) => (
                <div key={es.id} className="py-2 text-sm flex justify-between">
                  <span>{es.nome}</span>
                  <span className="font-mono text-xs text-muted">
                    {es.serie ?? "—"}×{es.ripetizioni ?? "—"} · rec.{" "}
                    {es.recupero_secondi}s
                  </span>
                </div>
              ))}
            </div>
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

          <label className="block text-sm text-muted mb-2">Esercizi</label>
          {nuoviEsercizi.map((es, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-2 mb-2 items-center"
            >
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
                  aggiornaEsercizio(i, "recupero_secondi", e.target.value)
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
          ))}
          <button
            type="button"
            onClick={aggiungiRigaEsercizio}
            className="text-sm text-gold mb-4"
          >
            + Aggiungi esercizio
          </button>

          <div>
            <button
              type="submit"
              disabled={salvandoScheda}
              className="px-5 py-2 rounded-card bg-gold text-ink font-display uppercase text-sm tracking-wide disabled:opacity-50"
            >
              {salvandoScheda ? "Salvataggio…" : "Pubblica scheda"}
            </button>
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
                    {s.esercizi.map((es) => (
                      <p key={es.id} className="text-xs text-muted">
                        {es.nome} — {es.serie ?? "—"}×{es.ripetizioni ?? "—"}
                      </p>
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
        <div className="bg-panel border border-line rounded-card p-6">
          <StoricoCheck checks={checks} />
        </div>
      </section>

      {/* Foto progressi */}
      <section>
        <h2 className="font-display uppercase text-lg mb-4">
          Foto progressi
        </h2>
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
                  {f.tipo} · {new Date(f.data_scatto).toLocaleDateString("it-IT")}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
