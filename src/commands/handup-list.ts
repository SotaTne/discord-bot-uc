import {
  CommandInteraction,
  Guild,
  GuildMember,
  PermissionsBitField,
  Role,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import {
  acceptRolls,
  getAllTimeRoleNames,
  getTimeRoleTuples,
} from "../utils.js";

export const data = new SlashCommandBuilder()
  .setName("uc-handup-list")
  .setDescription(
    "(管理者のみのコマンドです) 挙手しているメンバーを全て時間ごとに表示します"
  );

export async function execute(interaction: CommandInteraction) {
  try {
    await interaction.deferReply({ ephemeral: true }); // ephemeral を true に設定して確実に本人のみに表示
  } catch {
    console.error("遅延応答に失敗しました");

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription("エラー: 遅延応答に失敗しました。");

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  try {
    const guild = interaction.guild;
    if (!(guild instanceof Guild)) {
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

    console.log("permissions:", caller.permissions);

    if (!caller.permissions.has(PermissionsBitField.Flags.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription(
          "管理者権限を持たないユーザーはこのコマンドを使えません"
        );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const timeRoleNameTuples = getTimeRoleTuples();
    const allTimeRoleNames = getAllTimeRoleNames();
    const teamRoles = Array.from(
      guild.roles.cache
        .filter((role) => acceptRolls.includes(role.name))
        .values()
    );
    const participatingTeams = teamRoles.filter((teamRole) =>
      teamRole.members.some((member: GuildMember) =>
        member.roles.cache.some((r) => allTimeRoleNames.includes(r.name))
      )
    );

    const timeTeamRoleTuple: [number, string, Role[]][] = [];

    timeRoleNameTuples.forEach((timeRoleNameTuple) => {
      const [time, roleName] = timeRoleNameTuple;
      const role = guild.roles.cache.find((role) => role.name === roleName);
      if (!role) {
        return;
      }
      // このロールを持っているすべてのチームのロールを取得する
      const teamRoles = participatingTeams.filter((teamRole) =>
        teamRole.members.some((member: GuildMember) =>
          member.roles.cache.some((r) => r.name === roleName)
        )
      );
      timeTeamRoleTuple.push([time, roleName, teamRoles]);
    });

    const resultMessage = timeTeamRoleTuple.map(
      ([time, roleName, teamRoles]) => {
        const header = `## ${time}時の挙手リスト\n(ロール:${roleName})`;
        const main = teamRoles.map((teamRole) => {
          return `- **チーム:${teamRole.name}**`;
        });
        return [header, ...main].join("\n");
      }
    );
    const message = "# 現在の挙手リスト\n" + resultMessage.join("\n");

    const embed = new EmbedBuilder().setColor("Green").setDescription(message);

    await interaction.editReply({ embeds: [embed] });
    return;
  } catch (e) {
    console.error("エラーが発生しました", e);

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription("エラーが発生しました");

    try {
      await interaction.editReply({ embeds: [embed] });
      return;
    } catch (e) {
      console.error("エラーが発生しました", e);
    }
  }
}
