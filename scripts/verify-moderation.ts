// Vérif autonome du filtre de mots : `npx tsx scripts/verify-moderation.ts`
// (moderationLib n'importe que des types → aucun accès runtime aux _generated).
import { isNameAllowed } from '../convex/moderationLib';

const ALLOWED = [
  'Les Bleus',
  'FC Abidjan',
  'Yaya',
  'Didier Drogba',
  'unique', // ne doit PAS matcher "nique"
  'clinique',
  'escalope', // ne doit PAS matcher "salope"
  'Scunthorpe', // problème classique : ne doit PAS matcher "cunt"
  'Manchester',
  'Team Rocket',
];

const BLOCKED = [
  'connard',
  'FC Connard',
  'putain de ligue',
  'fuck',
  'salope',
  'PUTE',
  'encule',
  'nazi',
  'n1gger', // leetspeak → nigger
  'xxconnardxx', // sous-chaîne
  'FuckLucas', // concaténation EN (sous-chaîne) — régression corrigée après revue
  'shitpost',
  'FuckOffPSG',
  'bitchboy',
];

let ok = 0;
let fail = 0;
for (const n of ALLOWED) {
  if (isNameAllowed(n)) ok++;
  else {
    fail++;
    console.error(`❌ FAUX POSITIF : "${n}" refusé alors qu'il devrait être autorisé`);
  }
}
for (const n of BLOCKED) {
  if (!isNameAllowed(n)) ok++;
  else {
    fail++;
    console.error(`❌ FAUX NÉGATIF : "${n}" autorisé alors qu'il devrait être refusé`);
  }
}

console.log(`\nFiltre de mots : ${ok}/${ok + fail} OK (${ALLOWED.length} autorisés, ${BLOCKED.length} refusés)`);
if (fail > 0) process.exit(1);
