// src/commands/handup.ts
import {
  SlashCommandBuilder,
  CommandInteraction,
  GuildMember,
  CommandInteractionOptionResolver,
  EmbedBuilder,
} from "discord.js";
import {
  getTimeRoleName,
  getOrCreateRole,
  getAllTimeRoleNames,
  startRecruitment,
  isAcceptTime,
  checkHasAcceptRole,
  startBeforeLimitMinutes,
} from "../utils.js";

export const data = new SlashCommandBuilder()
  .setName("uc-handup")
  .setDescription("対戦時間ロールを付与します")
  .addIntegerOption((option) =>
    option.setName("time").setDescription("対戦時間").setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true }); // ephemeral を true に設定して確実に本人のみに表示

  const options =
    interaction.options as unknown as CommandInteractionOptionResolver;
  const time = options.getInteger("time", true);

  if (!isAcceptTime(time)) {
    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setDescription(
        `受付時間外です。受付可能時間は当日の${startRecruitment}時~試合開始${startBeforeLimitMinutes}分前 です。`
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

  const timeRoleName = getTimeRoleName(time);
  if (!timeRoleName) {
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription("対戦時間が不正です。");

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const caller = interaction.member as GuildMember;
  const validTimeRoles = getAllTimeRoleNames();

  if (!checkHasAcceptRole(caller)) {
    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setDescription("挙手が許可されていません");

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (
    caller.roles.cache.some(
      (r) => validTimeRoles.includes(r.name) && r.name === getTimeRoleName(time)
    )
  ) {
    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setDescription("すでに挙手しています。");

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  try {
    const timeRole = await getOrCreateRole(guild, timeRoleName);
    await caller.roles.add(timeRole);

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setDescription(`時間ロール "${timeRoleName}" を付与しました。`);

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("ロールの処理中にエラーが発生:", error);

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription("ロールの処理中にエラーが発生しました。");

    await interaction.editReply({ embeds: [embed] });
  }
}
