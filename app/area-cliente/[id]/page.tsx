"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import TimerButton from "@/components/TimerButton";
import StoricoCheck from "@/components/StoricoCheck";

type Esercizio = {
  id: string;
  ordine: number;
  nome: string;
  serie: number | null;
  ripetizioni: string | null;
  recupero_secondi: number;
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

export default function AreaCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const [nome, setNome] = useState("");
  const [obiettivo, setObiettivo] = useState("");
  const [noteTrainer, setNoteTrainer] = useState("");
  const [prossimaValutazione, setProssimaValutazione] = useState<string | null>(null);

  const [scheda, setScheda] = useState<Scheda | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [foto, setFoto] = useState<Foto[]>([]);
  const [urlFoto, setUrlFoto] = useState<Record<string, string>>({});

  const [pesoNuovo, setPesoNuovo] = useState("");
  const [grassoNuovo, setGrassoNuovo] = useState("");
  const [magraNuova, setMagraNuova] = useState("");
  const [notaNuova, setNotaNuova] = useState("");
  const [salvandoCheck, setSalvandoCheck] = useState(false);
  const [caricandoFotoTipo, setCaricandoFotoTipo] = useState<string | null>(null);

  const [caricando, setCaricando] = useState(true);

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
    }

    const { data: checkData } = await supabase
      .from("check_valutazioni")
      .select("*")
      .eq("client_id", id)
      .order("data", { ascending: false })
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

  // Raggruppa le foto per data di scatto (sessione)
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
      <p className="font-mono text-xs tracking-[0.3em] text-gold uppercase mb-2">
        Il tuo spazio
      </p>
      <h1 className="font-display text-3xl uppercase mb-8">Ciao {nome}</h1>

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

      {/* Scheda con timer */}
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
            <div className="divide-y divide-line">
              {scheda.esercizi.map((es) => (
                <div
                  key={es.id}
                  className="flex items-center justify-between py-3 gap-3"
                >
                  <div>
                    <p className="text-sm">{es.nome}</p>
                    <p className="font-mono text-xs text-muted">
                      {es.serie ? `${es.serie} serie` : ""}
                      {es.serie && es.ripetizioni ? " × " : ""}
                      {es.ripetizioni ? `${es.ripetizioni} rip.` : ""}
                      {es.note ? ` — ${es.note}` : ""}
                    </p>
                  </div>
                  <TimerButton secondi={es.recupero_secondi} />
                </div>
              ))}
            </div>
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
          <div className="bg-panel border border-line rounded-card p-5 flex items-center gap-4">
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
