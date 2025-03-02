import { ChannelType, Client, GuildMember, Role } from "discord.js";
import {
  acceptRolls,
  getRoleByName,
  getTimeRoleName,
  leastRoleName,
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
    await channel.send("## 試合の受付時間外にスケジュールされました");
    return;
  }

  if (!timeRoleName) {
    await channel.send("## 不正な対戦時間がスケジュールされました");
    return;
  }

  if (!guild) {
    await channel.send("## サーバー情報を取得できませんでした");
    return;
  }

  const timeRole = getRoleByName(timeRoleName, guild);

  if (!timeRole) {
    await channel.send("## 対象時間ロールをつけているユーザーがいませんでした");
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
      await channel.send("## 試合に参加するチームが十分ではありません");
      return;
    }

    const leastRoleTeams: Role[] = [];
    const normalRoleTeams: Role[] = [];
    teamRoles.forEach((teamRole) => {
      if (
        teamRole.members.every((member: GuildMember) =>
          member.roles.cache.some((r) => leastRoleName.includes(r.name))
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
      matchMessage += `- **${shuffledTeams[i].name}** vs **${
        shuffledTeams[i + 1].name
      }**\n`;
    }

    if (excludedTeam) {
      matchMessage += `**${excludedTeam.name}** はチーム数が奇数のため、マッチングしませんでした\n`;
    }
    matchMessage += `<@&${timeRole.id}>`;

    await channel.send(matchMessage);
  } catch (error) {
    console.error("試合マッチング処理中にエラーが発生:", error);
    await channel.send("## 試合マッチング処理中にエラーが発生しました");
  }
}
