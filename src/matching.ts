import { ChannelType, Client, Role, EmbedBuilder } from "discord.js";
import {
  acceptRolls,
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

    const participatingTeams: [Role, number][] = [];
    for (const teamRole of teamRoles) {
      if (!teamRole.members) await guild.members.fetch();
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
      if (timeStamp !== null) {
        participatingTeams.push([teamRole, timeStamp]);
      }
    }

    if (participatingTeams.length < 2) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Yellow")
            .setDescription("試合に参加するチームが十分ではありません"),
        ],
      });
      return;
    }

    participatingTeams.sort((a, b) => b[1] - a[1]); // 降順ソート（新しい順）

    let excludedTeam: Role | null = null;
    if (participatingTeams.length % 2 !== 0) {
      excludedTeam = participatingTeams.shift()?.[0] || null;
    }

    let matchMessage = `## 試合 (時間:${time}時) の組み合わせ:\n`;
    for (let i = 0; i < participatingTeams.length; i += 2) {
      matchMessage += `- **${returnRoleNameWithLeastTag(
        participatingTeams[i][0]
      )}** vs **${returnRoleNameWithLeastTag(
        participatingTeams[i + 1][0]
      )}**\n`;
      // timeStampごとのにチームをconsole.log
      console.log(
        `timeStamp: ${
          participatingTeams[i][1]
        } team: ${returnRoleNameWithLeastTag(
          participatingTeams[i][0]
        )} vs timeStamp: ${
          participatingTeams[i + 1][1]
        } team: ${returnRoleNameWithLeastTag(participatingTeams[i + 1][0])}`
      );
    }

    if (excludedTeam) {
      matchMessage += `**${returnRoleNameWithLeastTag(
        excludedTeam
      )}** はチーム数が奇数のため、マッチングしませんでした\n`;
      console.log(
        `timeStamp: ${
          participatingTeams[participatingTeams.length - 1][1]
        } team: ${returnRoleNameWithLeastTag(excludedTeam)}`
      );
    }

    for (const team of participatingTeams) {
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
