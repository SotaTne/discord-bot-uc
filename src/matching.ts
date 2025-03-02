import {
  ChannelType,
  Client,
  GuildMember,
  Role,
  EmbedBuilder,
} from "discord.js";
import {
  acceptRolls,
  getRoleByName,
  getTimeRoleName,
  leastRoleName, // leastRoleNameが配列だと仮定
  returnRoleNameWithLeastTag,
  startOclocks,
} from "./utils.js";

export async function matching({
  client,
  channelId,
  guildId,
  time,
}: {
  client: Client;
  channelId: string;
  guildId: string;
  time: number;
}) {
  const timeRoleName = getTimeRoleName(time);

  const channel = await client.channels.fetch(channelId);
  const guild = await client.guilds.fetch(guildId);

  if (!channel || channel.type !== ChannelType.GuildText) {
    console.error("チャンネルが見つかりません");
    return;
  }

  if (!startOclocks.has(time)) {
    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setDescription("試合の受付時間外にスケジュールされました");

    await channel.send({ embeds: [embed] });
    return;
  }

  if (!timeRoleName) {
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription("不正な対戦時間がスケジュールされました");

    await channel.send({ embeds: [embed] });
    return;
  }

  if (!guild) {
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription("サーバー情報を取得できませんでした");

    await channel.send({ embeds: [embed] });
    return;
  }

  const timeRole = getRoleByName(timeRoleName, guild);

  if (!timeRole) {
    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setDescription("対象時間ロールをつけているユーザーがいませんでした");

    await channel.send({ embeds: [embed] });
    return;
  }

  try {
    // acceptRollsに含まれるロール && 指定された時間ロールを持つすべてのチームロールを取得
    const teamRoles = Array.from(
      guild.roles.cache
        .filter((role) => acceptRolls.includes(role.name))
        .values()
    );

    const participatingTeams = teamRoles.filter((teamRole) =>
      teamRole.members.some((member: GuildMember) =>
        member.roles.cache.some((r) => r.name === timeRoleName)
      )
    );

    if (participatingTeams.length < 2) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription("試合に参加するチームが十分ではありません");

      await channel.send({ embeds: [embed] });
      return;
    }

    const leastRoleTeams: Role[] = [];
    const normalRoleTeams: Role[] = [];
    teamRoles.forEach((teamRole) => {
      if (
        teamRole.members.every(
          (member: GuildMember) =>
            member.roles.cache.some((r) => leastRoleName.includes(r.name)) // leastRoleNameが配列である前提
        )
      ) {
        leastRoleTeams.push(teamRole);
      } else {
        normalRoleTeams.push(teamRole);
      }
    });

    let excludedTeam: Role | null = null;

    let finalTeams: Role[] = participatingTeams;

    if (participatingTeams.length % 2 !== 0) {
      if (leastRoleTeams.length > 0) {
        leastRoleTeams.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        excludedTeam = leastRoleTeams.pop() || null;
      } else {
        normalRoleTeams.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        excludedTeam = normalRoleTeams.pop() || null;
      }
      finalTeams = leastRoleTeams.concat(normalRoleTeams);
    }

    // チームをランダムにシャッフル
    const shuffledTeams = finalTeams.sort(() => Math.random() - 0.5);

    let matchMessage = `## 試合 (時間:${time}時) の組み合わせ:\n`;
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      matchMessage += `- **${returnRoleNameWithLeastTag(
        shuffledTeams[i]
      )}** vs **${returnRoleNameWithLeastTag(shuffledTeams[i + 1])}**\n`;
    }

    if (excludedTeam) {
      matchMessage += `**${returnRoleNameWithLeastTag(
        excludedTeam
      )}** はチーム数が奇数のため、マッチングしませんでした\n`;
    }
    matchMessage += `<@&${timeRole.id}>`;

    // マッチング結果は通常のテキストメッセージで送信（メンションが機能するように）
    await channel.send(matchMessage);
  } catch (error) {
    console.error("試合マッチング処理中にエラーが発生:", error);

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription("試合マッチング処理中にエラーが発生しました");

    await channel.send({ embeds: [embed] });
  }
}
