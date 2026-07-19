"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setChecking(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "trainer") {
        router.replace("/dashboard");
      } else {
        router.replace(`/area-cliente/${session.user.id}`);
      }
    };
    check();
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm text-muted">Caricamento…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-8">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Sport Unity Club — palestra, fitness, wellness, massaggi"
          className="w-full max-w-xs mx-auto mb-6"
        />
        <p className="font-mono text-xs tracking-[0.3em] text-gold uppercase mb-3">
          Registro allenamento
        </p>
        <h1 className="font-display text-5xl sm:text-6xl uppercase tracking-tight">
          Portale
          <br />
          Allenamento
        </h1>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <a
          href="/area-cliente"
          className="px-8 py-3 rounded-card bg-gold text-ink font-display uppercase tracking-wide text-sm hover:brightness-110 transition"
        >
          Accesso cliente
        </a>
        <a
          href="/login"
          className="px-8 py-3 rounded-card border border-line text-muted font-display uppercase tracking-wide text-sm hover:text-paper hover:border-paper transition"
        >
          Accesso trainer
        </a>
      </div>
    </main>
  );
}
