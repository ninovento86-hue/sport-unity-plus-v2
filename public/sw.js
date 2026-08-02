// Service worker minimo: abilita l'installazione della PWA.
// Non fa caching aggressivo per evitare di mostrare dati vecchi
// (peso, check, messaggi) agli utenti — il sito resta sempre aggiornato.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Passa sempre alla rete: nessuna cache delle risposte.
self.addEventListener("fetch", () => {
  // Nessuna intercettazione: lascia che il browser gestisca normalmente.
});
