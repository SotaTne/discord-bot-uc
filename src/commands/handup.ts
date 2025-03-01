// src/commands/handup.ts
import {
  SlashCommandBuilder,
  CommandInteraction,
  GuildMember,
  CommandInteractionOptionResolver,
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
  await interaction.deferReply(); // 遅延応答を開始

  const options =
    interaction.options as unknown as CommandInteractionOptionResolver;
  const time = options.getInteger("time", true) as number;

  if (!isAcceptTime(time)) {
    // callerにしか見えないメッセージを送信
    await interaction.editReply({
      content: `受付時間外です。受付可能時間は当日の${startRecruitment}時~試合開始${startBeforeLimitMinutes}分前 です。`,
    });
    return;
  }

  const guild = interaction.guild;
  if (!guild) {
    // callerにしか見えないメッセージを送信
    await interaction.editReply("エラー: サーバー情報を取得できませんでした。");
    return;
  }

  const timeRoleName = getTimeRoleName(time);
  if (!timeRoleName) {
    // callerにしか見えないメッセージを送信
    await interaction.editReply("対戦時間が不正です。");
    return;
  }

  const caller = interaction.member as GuildMember;
  const validTimeRoles = getAllTimeRoleNames();

  if (!checkHasAcceptRole(caller)) {
    // callerにしか見えないメッセージを送信
    await interaction.editReply("挙手が許可されていません");
    return;
  }

  if (caller.roles.cache.some((r) => validTimeRoles.includes(r.name))) {
    // callerにしか見えないメッセージを送信
    await interaction.editReply("すでに挙手しています。");
    return;
  }

  try {
    const timeRole = await getOrCreateRole(guild, timeRoleName);
    await caller.roles.add(timeRole);
    // callerにしか見えないメッセージを送信
    await interaction.editReply(
      `時間ロール "${timeRoleName}" を付与しました。`
    );
  } catch (error) {
    // callerにしか見えないメッセージを送信
    console.error("ロールの処理中にエラーが発生:", error);
    await interaction.editReply("ロールの処理中にエラーが発生しました。");
  }
}
