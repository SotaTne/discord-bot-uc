import {
  CommandInteraction,
  GuildMember,
  PermissionsBitField,
  SlashCommandBuilder,
} from "discord.js";
import { getAllTimeRoleNames } from "../utils.js";

export const data = new SlashCommandBuilder()
  .setName("uc-all-handdown")
  .setDescription(
    "(管理者のみのコマンドです) 挙手で付与されたすべての時刻(n時)ロールを解除します"
  );

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply(); // 遅延応答を開始

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("エラー: サーバー情報を取得できませんでした。");
    return;
  }

  const validTimeRoles = getAllTimeRoleNames();
  const caller = interaction.member as GuildMember;
  if (!caller.permissions.has(PermissionsBitField.Flags.Administrator)) {
    await interaction.editReply(
      "管理者権限を持たないユーザーはこのコマンドを使えません"
    );
    return;
  }

  // 削除対象のロールを配列として保持
  const callerTimeRoles = caller.roles.cache
    .filter((r) => validTimeRoles.includes(r.name))
    .map((r) => r); // 配列に変換して保持

  if (callerTimeRoles.length === 0) {
    await interaction.editReply("対象のロールではないです。");
    return;
  }

  try {
    // 事前に取得したリストをもとに削除処理を行う
    for (const role of callerTimeRoles) {
      try {
        await caller.roles.remove(role);
      } catch (error) {
        console.error(
          `Failed to remove ${role.name} from ${caller.user.tag}:`,
          error
        );
      }
    }

    await interaction.editReply(
      `時間ロール (${callerTimeRoles
        .map((r) => r.name)
        .join("/")}) を解除しました。`
    );
  } catch (error) {
    console.error("ロールの解除中にエラーが発生:", error);
    await interaction.editReply("ロールの解除中にエラーが発生しました。");
  }
}
