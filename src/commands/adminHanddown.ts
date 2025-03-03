import {
  CommandInteraction,
  GuildMember,
  PermissionsBitField,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  Role,
  CommandInteractionOptionResolver,
} from "discord.js";
import { acceptRolls, startOclocks } from "../helper/utils.js";
import { isCreatedAndIsAtTimeRole } from "../helper/role-name-helper.js";

export const data = new SlashCommandBuilder()
  .setName("uc-admin-handdown")
  .setDescription(
    "(管理者のみのコマンドです) 特定のロールの挙手をキャンセルさせます"
  )
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
  // すべての応答に使用するエラーメッセージ作成関数
  const createErrorEmbed = (
    color: "Red" | "Yellow" | "Green",
    message: string
  ) => {
    return new EmbedBuilder().setColor(color).setDescription(message);
  };

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
    // ギルド情報を取得
    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            "Red",
            "エラー: サーバー情報を取得できませんでした。"
          ),
        ],
      });
      return;
    }

    // 実行者の情報を取得と権限チェック
    const caller = interaction.member;
    if (!(caller instanceof GuildMember)) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            "Red",
            "エラー: ユーザー情報を取得できませんでした。"
          ),
        ],
      });
      return;
    }

    // 管理者権限チェック
    if (!caller.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            "Yellow",
            "管理者権限を持たないユーザーはこのコマンドを使えません"
          ),
        ],
      });
      return;
    }

    // オプションの取得（型キャストを適切に行う）
    const options = interaction.options as CommandInteractionOptionResolver;
    const selectedTime = options.getInteger("time");
    const selectedRole = options.getRole("role");

    // オプションの存在確認
    if (selectedTime === null || selectedRole === null) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed("Yellow", "必須パラメータが指定されていません"),
        ],
      });
      return;
    }

    // 対戦時間の検証
    if (!startOclocks.has(selectedTime)) {
      await interaction.editReply({
        embeds: [createErrorEmbed("Yellow", "不正な対戦時間が選ばれました")],
      });
      return;
    }

    // ロールの検証
    if (
      !(selectedRole instanceof Role) ||
      !acceptRolls.has(selectedRole.name)
    ) {
      await interaction.editReply({
        embeds: [createErrorEmbed("Yellow", "対象外のロールが選ばれました")],
      });
      return;
    }

    if (selectedRole.members.size === 0) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed("Yellow", "指定されたロールにメンバーがいません"),
        ],
      });
      return;
    }

    try {
      // 時間ロールを持つすべてのロール名を取得し、削除する
      const deletedRoleSet: Set<Role> = new Set();
      const removePromises: Promise<GuildMember>[] = [];

      // すべてのメンバーのロールを処理
      for (const member of selectedRole.members.values()) {
        for (const role of member.roles.cache.values()) {
          if (isCreatedAndIsAtTimeRole(role.name, selectedTime)) {
            deletedRoleSet.add(role);
            removePromises.push(member.roles.remove(role));
          }
        }
      }

      // すべてのロール削除を並行して実行
      await Promise.all(removePromises);

      // 結果メッセージの作成
      const headerMessage = `## ${selectedRole.name}の、${selectedTime}時のすべてのロールを解除しました`;
      const deletedRoleNames = Array.from(deletedRoleSet).map(
        (role) => role.name
      );

      let resultMessage = headerMessage;
      if (deletedRoleNames.length > 0) {
        const deletedRoleNamesMessage = deletedRoleNames
          .map((roleName) => `- ${roleName}`)
          .join("\n");
        resultMessage += `\n${deletedRoleNamesMessage}`;
      } else {
        resultMessage += "\n対象のロールがありませんでした";
      }

      // 成功メッセージを送信
      await interaction.editReply({
        embeds: [createErrorEmbed("Green", resultMessage)],
      });
    } catch (error) {
      console.error("ロールの解除中にエラーが発生:", error);
      await interaction.editReply({
        embeds: [
          createErrorEmbed("Red", "ロールの解除中にエラーが発生しました。"),
        ],
      });
    }
  } catch (error) {
    console.error("エラーが発生:", error);
    await interaction.editReply({
      embeds: [createErrorEmbed("Red", "エラーが発生しました。")],
    });
  }
}
