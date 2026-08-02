import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { inviaEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const supabaseAsCaller = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
  } = await supabaseAsCaller.auth.getUser();
  if (!user) {
    return NextResponse.json({ errore: "Non autenticato." }, { status: 401 });
  }

  const { tipo, client_id, dettagli } = await req.json();

  const { data: trainer } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("role", "trainer")
    .limit(1)
    .maybeSingle();

  const { data: cliente } = await supabaseAdmin
    .from("profiles")
    .select("nome_completo")
    .eq("id", client_id)
    .single();

  if (!trainer?.email || !cliente) {
    return NextResponse.json({ ok: true }); // niente da notificare, non blocchiamo l'azione
  }

  let oggetto = "";
  let testo = "";

  if (tipo === "richiesta_appuntamento") {
    oggetto = `Nuova richiesta appuntamento — ${cliente.nome_completo}`;
    testo = `${cliente.nome_completo} ha richiesto un appuntamento per ${dettagli?.data_ora ?? ""}.\n\nNota del cliente: ${dettagli?.nota ?? "—"}\n\nAccedi alla dashboard per confermare o rifiutare.`;
  } else if (tipo === "conferma_valutazione") {
    oggetto = `${cliente.nome_completo} ha ${dettagli?.stato === "confermato" ? "confermato" : "annullato"} la valutazione`;
    testo = `${cliente.nome_completo} ha ${dettagli?.stato === "confermato" ? "confermato la presenza" : "annullato"} per la valutazione del ${dettagli?.data ?? ""}.`;
  } else if (tipo === "nuovo_messaggio") {
    oggetto = `Nuovo messaggio da ${cliente.nome_completo}`;
    testo = `${cliente.nome_completo} ti ha scritto:\n\n"${dettagli?.testo ?? ""}"\n\nRispondi dalla dashboard.`;
  } else if (tipo === "dati_check") {
    oggetto = `${cliente.nome_completo} ti ha inviato nuove misurazioni`;
    const d = dettagli ?? {};
    const righe = [
      d.peso_kg ? `Peso: ${d.peso_kg} kg` : null,
      d.vita_cm ? `Vita: ${d.vita_cm} cm` : null,
      d.fianchi_cm ? `Fianchi: ${d.fianchi_cm} cm` : null,
      d.petto_cm ? `Petto: ${d.petto_cm} cm` : null,
      d.braccio_cm ? `Braccio: ${d.braccio_cm} cm` : null,
      d.coscia_cm ? `Coscia: ${d.coscia_cm} cm` : null,
      d.nota ? `Nota: ${d.nota}` : null,
    ].filter(Boolean);
    testo = `${cliente.nome_completo} ti ha inviato queste misurazioni:\n\n${righe.join(
      "\n"
    )}\n\nRicordati di registrare il check ufficiale (con massa grassa/magra) dalla dashboard.`;
  } else {
    return NextResponse.json({ errore: "Tipo non valido." }, { status: 400 });
  }

  try {
    await inviaEmail({ to: trainer.email, subject: oggetto, text: testo });
  } catch (e) {
    // Non blocchiamo l'azione dell'utente se l'invio email fallisce
    console.error("Errore invio email trainer:", e);
  }

  return NextResponse.json({ ok: true });
}
