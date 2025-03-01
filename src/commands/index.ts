// src/commands/index.ts
import * as handup from "./handup.js";
import * as allHanddown from "./allHanddown.js";
import * as match from "./match.js";
import * as handdown from "./handdown.js";

export const commandHandlers: {
  [key: string]: { data: any; execute: (interaction: any) => Promise<void> };
} = {
  "uc-handup": handup,
  "uc-all-handdown": allHanddown,
  "uc-handdown": handdown,
  //"uc-match": match,
};
