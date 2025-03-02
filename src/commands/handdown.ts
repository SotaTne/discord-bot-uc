import {
  CommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import { checkHasAcceptRole, getAllTimeRoleNames } from "../utils.js";

export const data = new SlashCommandBuilder()
  .setName("uc-handdown")
  .setDescription(
    "挙手をキャンセルして、対象の時刻ロールを同じチームのメンバーから外します"
  );

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true }); // 遅延応答を開始、ephemeral を true に設定

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
      .setDescription("キャンセルが許可されていません");

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const validTimeRoles = getAllTimeRoleNames();
  const callerTimeRoles = caller.roles.cache.filter((r) =>
    validTimeRoles.includes(r.name)
  );
  const roles = callerTimeRoles.values();
  let isRemoved = false;

  for (const role of roles) {
    try {
      await caller.roles.remove(role);
      isRemoved = true;
    } catch (error) {
      console.error(
        `Failed to remove ${role.name} from ${caller.user.tag}:`,
        error
      );

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("ロールの解除中にエラーが発生しました。");

      await interaction.editReply({ embeds: [embed] });
      return; // エラーが発生した場合は処理を中断
    }
  }

  if (isRemoved) {
    const embed = new EmbedBuilder()
      .setColor("Green")
      .setDescription("時間ロールを解除しました。");

    await interaction.editReply({ embeds: [embed] });
  } else {
    const embed = new EmbedBuilder()
      .setColor("Grey")
      .setDescription("時間ロールは付与されてませんでした。");

    await interaction.editReply({ embeds: [embed] });
  }
}
