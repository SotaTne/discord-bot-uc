import {
  CommandInteraction,
  Guild,
  GuildMember,
  PermissionsBitField,
  Role,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import {
  acceptRolls,
  returnRoleNameWithLeastTag,
  startOclocks,
} from "../helper/utils.js";
import {
  isCreatedAndIsAtTimeRole,
  isCreatedRole,
} from "../helper/role-name-helper.js";

export const data = new SlashCommandBuilder()
  .setName("uc-handup-list")
  .setDescription(
    "(管理者のみのコマンドです) 挙手しているメンバーを全て時間ごとに表示します"
  );
export async function execute(interaction: CommandInteraction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // ephemeral を true に設定して確実に本人のみに表示
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

    if (!caller.permissions.has(PermissionsBitField.Flags.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription(
          "管理者権限を持たないユーザーはこのコマンドを使えません"
        );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const teamRoles = Array.from(
      guild.roles.cache
        .filter((role) => acceptRolls.includes(role.name))
        .values()
    );

    // 時間のロールを持っているすべてのチームロールを取得
    const participatingTeams = teamRoles.filter((teamRole) =>
      teamRole.members.some((member: GuildMember) =>
        member.roles.cache.some((r) => isCreatedRole(r.name))
      )
    );

    // 時間 [時間のロール名 , チームのロール] のタプルを作成
    // 型は [number, [string, Role][]][]
    const timeTeamRoleTuple: [number, [string, Role][]][] = [];

    startOclocks.forEach((time) => {
      // 現在時間のロールを持っているすべてのチームを取得
      // 取得する際に、そのロールの持っている時間のロール[]を取得
      // そのロール[]の名前を,で結合する
      const timeRoleNameAndTeamRole: [string, Role][] = [];
      for (const teamRole of participatingTeams) {
        const roleNames: string[] = [];
        for (const member of teamRole.members.values()) {
          for (const role of member.roles.cache.values()) {
            if (isCreatedAndIsAtTimeRole(role.name, time)) {
              roleNames.push(role.name);
            }
          }
        }
        if (roleNames.length > 0) {
          timeRoleNameAndTeamRole.push([roleNames.join(", "), teamRole]);
        }
      }
      if (timeRoleNameAndTeamRole.length > 0) {
        timeTeamRoleTuple.push([time, timeRoleNameAndTeamRole]);
      }
    });

    const resultMessages = timeTeamRoleTuple.map(
      ([time, timeRoleNameAndTeamRole]) => {
        const header = `## ${time}時の挙手リスト`;
        const main = timeRoleNameAndTeamRole.map((teamRole) => {
          const team = returnRoleNameWithLeastTag(teamRole[1]);
          return `- **チーム:${team}**\n  - ロール(${teamRole[0]})`;
        });

        return [header, ...main].join("\n");
      }
    );

    const message = "# 現在の挙手リスト\n" + resultMessages.join("\n");

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
