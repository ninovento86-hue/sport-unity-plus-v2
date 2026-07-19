import { createClient } from "@supabase/supabase-js";

// ATTENZIONE: questo client usa la Service Role Key, che ha accesso
// completo al database bypassando ogni permesso (RLS).
// Va usato SOLO in codice server-side (Route Handlers), MAI nel browser.
// La chiave va letta da una variabile d'ambiente SENZA prefisso
// NEXT_PUBLIC_, così Next.js non la include mai nel bundle del client.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
