import {
  SlashCommandBuilder,
  CommandInteraction,
  Role,
  GuildMember,
  CommandInteractionOptionResolver,
  PermissionsBitField,
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
  await interaction.deferReply(); // 遅延応答の開始
  const options =
    interaction.options as unknown as CommandInteractionOptionResolver;
  const time = options.getInteger("time", true) as number;

  const timeRoleName = getTimeRoleName(time);

  if (!startOclocks.includes(time)) {
    await interaction.editReply("試合の受付時間外です。");
    return;
  }

  if (!timeRoleName) {
    await interaction.editReply("対戦時間が不正です。");
    return;
  }

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("エラー: サーバー情報を取得できませんでした。");
    return;
  }

  const timeRole = getRoleByName(timeRoleName, interaction.guild);

  if (!timeRole) {
    await interaction.editReply("対象の時間ロールが見つかりませんでした。");
    return;
  }

  const caller = interaction.member as GuildMember;
  if (
    !caller.permissions.has(PermissionsBitField.Flags.Administrator) &&
    !checkHasAcceptRole(caller)
  ) {
    await interaction.editReply(
      "挙手が許可または、管理者権限のないユーザーはこのコマンドを使えません。"
    );
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
      await interaction.editReply("試合に参加するチームが十分ではありません。");
      return;
    }

    let leastRoleTeams: Role[] = [];
    let normalRoleTeams: Role[] = [];
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

    await interaction.editReply(matchMessage);
  } catch (error) {
    console.error("試合マッチング処理中にエラーが発生:", error);
    await interaction.editReply(
      "試合マッチングの処理中にエラーが発生しました。"
    );
  }
}
