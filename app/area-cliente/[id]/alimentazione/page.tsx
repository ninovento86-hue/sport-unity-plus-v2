"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AlimentazioneAreaCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [piano, setPiano] = useState<"plus" | "premium">("plus");
  const [pianoAlimentare, setPianoAlimentare] = useState("");
  const [caricando, setCaricando] = useState(true);

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
        router.replace(`/area-cliente/${session.user.id}/alimentazione`);
        return;
      }

      const { data: dati } = await supabase
        .from("dati_cliente")
        .select("piano, piano_alimentare")
        .eq("client_id", id)
        .maybeSingle();
      setPiano(dati?.piano === "premium" ? "premium" : "plus");
      setPianoAlimentare(dati?.piano_alimentare ?? "");

      setCaricando(false);
    };
    guardia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      <h1 className="font-display text-2xl uppercase mb-6">Piano alimentare</h1>

      {piano !== "premium" ? (
        <p className="text-muted text-sm">
          Questa sezione è disponibile solo per il servizio Premium.
        </p>
      ) : !pianoAlimentare ? (
        <p className="text-muted text-sm">
          Il trainer non ha ancora caricato un piano alimentare.
        </p>
      ) : (
        <section className="bg-panel border border-line rounded-card p-6">
          <p className="text-xs text-gold uppercase tracking-wide mb-2">
            Il tuo piano
          </p>
          <pre className="whitespace-pre-wrap font-body text-sm text-paper">
            {pianoAlimentare}
          </pre>
        </section>
      )}
    </main>
  );
}
