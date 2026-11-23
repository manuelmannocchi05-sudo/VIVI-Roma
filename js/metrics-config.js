/* VIVI Roma — configurazione della misurazione. Tutto è SPENTO finché non viene configurato su Cloudflare.
   Vedi docs/misurazione.md per i passaggi manuali. */
export const METRICS_CONFIG={
  /* Eventi anonimi del quiz (functions/api/e.js → Workers Analytics Engine).
     Mettere true solo dopo aver creato il collegamento VIVI_EVENTS nel progetto Pages. */
  events:false,
  endpoint:"/api/e",
  /* Cloudflare Web Analytics, snippet manuale: token del sito (pubblico, compare comunque nell'HTML).
     Vuoto = nessuno snippet. */
  webAnalyticsToken:"",
  /* Indirizzi su cui la misurazione può partire: mai in locale, nei test o nelle anteprime. */
  hosts:["vivi-roma.pages.dev"],
  /* Massimo di eventi inviati per pagina caricata. */
  maxEvents:60
};
