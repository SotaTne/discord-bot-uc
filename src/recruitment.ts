import { ChannelType, Client } from "discord.js";

export async function recruitment({
  client,
  channelId,
  time,
}: {
  client: Client;
  channelId: string;
  time: number;
}) {
  const channel = await client.channels.fetch(channelId);

  if (!channel || channel.type !== ChannelType.GuildText) {
    console.error("チャンネルが見つかりません");
    return;
  }
  channel.send(`## ${time % 24}:00になりましたので、本日の募集を開始します`);
}
