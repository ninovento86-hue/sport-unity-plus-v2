"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

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

export default function FotoAreaCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const [foto, setFoto] = useState<Foto[]>([]);
  const [urlFoto, setUrlFoto] = useState<Record<string, string>>({});
  const [caricandoFotoTipo, setCaricandoFotoTipo] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(true);

  const caricaTutto = async () => {
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
        router.replace(`/area-cliente/${session.user.id}/foto`);
        return;
      }
      caricaTutto();
    };
    guardia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const sessioniFoto = Array.from(
    new Set(foto.map((f) => f.data_scatto))
  ).map((data) => ({
    data,
    foto: foto.filter((f) => f.data_scatto === data),
  }));

  return (
    <main className="min-h-screen px-6 py-10 max-w-2xl mx-auto">
      
        href={`/area-cliente/${id}`}
        className="text-sm text-muted hover:text-paper inline-block mb-4"
      >
        ← Il tuo spazio
      </a>
      <h1 className="font-display text-2xl uppercase mb-6">Foto progressi</h1>

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
    </main>
  );
}
