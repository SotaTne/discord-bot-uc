import {
  CommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  EmbedBuilder,
  CommandInteractionOptionResolver,
  MessageFlags,
  Role,
} from "discord.js";
import {
  acceptRolls,
  checkHasAcceptRole,
  isAcceptTime,
  startBeforeLimitMinutes,
  startRecruitment,
} from "../helper/utils.js";
import { isCreatedAndIsAtTimeRole } from "../helper/role-name-helper.js";

export const data = new SlashCommandBuilder()
  .setName("uc-handdown")
  .setDescription(
    "挙手をキャンセルして、対象の時刻ロールを同じチームのメンバーから外します"
  )
  .addIntegerOption((option) =>
    option.setName("time").setDescription("対戦時間").setRequired(true)
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
    const options = interaction.options as CommandInteractionOptionResolver;
    const time = options.getInteger("time", true);

    const guild = interaction.guild;
    if (!guild) {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("エラー: サーバー情報を取得できませんでした。");

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (!isAcceptTime(time)) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription(
          `受付時間外・または無効な対戦時間が選ばれました\n受付可能時間は当日の${startRecruitment}時~試合開始${startBeforeLimitMinutes}分前 です。`
        );

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

    const callerTeamRoles = caller.roles.cache.filter((r) =>
      acceptRolls.has(r.name)
    );

    if (callerTeamRoles.size === 0) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription("キャンセルが許可されていません");

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (callerTeamRoles.size > 1) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription(
          "複数のチームロールを持っているため、キャンセルできません"
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const selectedRole = callerTeamRoles.values().next().value;

    if (!selectedRole) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription("キャンセルが許可されていません");
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    try {
      // 時間ロールを持つすべてのロール名を取得し、削除する
      const deletedRoleSet: Set<Role> = new Set();
      const removePromises: Promise<GuildMember>[] = [];

      // すべてのメンバーのロールを処理
      for (const member of selectedRole.members.values()) {
        for (const role of member.roles.cache.values()) {
          if (isCreatedAndIsAtTimeRole(role.name, time)) {
            deletedRoleSet.add(role);
            removePromises.push(member.roles.remove(role));
          }
        }
      }

      // すべてのロール削除を並行して実行
      await Promise.all(removePromises);

      // 結果メッセージの作成
      const headerMessage = `## ${selectedRole.name}の、${time}時のすべてのロールを解除しました`;
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
      const embed = new EmbedBuilder()
        .setColor("Green")
        .setDescription(resultMessage);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("ロールの削除中にエラーが発生:", error);
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("ロールの削除中にエラーが発生しました。");
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
