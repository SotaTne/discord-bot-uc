import {
  CommandInteraction,
  GuildMember,
  PermissionsBitField,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  CommandInteractionOptionResolver,
  Role,
} from "discord.js";
import { acceptRolls, getOrCreateRole, startOclocks } from "../helper/utils.js";
import {
  createRoleNow,
  isCreatedAndIsAtTimeRole,
} from "../helper/role-name-helper.js";

export const data = new SlashCommandBuilder()
  .setName("uc-admin-handup")
  .setDescription("(管理者のみのコマンドです) 特定のロールに挙手をさせます")
  .addRoleOption((option) => {
    return option
      .setName("role")
      .setDescription("対象のロール")
      .setRequired(true);
  })
  .addIntegerOption((option) => {
    return option.setName("time").setDescription("対戦時間").setRequired(true);
  });

export async function execute(interaction: CommandInteraction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // 遅延応答を開始、ephemeral を true に設定
  } catch {
    console.error("遅延応答に失敗しました");
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription("エラー: 遅延応答に失敗しました。");
    try {
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("エラーメッセージの送信に失敗:", error);
    }
    return;
  }

  const options = interaction.options as CommandInteractionOptionResolver;
  const selectedTime = options.getInteger("time", true);
  const selectedRole = options.getRole("role", true);

  try {
    const guild = interaction.guild;
    if (!guild) {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("エラー: サーバー情報を取得できませんでした。");

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const caller = interaction.member as GuildMember;
    if (!(caller instanceof GuildMember)) {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("エラー: ユーザー情報を取得できませんでした。");

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (!caller.permissions.has(PermissionsBitField.Flags.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription(
          "管理者権限を持たないユーザーはこのコマンドを使えません"
        );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (!startOclocks.has(selectedTime)) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription("不正な対戦時間が選ばらました");

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (
      !acceptRolls.has(selectedRole.name) ||
      !(selectedRole instanceof Role)
    ) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription("対象外のロールが選ばれました");

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const roleOneMember = selectedRole.members.values().next().value;

    if (
      selectedRole.members.size === 0 ||
      !(roleOneMember instanceof GuildMember)
    ) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription("指定されたロールにメンバーがいません");

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
      if (isCreatedAndIsAtTimeRole(role.name, selectedTime)) {
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

    const timeRoleName = createRoleNow(selectedTime);

    try {
      const timeRole = await getOrCreateRole(guild, timeRoleName);
      await roleOneMember.roles.add(timeRole);

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setDescription(
          `## ${selectedRole.name}に${selectedTime}時の挙手をさせました\n時間ロール "${timeRoleName}" を付与しました。`
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("ロールの設定中にエラーが発生:", error);

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("ロールの設定中にエラーが発生しました。");

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    console.error("エラーが発生:", error);

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription("エラーが発生しました。");

    await interaction.editReply({ embeds: [embed] });
  }
}
