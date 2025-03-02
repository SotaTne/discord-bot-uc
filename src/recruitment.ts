import { ChannelType, Client, EmbedBuilder } from "discord.js";

export async function recruitment({
  client,
  channelId,
  guildId,
  time,
}: {
  client: Client;
  guildId: string;
  channelId: string;
  time: number;
}) {
  const guild = await client.guilds.fetch(guildId);
  if (!guild) {
    console.error("ギルドが見つかりません");
    return;
  }
  const channel = await guild.channels.fetch(channelId);
  if (!channel || channel.type !== ChannelType.GuildText) {
    console.error("チャンネルが見つかりません");
    return;
  }
  const embed = new EmbedBuilder()
    .setColor("Green")
    .setDescription(
      `## ${time % 24}:00になりましたので、本日の募集を開始します`
    );
  await channel.send({ embeds: [embed] });
}
