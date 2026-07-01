import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

// Scores en direct toutes les 2 min (no-op si pas de match live / pas de clé).
crons.interval('live scores', { minutes: 2 }, internal.football.ingestLive);

// Calendrier complet de la CdM 2026, 4×/jour.
crons.cron('sync fixtures', '0 */6 * * *', internal.football.syncFixtures);

// Classements des poules, toutes les 3 h.
crons.cron('sync standings', '0 */3 * * *', internal.football.syncStandings);

// Filet de sécurité : règle les paris en attente sur des matchs déjà terminés (idempotent).
crons.interval('reconcile settlements', { minutes: 15 }, internal.settlement.reconcilePending);

// Tirs au but des matchs à élimination (via API-Football) — no-op s'il n'y a pas de séance.
crons.interval('enrich penalties', { minutes: 20 }, internal.football.enrichPenalties);

// Cotes réelles (odds-api.io, Betfair Exchange), toutes les 6 h.
crons.interval('sync odds', { hours: 6 }, internal.oddsSync.syncOdds);

export default crons;
