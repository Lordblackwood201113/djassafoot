// Les actions Convex « use node » (ex. convex/adsNode.ts, vérification SSV AdMob) utilisent des
// API Node (node:crypto, Buffer). Convex les valide avec ses propres types au déploiement, mais le
// tsc de l'app compile aussi ces fichiers (importés via _generated/api). On rend donc les types
// Node disponibles au programme de types ici. @types/node est déjà installé.
/// <reference types="node" />
