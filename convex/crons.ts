import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

// Scores en direct toutes les 2 min (no-op si pas de match live / pas de clé).
crons.interval('live scores', { minutes: 2 }, internal.football.ingestLive);

// Calendrier complet de la CdM 2026, 4×/jour.
crons.cron('sync fixtures', '0 */6 * * *', internal.football.syncFixtures);

// Classements des poules, toutes les 3 h.
crons.cron('sync standings', '0 */3 * * *', internal.football.syncStandings);

export default crons;
