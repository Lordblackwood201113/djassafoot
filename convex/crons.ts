import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

// Scores en direct via football-data.org toutes les 1 min. GARDÉ par liveWindowActive → n'appelle
// l'API que pendant les fenêtres de match. 1 seul appel = TOUS les matchs du Mondial ; quota 10/min
// (~14 000/j) → large. Statut IN_PLAY/PAUSED/FINISHED + score + vainqueur (t.a.b.) fiables.
// (`ingestLive` TheSportsDB et `ingestLiveAF` API-Football restent en secours manuel : `convex run`.)
crons.interval('live scores', { minutes: 1 }, internal.football.ingestLiveFD);

// Calendrier complet de la CdM 2026 (scores/statuts finaux de TOUS les matchs) — 1 seul appel API.
// Toutes les 10 min : finalise rapidement les matchs qui viennent de se terminer.
crons.interval('sync fixtures', { minutes: 10 }, internal.football.syncFixtures);

// Classements des poules, toutes les 15 min (alimente aussi le bracket).
crons.interval('sync standings', { minutes: 15 }, internal.football.syncStandings);

// Filet de sécurité : règle les paris en attente sur des matchs déjà terminés (idempotent).
crons.interval('reconcile settlements', { minutes: 10 }, internal.settlement.reconcilePending);

// Tirs au but des matchs à élimination (via API-Football) — no-op s'il n'y a pas de séance.
crons.interval('enrich penalties', { minutes: 20 }, internal.football.enrichPenalties);

// Cotes réelles (odds-api.io, Betfair Exchange), toutes les 6 h.
crons.interval('sync odds', { hours: 6 }, internal.oddsSync.syncOdds);

export default crons;
