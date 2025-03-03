import {
  SlashCommandBuilder,
  CommandInteraction,
  GuildMember,
  CommandInteractionOptionResolver,
  EmbedBuilder,
  MessageFlags,
  Role,
} from "discord.js";
import {
  getOrCreateRole,
  startRecruitment,
  isAcceptTime,
  checkHasAcceptRole,
  startBeforeLimitMinutes,
  acceptRolls,
} from "../helper/utils.js";
import {
  createRoleNow,
  isCreatedAndIsAtTimeRole,
} from "../helper/role-name-helper.js";

export const data = new SlashCommandBuilder()
  .setName("uc-handup")
  .setDescription("対戦時間ロールを付与します")
  .addIntegerOption((option) =>
    option.setName("time").setDescription("対戦時間").setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // 遅延応答を開始、ephemeral を true に設定
  } catch (error) {
    console.error("遅延応答に失敗しました:", error);
    return; // 遅延応答に失敗した場合は処理を終了
  }

  try {
    const options = interaction.options as CommandInteractionOptionResolver;
    const time = options.getInteger("time", true);

    if (!isAcceptTime(time)) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription(
          `受付時間外・または無効な対戦時間が選ばれました\n受付可能時間は当日の${startRecruitment}時~試合開始${startBeforeLimitMinutes}分前 です。`
        );

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

    const caller = interaction.member as GuildMember;

    if (!checkHasAcceptRole(caller)) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription("挙手が許可されていません");

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const callerTeamRoles = caller.roles.cache.filter((r) =>
      acceptRolls.has(r.name)
    );

    if (callerTeamRoles.size === 0) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription("挙手が許可されていません");

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (callerTeamRoles.size > 1) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription("複数のチームロールを持っているため、挙手できません");
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const selectedRole = callerTeamRoles.values().next().value;

    if (!selectedRole) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription("挙手が許可されていません");
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const allSelectedRoleHasRoles: Set<Role> = new Set();
    for (const member of selectedRole.members.values()) {
      const roles = member.roles.cache.values();
      for (const role of roles) {
        if (role instanceof Role && role.members.size > 0) {
          allSelectedRoleHasRoles.add(role);
        }
      }
    }

    const nowTimeRoles: Set<Role> = new Set();

    for (const role of allSelectedRoleHasRoles) {
      if (isCreatedAndIsAtTimeRole(role.name, time)) {
        nowTimeRoles.add(role);
      }
    }

    if (nowTimeRoles.size > 0) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription("すでに挙手しています");

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const timeRoleName = createRoleNow(time);

    try {
      const timeRole = await getOrCreateRole(guild, timeRoleName);
      await caller.roles.add(timeRole);

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setDescription(
          `### ${time}時の挙手を受け付けました\n時間ロール "${timeRoleName}" を付与しました。`
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("ロールの処理中にエラーが発生:", error);

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("ロールの処理中にエラーが発生しました。");

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    console.error("エラーが発生:", error);

    try {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("エラーが発生しました。");

      await interaction.editReply({ embeds: [embed] });
    } catch (replyError) {
      console.error("エラーレスポンス送信中にさらにエラーが発生:", replyError);
    }
  }
}
