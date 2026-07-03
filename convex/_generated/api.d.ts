/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as betRules from "../betRules.js";
import type * as bets from "../bets.js";
import type * as crons from "../crons.js";
import type * as flames from "../flames.js";
import type * as football from "../football.js";
import type * as friends from "../friends.js";
import type * as leaderboard from "../leaderboard.js";
import type * as leagues from "../leagues.js";
import type * as matchDetails from "../matchDetails.js";
import type * as matches from "../matches.js";
import type * as migrations from "../migrations.js";
import type * as moderation from "../moderation.js";
import type * as moderationLib from "../moderationLib.js";
import type * as notifications from "../notifications.js";
import type * as oddsShared from "../oddsShared.js";
import type * as oddsSync from "../oddsSync.js";
import type * as settlement from "../settlement.js";
import type * as standings from "../standings.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  betRules: typeof betRules;
  bets: typeof bets;
  crons: typeof crons;
  flames: typeof flames;
  football: typeof football;
  friends: typeof friends;
  leaderboard: typeof leaderboard;
  leagues: typeof leagues;
  matchDetails: typeof matchDetails;
  matches: typeof matches;
  migrations: typeof migrations;
  moderation: typeof moderation;
  moderationLib: typeof moderationLib;
  notifications: typeof notifications;
  oddsShared: typeof oddsShared;
  oddsSync: typeof oddsSync;
  settlement: typeof settlement;
  standings: typeof standings;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
