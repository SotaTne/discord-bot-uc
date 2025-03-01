// src/index.ts
import { Client, GatewayIntentBits } from "discord.js";
import * as dotenv from "dotenv";
import { registerCommands } from "./registerCommands.js";
import { commandHandlers } from "./commands/index.js"; // commands/index.ts でまとめる
import { setupSchedules } from "./scheduler.js";
import { server } from "./server.js";
import { PORT } from "./utils.js";
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});

client.once("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  await registerCommands();
  setupSchedules(client);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const command = commandHandlers[interaction.commandName];
  if (!command) {
    await interaction.reply("Unknown command");
    return;
  }
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error("Error executing command:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply("コマンドの処理中にエラーが発生しました。");
    } else {
      await interaction.followUp("コマンドの処理中にエラーが発生しました。");
    }
  }
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

client.login(process.env.DISCORD_BOT_TOKEN);
