import { Routes } from "discord.js";
import { REST } from "@discordjs/rest";
import { commandHandlers } from "../commands/index.js";
import * as dotenv from "dotenv";
dotenv.config();

export async function registerCommands() {
  const commands = Object.values(commandHandlers).map((cmd) =>
    cmd.data.toJSON()
  );
  const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_BOT_TOKEN!
  );
  try {
    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), {
      body: commands,
    });
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("Error registering commands: ", error);
  }
}
