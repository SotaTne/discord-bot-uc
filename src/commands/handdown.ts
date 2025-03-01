import {
  CommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { checkHasAcceptRole, getAllTimeRoleNames } from "../utils.js";

export const data = new SlashCommandBuilder()
  .setName("uc-handdown")
  .setDescription(
    "挙手をキャンセルして、対象の時刻ロールを同じチームのメンバーから外します"
  );

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply(); // 遅延応答を開始

  const guild = interaction.guild;
  if (!guild) {
    // callerにしか見えないメッセージを送信
    await interaction.editReply("エラー: サーバー情報を取得できませんでした。");
    return;
  }

  const caller = interaction.member as GuildMember;

  if (!checkHasAcceptRole(caller)) {
    // callerにしか見えないメッセージを送信
    await interaction.editReply("キャンセルが許可されていません");
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
      // callerにしか見えないメッセージを送信
      await interaction.editReply("ロールの解除中にエラーが発生しました。");
    }
  }

  if (isRemoved) {
    // callerにしか見えないメッセージを送信
    await interaction.editReply("時間ロールを解除しました。");
  } else {
    // callerにしか見えないメッセージを送信
    await interaction.editReply("時間ロールは付与されてませんでした。");
  }
}
