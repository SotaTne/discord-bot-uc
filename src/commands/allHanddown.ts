import {
  CommandInteraction,
  GuildMember,
  PermissionsBitField,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { rmTimeRole } from "../helper/rmTimeRole.js";

export const data = new SlashCommandBuilder()
  .setName("uc-all-handdown")
  .setDescription(
    "(管理者のみのコマンドです) 挙手で付与されたすべての時刻(n時)ロールを解除します"
  );

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

    try {
      // 時間ロールを持つすべてのロール名
      // すべての時間ロールを取得
      const deletedRoles = await rmTimeRole({
        guild,
      });

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setDescription(
          `以下の時間ロールの解除をしました\n${deletedRoles
            .map((r) => "- " + r.name)
            .join("\n")}`
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("ロールの解除中にエラーが発生:", error);

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("ロールの解除中にエラーが発生しました。");

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
