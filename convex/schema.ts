import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Modèle de données Djassa Foot (cf. spec.md §3).
export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(), // = Clerk subject (sub)
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    flames: v.number(),
    // `points` (ancien score de classement) est retiré : le classement se fait
    // désormais au solde de jetons (`flames`). Champ laissé optionnel le temps
    // de la migration (migrations:stripPoints), puis supprimable définitivement.
    points: v.optional(v.number()),
    streak: v.number(),
    lastDailyBonusAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_token', ['tokenIdentifier'])
    .index('by_flames', ['flames'])
    .index('by_username', ['username']),

  flameTransactions: defineTable({
    userId: v.id('users'),
    amount: v.number(), // +/-
    reason: v.union(
      v.literal('signup_bonus'),
      v.literal('daily_bonus'),
      v.literal('ad_reward'),
      v.literal('referral'),
      v.literal('prediction_stake'),
      v.literal('prediction_win'),
    ),
    refId: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_user', ['userId']),

  competitions: defineTable({
    apiId: v.string(),
    name: v.string(),
    logoUrl: v.optional(v.string()),
    season: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('locked')),
  }).index('by_api', ['apiId']),

  teams: defineTable({
    apiId: v.string(),
    name: v.string(),
    badgeUrl: v.optional(v.string()),
  }).index('by_api', ['apiId']),

  players: defineTable({
    apiId: v.string(),
    name: v.string(),
    teamApiId: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
  })
    .index('by_api', ['apiId'])
    .index('by_team', ['teamApiId']),

  matches: defineTable({
    apiId: v.string(),
    competitionApiId: v.string(),
    season: v.optional(v.string()),
    round: v.optional(v.string()),
    homeName: v.string(),
    awayName: v.string(),
    homeTeamApiId: v.optional(v.string()),
    awayTeamApiId: v.optional(v.string()),
    homeBadgeUrl: v.optional(v.string()),
    awayBadgeUrl: v.optional(v.string()),
    kickoff: v.number(), // timestamp ms
    status: v.union(
      v.literal('scheduled'),
      v.literal('live'),
      v.literal('finished'),
    ),
    homeScore: v.optional(v.number()),
    awayScore: v.optional(v.number()),
    // Tirs au but (phase finale) — source API-Football, remplis seulement si séance de tirs.
    homePenalty: v.optional(v.number()),
    awayPenalty: v.optional(v.number()),
    // Vainqueur d'un match à élimination (source API-Football) — sert à griser le perdant
    // même quand le score réglementaire est nul (tirs au but / prolongation).
    winner: v.optional(v.union(v.literal('home'), v.literal('away'))),
    minute: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_api', ['apiId'])
    .index('by_kickoff', ['kickoff'])
    .index('by_status', ['status'])
    .index('by_competition', ['competitionApiId']),

  // Un pari = combiné de plusieurs « legs » (marchés) sur un même match. Cotes multipliées.
  bets: defineTable({
    userId: v.id('users'),
    matchId: v.id('matches'),
    legs: v.array(
      v.object({
        market: v.union(
          v.literal('result_1x2'),
          v.literal('over_under_2_5'),
          v.literal('btts'),
          v.literal('exact_score'),
        ),
        pick: v.string(), // 'home'|'draw'|'away' | 'over'|'under' | 'yes'|'no' | 'h-a'
        label: v.string(), // affichage : 'France', 'Plus de 2.5', 'Oui', '2 - 1'
        odds: v.number(),
        result: v.optional(
          v.union(v.literal('won'), v.literal('lost'), v.literal('void')),
        ),
      }),
    ),
    stake: v.number(),
    totalOdds: v.number(),
    potentialPayout: v.number(),
    status: v.union(
      v.literal('pending'),
      v.literal('won'),
      v.literal('lost'),
      v.literal('void'),
    ),
    payout: v.optional(v.number()),
    createdAt: v.number(),
    settledAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_match', ['matchId'])
    .index('by_status', ['status'])
    .index('by_user_status', ['userId', 'status']),

  friends: defineTable({
    userId: v.id('users'),
    friendId: v.id('users'),
    status: v.union(v.literal('pending'), v.literal('accepted')),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_friend', ['friendId']),

  notifications: defineTable({
    userId: v.id('users'),
    kind: v.string(),
    title: v.string(),
    body: v.string(),
    matchId: v.optional(v.id('matches')),
    betId: v.optional(v.id('bets')), // prono résolu → ouvre l'écran de résultat du pari
    read: v.boolean(),
    createdAt: v.number(),
  }).index('by_user', ['userId']),

  // Détail d'un match (TheSportsDB v2) : compo, temps forts (timeline), stats, vidéo.
  // Un doc par match, rempli à la demande (compo ~1h avant, timeline/stats après).
  matchDetails: defineTable({
    matchId: v.id('matches'),
    // Compo. `grid` (ex. "2:4" = ligne:colonne) + les formations viennent d'API-Football
    // (placement terrain) ; sinon liste TheSportsDB (avec photo, sans grid).
    homeFormation: v.optional(v.string()),
    awayFormation: v.optional(v.string()),
    lineup: v.array(
      v.object({
        name: v.string(),
        photo: v.optional(v.string()),
        position: v.optional(v.string()),
        positionShort: v.optional(v.string()),
        number: v.optional(v.number()),
        grid: v.optional(v.string()),
        isSub: v.boolean(),
        isHome: v.boolean(),
      }),
    ),
    timeline: v.array(
      v.object({
        minute: v.optional(v.number()),
        type: v.string(), // goal | card | subst | var | other
        detail: v.optional(v.string()),
        player: v.optional(v.string()),
        playerPhoto: v.optional(v.string()),
        assist: v.optional(v.string()),
        isHome: v.boolean(),
      }),
    ),
    stats: v.array(
      v.object({
        stat: v.string(),
        home: v.optional(v.string()),
        away: v.optional(v.string()),
      }),
    ),
    videoUrl: v.optional(v.string()),
    venue: v.optional(v.string()),
    spectators: v.optional(v.number()),
    updatedAt: v.number(),
  }).index('by_match', ['matchId']),

  // Cotes réelles (odds-api.io, Betfair Exchange) par match. Marchés absents → fallback Poisson.
  odds: defineTable({
    matchId: v.id('matches'),
    home: v.optional(v.number()),
    draw: v.optional(v.number()),
    away: v.optional(v.number()),
    over: v.optional(v.number()),
    under: v.optional(v.number()),
    bttsYes: v.optional(v.number()),
    bttsNo: v.optional(v.number()),
    source: v.string(), // 'odds-api.io'
    bookmaker: v.optional(v.string()),
    updatedAt: v.number(),
  }).index('by_match', ['matchId']),

  // Classements (poules) — ingéré depuis le endpoint « table » de TheSportsDB.
  standings: defineTable({
    competitionApiId: v.string(),
    group: v.optional(v.string()),
    rank: v.number(),
    teamApiId: v.optional(v.string()),
    teamName: v.string(),
    badgeUrl: v.optional(v.string()),
    played: v.number(),
    win: v.number(),
    draw: v.number(),
    loss: v.number(),
    goalsFor: v.number(),
    goalsAgainst: v.number(),
    goalDiff: v.number(),
    points: v.number(),
    updatedAt: v.number(),
  }).index('by_competition', ['competitionApiId']),

  // Ligues privées : un créateur, un code d'invitation, des membres.
  leagues: defineTable({
    name: v.string(),
    emoji: v.optional(v.string()),
    code: v.string(), // code d'invitation unique (ex. « K7M2PQ »)
    ownerId: v.id('users'),
    createdAt: v.number(),
  })
    .index('by_code', ['code'])
    .index('by_owner', ['ownerId']),

  // Appartenance à une ligue. Le score de ligue = bénéfice de pronos depuis `joinedAt`.
  leagueMembers: defineTable({
    leagueId: v.id('leagues'),
    userId: v.id('users'),
    joinedAt: v.number(),
  })
    .index('by_league', ['leagueId'])
    .index('by_user', ['userId'])
    .index('by_league_user', ['leagueId', 'userId']),
});
