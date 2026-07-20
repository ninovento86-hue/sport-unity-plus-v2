import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

  const { client_id } = await req.json();
  if (!client_id) {
    return NextResponse.json(
      { errore: "ID cliente mancante." },
      { status: 400 }
    );
  }

  // Elimina prima le foto nello storage (i record nel database e
  // l'account vengono rimossi automaticamente a cascata da qui in poi)
  const { data: foto } = await supabaseAdmin
    .from("foto_progressi")
    .select("storage_path")
    .eq("client_id", client_id);

  if (foto && foto.length > 0) {
    await supabaseAdmin.storage
      .from("foto-progressi")
      .remove(foto.map((f) => f.storage_path));
  }

  // Eliminare l'utente elimina a cascata: profilo, dati_cliente,
  // schede_allenamento (+ esercizi), check_valutazioni, foto_progressi
  const { error } = await supabaseAdmin.auth.admin.deleteUser(client_id);

  if (error) {
    return NextResponse.json({ errore: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
