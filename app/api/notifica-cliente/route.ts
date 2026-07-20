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

  const { data: profiloChiamante } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profiloChiamante?.role !== "trainer") {
    return NextResponse.json({ errore: "Non autorizzato." }, { status: 403 });
  }

  const { tipo, client_id, dettagli } = await req.json();

  const { data: cliente } = await supabaseAdmin
    .from("profiles")
    .select("email, nome_completo")
    .eq("id", client_id)
    .single();

  if (!cliente?.email) {
    return NextResponse.json({ ok: true });
  }

  let oggetto = "";
  let testo = "";

  if (tipo === "esito_appuntamento") {
    const esito = dettagli?.stato === "confermato" ? "confermato" : "rifiutato";
    oggetto = `Il tuo appuntamento è stato ${esito}`;
    testo = `Ciao ${cliente.nome_completo},\n\nil tuo trainer ha ${esito} l'appuntamento del ${dettagli?.data_ora ?? ""}.${
      dettagli?.nota_trainer ? `\n\nNota: ${dettagli.nota_trainer}` : ""
    }`;
  } else if (tipo === "nuovo_messaggio") {
    oggetto = "Nuovo messaggio dal tuo trainer";
    testo = `Ciao ${cliente.nome_completo},\n\nil tuo trainer ti ha scritto:\n\n"${dettagli?.testo ?? ""}"\n\nAccedi al portale per rispondere.`;
  } else {
    return NextResponse.json({ errore: "Tipo non valido." }, { status: 400 });
  }

  try {
    await inviaEmail({ to: cliente.email, subject: oggetto, text: testo });
  } catch (e) {
    console.error("Errore invio email cliente:", e);
  }

  return NextResponse.json({ ok: true });
}
