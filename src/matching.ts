import { ChannelType, Client, Role, EmbedBuilder } from "discord.js";
import {
  acceptRolls,
  hasLeastRoleName,
  returnRoleNameWithLeastTag,
  startOclocks,
} from "./helper/utils.js";
import {
  getTimeStampFromRoleName,
  isCreatedAndIsAtTimeRole,
} from "./helper/role-name-helper.js";

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
  // const timeRoleName = getTimeRoleName(time);
  const channel = await client.channels.fetch(channelId);
  const guild = await client.guilds.fetch(guildId);

  if (!channel || channel.type !== ChannelType.GuildText) {
    console.error("チャンネルが見つかりません");
    return;
  }

  if (!startOclocks.has(time)) {
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Yellow")
          .setDescription("試合の受付時間外にスケジュールされました"),
      ],
    });
    return;
  }

  if (!guild) {
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Red")
          .setDescription("サーバー情報を取得できませんでした"),
      ],
    });
    return;
  }

  try {
    const teamRoles: Set<Role> = new Set();
    const teamRoleNamesSet: Set<string> = new Set();
    for (const acceptRoll of acceptRolls) {
      const role = guild.roles.cache.find((r) => r.name === acceptRoll);
      if (role) {
        if (teamRoleNamesSet.has(role.name)) continue;
        teamRoles.add(role);
        teamRoleNamesSet.add(role.name);
      }
    }

    // Role + timestamp
    const participatingTeams: Set<[Role, number]> = new Set();
    for (const teamRole of teamRoles) {
      if (!teamRole.members) await guild.members.fetch();
      // 代わりに有効なロールかを調べる
      let timeStamp: null | number = null;
      for (const member of teamRole.members.values()) {
        for (const role of member.roles.cache.values()) {
          const roleName = role.name;
          if (isCreatedAndIsAtTimeRole(roleName, time)) {
            timeStamp = getTimeStampFromRoleName(roleName);
            break;
          }
        }
      }
      if (timeStamp) {
        participatingTeams.add([teamRole, teamRole.createdTimestamp]);
      }
    }

    if (participatingTeams.size < 2) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Yellow")
            .setDescription("試合に参加するチームが十分ではありません"),
        ],
      });
      return;
    }

    const leastRoleTeams: [Role, number][] = [];
    const normalRoleTeams: [Role, number][] = [];
    for (const teamRole of participatingTeams) {
      (hasLeastRoleName(teamRole[0]) ? leastRoleTeams : normalRoleTeams).push(
        teamRole
      );
    }

    let excludedTeam: Role | null = null;
    let finalTeams = [...participatingTeams];
    if (finalTeams.length % 2 !== 0) {
      const sortedTeams = (
        leastRoleTeams.length > 0 ? leastRoleTeams : normalRoleTeams
      ).sort((a, b) => a[1] - b[1]);
      const poped = sortedTeams.pop();
      if (poped) {
        excludedTeam = poped[0];
      }
      finalTeams = finalTeams.filter((t) => t[0] !== excludedTeam);
    }

    finalTeams.sort(() => Math.random() - 0.5);

    let matchMessage = `## 試合 (時間:${time}時) の組み合わせ:\n`;
    for (let i = 0; i < finalTeams.length; i += 2) {
      matchMessage += `- **${returnRoleNameWithLeastTag(
        finalTeams[i][0]
      )}** vs **${returnRoleNameWithLeastTag(finalTeams[i + 1][0])}**\n`;
    }
    if (excludedTeam) {
      matchMessage += `**${returnRoleNameWithLeastTag(
        excludedTeam
      )}** はチーム数が奇数のため、マッチングしませんでした\n`;
    }
    matchMessage += `これ以降本日の${time}時の挙手の受付はできません\n`;
    for (const team of finalTeams) {
      matchMessage += `<@&${team[0].id}>\n`;
    }
    if (excludedTeam) {
      matchMessage += `<@&${excludedTeam.id}>\n`;
    }
    await channel.send(matchMessage);
  } catch (error) {
    console.error("試合マッチング処理中にエラーが発生:", error);
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Red")
          .setDescription("試合マッチング処理中にエラーが発生しました"),
      ],
    });
  }
}
