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
  leastRoleName,
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
    const teamRoles: Set<Role> = new Set();
    for (const acceptRoll of acceptRolls) {
      const role = guild.roles.cache.find((role) => role.name === acceptRoll);

      // ロールが見つからない場合の処理
      if (!role) {
        console.warn(`ロール ${acceptRoll} がサーバーに存在しません`);
        continue; // ロールが見つからなければ、次のロールに進む
      }
      teamRoles.add(role);
    }

    // teamRole.membersの存在を確認
    const participatingTeams: Set<Role> = new Set();
    teamRoles.forEach((teamRole) => {
      // teamRole.membersが存在するか確認
      if (!teamRole.members) {
        return false;
      }

      // メンバーが役職を持っているか確認
      const hasRole = teamRole.members.some((member: GuildMember) =>
        member.roles.cache.some((r) => r.name === timeRoleName)
      );
      if (hasRole) {
        participatingTeams.add(teamRole);
      }
    });

    if (participatingTeams.size < 2) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription("試合に参加するチームが十分ではありません");

      await channel.send({ embeds: [embed] });
      return;
    }

    const leastRoleTeams: Set<Role> = new Set();
    const normalRoleTeams: Set<Role> = new Set();

    // 各チームのメンバー情報を確認する
    teamRoles.forEach((teamRole) => {
      if (teamRole.members) {
        if (
          teamRole.members.every(
            (member: GuildMember) =>
              member.roles.cache.some((r) => leastRoleName.includes(r.name)) // leastRoleNameが配列である前提
          )
        ) {
          leastRoleTeams.add(teamRole);
        } else {
          normalRoleTeams.add(teamRole);
        }
      }
    });

    let excludedTeam: Role | null = null;

    let finalTeams: Role[];

    if (participatingTeams.size % 2 !== 0) {
      if (leastRoleTeams.size > 0) {
        finalTeams = Array.from(leastRoleTeams);
        finalTeams.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        excludedTeam = finalTeams.pop() || null;
      } else {
        finalTeams = Array.from(normalRoleTeams);
        finalTeams.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        excludedTeam = finalTeams.pop() || null;
      }
      finalTeams = finalTeams.concat(Array.from(normalRoleTeams));
    } else {
      finalTeams = Array.from(participatingTeams);
    }

    // チームをランダムにシャッフル
    const shuffledTeams = finalTeams.sort(() => Math.random() - 0.5);

    let matchMessage = `## 試合 (時間:${time}時) の組み合わせ:\n`;
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      matchMessage += `- **${await returnRoleNameWithLeastTag(
        shuffledTeams[i]
      )}** vs **${await returnRoleNameWithLeastTag(shuffledTeams[i + 1])}**\n`;
    }

    if (excludedTeam) {
      matchMessage += `**${await returnRoleNameWithLeastTag(
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
