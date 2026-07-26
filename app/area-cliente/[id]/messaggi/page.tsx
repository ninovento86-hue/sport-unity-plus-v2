"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Chat from "@/components/Chat";

export default function MessaggiAreaCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [piano, setPiano] = useState<"plus" | "premium">("plus");
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
        router.replace(`/area-cliente/${session.user.id}/messaggi`);
        return;
      }

      const { data: dati } = await supabase
        .from("dati_cliente")
        .select("piano")
        .eq("client_id", id)
        .maybeSingle();
      setPiano(dati?.piano === "premium" ? "premium" : "plus");

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
      <h1 className="font-display text-2xl uppercase mb-6">
        Messaggi con il tuo trainer
      </h1>

      {piano !== "premium" ? (
        <p className="text-muted text-sm">
          Questa sezione è disponibile solo per il servizio Premium.
        </p>
      ) : (
        <div className="bg-panel border border-line rounded-card p-6">
          <Chat clientId={id} ruolo="cliente" />
        </div>
      )}
    </main>
  );
}
