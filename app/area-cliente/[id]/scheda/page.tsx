"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import TimerButton from "@/components/TimerButton";

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

export default function SchedaAreaCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [scheda, setScheda] = useState<Scheda | null>(null);
  const [carichi, setCarichi] = useState<Record<string, string>>({});
  const [salvandoCarico, setSalvandoCarico] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(true);

  const caricaTutto = async () => {
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
          if (!(c.esercizio_id in mappa)) {
            mappa[c.esercizio_id] = c.carico_kg?.toString() ?? "";
          }
        });
        setCarichi(mappa);
      }
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
        router.replace(`/area-cliente/${session.user.id}/scheda`);
        return;
      }
      caricaTutto();
    };
    guardia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      <h1 className="font-display text-2xl uppercase mb-6">La tua scheda</h1>

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
    </main>
  );
}
