/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as api_ from "../api.js";
import type * as apiKeys from "../apiKeys.js";
import type * as auth from "../auth.js";
import type * as authMaintenance from "../authMaintenance.js";
import type * as http from "../http.js";
import type * as links from "../links.js";
import type * as openidDiscovery from "../openidDiscovery.js";
import type * as session from "../session.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  api: typeof api_;
  apiKeys: typeof apiKeys;
  auth: typeof auth;
  authMaintenance: typeof authMaintenance;
  http: typeof http;
  links: typeof links;
  openidDiscovery: typeof openidDiscovery;
  session: typeof session;
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
