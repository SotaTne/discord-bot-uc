import {
  CommandInteraction,
  GuildMember,
  PermissionsBitField,
  SlashCommandBuilder,
} from "discord.js";
import { getAllTimeRoleNames } from "../utils.js";
import { rmTimeRole } from "../rmTimeRole.js";

export const data = new SlashCommandBuilder()
  .setName("uc-all-handdown")
  .setDescription(
    "(管理者のみのコマンドです) 挙手で付与されたすべての時刻(n時)ロールを解除します"
  );
export async function execute(interaction: CommandInteraction) {
  // Defer the reply once to allow time for processing
  await interaction.deferReply();

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("エラー: サーバー情報を取得できませんでした。");
    return;
  }

  const caller = interaction.member as GuildMember;
  if (!(caller instanceof GuildMember)) {
    await interaction.editReply("エラー: ユーザー情報を取得できませんでした。");
    return;
  }

  console.log("permissions:", interaction.memberPermissions);

  if (
    interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)
  ) {
    await interaction.editReply(
      "管理者権限を持たないユーザーはこのコマンドを使えません"
    );
    return;
  }

  try {
    // 時間ロールを持つすべてのロール名
    // すべての時間ロールを取得

    const deletedRoles = await rmTimeRole({
      guild,
      rollNames: getAllTimeRoleNames(),
    });

    await interaction.editReply(
      `時間ロール (${deletedRoles
        .map((r) => r.name)
        .join("/")}) を解除しました。`
    );
  } catch (error) {
    console.error("ロールの解除中にエラーが発生:", error);
    await interaction.editReply("ロールの解除中にエラーが発生しました。");
  }
}
