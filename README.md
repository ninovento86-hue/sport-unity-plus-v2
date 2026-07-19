# Portale Allenamento — guida alla pubblicazione

Questo pacchetto contiene il codice completo del tuo portale clienti:
- Login separato per te (trainer) e per i clienti
- Dashboard trainer: inviti nuovi clienti, scrivi obiettivo/note, carichi le
  schede di allenamento (con esercizi, serie, ripetizioni e tempo di
  recupero), imposti la data della prossima valutazione
- Area cliente: il cliente vede scheda e note (non modificabili), può
  avviare un **timer di recupero per ogni esercizio** (suono + vibrazione al
  termine), registrare i propri **check di valutazione** (peso, massa
  grassa/magra, con **grafico** dell'andamento e storico), vede un
  **calendario** con la data della prossima valutazione, e può caricare le
  proprie **foto progressi in 3 pose** (frontale, laterale, di schiena)
- Ogni cliente vede SOLO i propri dati (protetto a livello di database, non
  solo di interfaccia)
- Funziona anche come app: il cliente può "installarla" sulla schermata home
  del telefono (PWA)

Non serve sapere programmare per pubblicarlo: segui questi passaggi in ordine.
Tempo stimato: 30-45 minuti la prima volta.

> **Nota sul timer**: il suono e la vibrazione funzionano bene su Android
> (Chrome). Su iPhone (Safari) il suono funziona regolarmente, ma Apple non
> permette ai siti web di far vibrare il telefono — è una limitazione di
> iOS, non del sito. Il countdown e il suono restano comunque un ottimo
> avviso anche lì.

---

## 1. Crea il database (Supabase — gratuito)

1. Vai su https://supabase.com, crea un account e un nuovo progetto.
2. Scegli una password del database (salvala da parte, non serve per il
   sito ma è utile tenerla).
3. Una volta creato il progetto, vai su **SQL Editor** (menu a sinistra) →
   **New query**.
4. Apri il file `supabase/schema_v2.sql` incluso in questo pacchetto (è la
   versione aggiornata con timer, check di valutazione e foto per tipo —
   usa questo, non `schema.sql`), copia tutto il contenuto, incollalo
   nell'editor e premi **Run**.
   Questo crea tutte le tabelle e i permessi (ogni cliente vede solo i
   propri dati, tu vedi tutto).
5. Vai su **Project Settings > API**: qui trovi 3 valori che ti serviranno
   al passo 3 — `Project URL`, `anon public key`, `service_role key`.

---

## 2. Crea il primo account trainer (tu)

1. In Supabase vai su **Authentication > Users > Add user > Create new user**.
2. Inserisci la tua email e una password. Conferma l'email come "già
   verificata" (c'è un'opzione in fase di creazione).
3. Torna su **SQL Editor** ed esegui, sostituendo con la tua email:

   ```sql
   update profiles set role = 'trainer'
   where email = 'tuaemail@esempio.it';
   ```

   Questo ti rende l'unico account con accesso alla dashboard trainer.

---

## 3. Pubblica il sito (Vercel — gratuito)

1. Crea un account su https://github.com se non ce l'hai, e uno su
   https://vercel.com (puoi accedere direttamente con GitHub).
2. Crea un nuovo repository su GitHub e carica dentro tutti i file di
   questo pacchetto (puoi trascinarli dall'interfaccia web di GitHub, oppure
   chiedimi come fare da terminale).
3. Su Vercel: **Add New > Project**, seleziona il repository appena creato.
4. Prima di premere "Deploy", apri **Environment Variables** e aggiungi
   queste tre (i valori sono quelli del passo 1.5):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` *(questa è segreta: non condividerla mai)*
5. Premi **Deploy**. Dopo circa un minuto il sito è online, con un indirizzo
   tipo `portale-pt.vercel.app`.

---

## 4. Collega il tuo dominio

1. Su Vercel: **Project > Settings > Domains**, scrivi il tuo dominio (es.
   `www.tuopt.it`) e segui le istruzioni.
2. Ti verranno mostrati 1-2 record DNS da aggiungere dal pannello dove hai
   comprato il dominio (es. Aruba, GoDaddy, Namecheap). Se non l'hai ancora
   comprato, puoi farlo direttamente da lì (10-15€/anno circa).
3. Dopo la propagazione DNS (di solito pochi minuti, a volte fino a 24h) il
   sito risponde sul tuo dominio con HTTPS automatico.

---

## 5. Invita il primo cliente

1. Vai su `tuodominio.it/login`, accedi con l'account trainer.
2. Nella dashboard clicca **+ Nuovo cliente**, inserisci nome ed email.
3. Il cliente riceve un'email da Supabase per impostare la password e
   accedere da `tuodominio.it/area-cliente`.

*(Nota: l'email arriva dal dominio di Supabase con un template standard.
Se vuoi personalizzarla con il tuo logo/testo, si fa da Supabase >
Authentication > Email Templates — posso aiutarti quando arrivi a quel
punto.)*

---

## 6. L'app sul telefono (PWA)

Il sito è già configurato per essere installabile, con l'icona di Sport
Unity Club:
- **iPhone**: aprire il sito in Safari → tasto Condividi → "Aggiungi a
  Home".
- **Android**: aprire il sito in Chrome → menu (⋮) → "Aggiungi a schermata
  Home" (a volte compare automaticamente come suggerimento).

---

## Cosa NON include ancora questa prima versione

Per tenerla semplice da pubblicare, non ho incluso (ma si può aggiungere
in un secondo momento):
- Notifiche push quando carichi una nuova scheda
- Editor "a blocchi" più avanzato per le schede (superset, circuiti,
  video dimostrativi)
- Recupero password self-service dal login cliente
- Pagamenti/abbonamenti

Dimmi quali di questi ti servono per primi e li costruiamo.

---

## Serve aiuto?

Se un passaggio si blocca (errore su Vercel, su Supabase, DNS che non
si aggiorna...) mandami lo screenshot dell'errore e ti guido nel fix.
