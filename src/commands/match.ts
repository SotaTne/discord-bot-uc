import {
  SlashCommandBuilder,
  CommandInteraction,
  Role,
  GuildMember,
  CommandInteractionOptionResolver,
  PermissionsBitField,
  EmbedBuilder,
} from "discord.js";
import {
  acceptRolls,
  checkHasAcceptRole,
  getRoleByName,
  getTimeRoleName,
  leastRoleName,
  startOclocks,
} from "../utils.js";

export const data = new SlashCommandBuilder()
  .setName("uc-match")
  .setDescription(
    "現在の時間ロールを持つチーム同士をマッチングし、偶数組にして結果を送信します。"
  )
  .addIntegerOption((option) =>
    option.setName("time").setDescription("対象試合時刻").setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply(); // このコマンドは全員に見えるように ephemeral は指定しない
  const options =
    interaction.options as unknown as CommandInteractionOptionResolver;
  const time = options.getInteger("time", true) as number;

  const timeRoleName = getTimeRoleName(time);

  if (!startOclocks.has(time)) {
    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setDescription("試合の受付時間外です。");

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (!timeRoleName) {
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription("対戦時間が不正です。");

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const guild = interaction.guild;
  if (!guild) {
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription("エラー: サーバー情報を取得できませんでした。");

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const timeRole = getRoleByName(timeRoleName, interaction.guild);

  if (!timeRole) {
    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setDescription("対象の時間ロールが見つかりませんでした。");

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const caller = interaction.member as GuildMember;
  if (
    !caller.permissions.has(PermissionsBitField.Flags.Administrator) &&
    !checkHasAcceptRole(caller)
  ) {
    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setDescription(
        "挙手が許可または、管理者権限のないユーザーはこのコマンドを使えません。"
      );

    await interaction.editReply({ embeds: [embed] });
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
        .setDescription("試合に参加するチームが十分ではありません。");

      await interaction.editReply({ embeds: [embed] });
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

    // マッチング結果は通常のメッセージで表示（全員に見えるようにするため）
    await interaction.editReply(matchMessage);
  } catch (error) {
    console.error("試合マッチング処理中にエラーが発生:", error);

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription("試合マッチングの処理中にエラーが発生しました。");

    await interaction.editReply({ embeds: [embed] });
  }
}
