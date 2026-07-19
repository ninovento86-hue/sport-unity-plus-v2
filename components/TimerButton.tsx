"use client";

import { useEffect, useRef, useState } from "react";

export default function TimerButton({ secondi }: { secondi: number }) {
  const [rimasti, setRimasti] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const suonaEVibra = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // browser senza Web Audio: pazienza, resta la vibrazione
    }
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
  };

  const avvia = () => {
    if (intervalRef.current) return;
    setRimasti(secondi);
    intervalRef.current = setInterval(() => {
      setRimasti((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          suonaEVibra();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const ferma = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRimasti(null);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const inCorso = rimasti !== null;

  return (
    <button
      type="button"
      onClick={inCorso ? ferma : avvia}
      className="flex items-center gap-1.5 bg-gold text-ink font-mono font-semibold text-xs px-3 py-1.5 rounded-card whitespace-nowrap"
      aria-label={
        inCorso
          ? `Ferma il timer, ${rimasti} secondi rimasti`
          : `Avvia recupero di ${secondi} secondi`
      }
    >
      {inCorso ? `${rimasti}s` : `▶ ${secondi}s`}
    </button>
  );
}
