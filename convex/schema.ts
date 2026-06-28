import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Modèle de données Djassa Foot (cf. spec.md §3).
export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(), // = Clerk subject (sub)
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    flames: v.number(),
    points: v.number(),
    streak: v.number(),
    lastDailyBonusAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_token', ['tokenIdentifier'])
    .index('by_points', ['points'])
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
    read: v.boolean(),
    createdAt: v.number(),
  }).index('by_user', ['userId']),

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
});
