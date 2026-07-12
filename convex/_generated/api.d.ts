/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents from "../agents.js";
import type * as automations from "../automations.js";
import type * as conversations from "../conversations.js";
import type * as dashboard from "../dashboard.js";
import type * as drafts from "../drafts.js";
import type * as events from "../events.js";
import type * as memory from "../memory.js";
import type * as messages from "../messages.js";
import type * as settings from "../settings.js";
import type * as usageRecords from "../usageRecords.js";
import type * as consolidation from "../consolidation.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agents: typeof agents;
  automations: typeof automations;
  conversations: typeof conversations;
  dashboard: typeof dashboard;
  drafts: typeof drafts;
  events: typeof events;
  memory: typeof memory;
  messages: typeof messages;
  settings: typeof settings;
  usageRecords: typeof usageRecords;
  consolidation: typeof consolidation;
}>;

export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
