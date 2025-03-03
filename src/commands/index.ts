// src/commands/index.ts
import * as handup from "./handup.js";
import * as allHanddown from "./allHanddown.js";
import * as handdown from "./handdown.js";
import * as handupList from "./handup-list.js";
import * as adminHanddown from "./adminHanddown.js";
import * as adminHandup from "./adminHandup.js";

export const commandHandlers: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: { data: any; execute: (interaction: any) => Promise<void> };
} = {
  "uc-handup": handup,
  "uc-all-handdown": allHanddown,
  "uc-handdown": handdown,
  "uc-handup-list": handupList,
  "uc-admin-handdown": adminHanddown,
  "uc-admin-handup": adminHandup,
};
