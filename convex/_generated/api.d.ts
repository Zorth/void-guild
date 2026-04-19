/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as characters from "../characters.js";
import type * as crons from "../crons.js";
import type * as discord from "../discord.js";
import type * as external_api from "../external_api.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as planning from "../planning.js";
import type * as quests from "../quests.js";
import type * as roles from "../roles.js";
import type * as sessions from "../sessions.js";
import type * as users from "../users.js";
import type * as worlds from "../worlds.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  characters: typeof characters;
  crons: typeof crons;
  discord: typeof discord;
  external_api: typeof external_api;
  http: typeof http;
  migrations: typeof migrations;
  planning: typeof planning;
  quests: typeof quests;
  roles: typeof roles;
  sessions: typeof sessions;
  users: typeof users;
  worlds: typeof worlds;
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
