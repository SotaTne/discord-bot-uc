import * as dotenv from "dotenv";
import {
  getAllTimeRoleNames,
  startBeforeLimitMinutes,
  startOclocks,
  startRecruitment,
} from "./utils.js";
import { CronJob } from "cron";
import { ChannelType, Client, EmbedBuilder } from "discord.js";
import { matching } from "./matching.js";
import { recruitment } from "./recruitment.js";
import { rmTimeRole } from "./rmTimeRole.js";

dotenv.config();

export const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID;
export const TARGET_GUILD_ID = process.env.TARGET_GUILD_ID;

const schedulerEnabled = true;

// 各時間のスケジュールを保存するオブジェクト
const jobs: CronJob[] = [];

// すべてのスケジュールを設定
export function setupSchedules(client: Client) {
  startOclocks.forEach((hour) => {
    // CronJob形式での時間指定 (秒 分 時 日 月 曜日)
    // 日本時間を指定するため、タイムゾーンを'Asia/Tokyo'に設定
    //const cronTime = `0 0 ${hour} * * *`; // 毎日hour時00分00秒に実行
    const cronTime = `0 ${(60 - startBeforeLimitMinutes) % 60} ${
      (hour - 1) % 24
    } * * *`;

    jobs.push(
      new CronJob(
        cronTime,
        async function () {
          try {
            if (schedulerEnabled) {
              await sendScheduledMattingMessage(hour % 24, client);
            }
          } catch (e) {
            console.error(e);
          }
        },
        null, // onComplete
        true, // start
        "Asia/Tokyo" // タイムゾーン指定
      )
    );

    console.log(`${cronTime} JST でタスクをスケジュールしました`);
  });
  const cronTime: string = `0 38 ${startRecruitment % 24} * * *`;
  jobs.push(
    new CronJob(
      cronTime,
      async function () {
        try {
          if (schedulerEnabled) {
            try {
              await sendAndRmTimeRoleMessage(client);
            } catch (e) {
              console.error(e);
            }
            try {
              await sendScheduledRecruitmentMessage(
                startRecruitment % 24,
                client
              );
            } catch (e) {
              console.error(e);
            }
          }
        } catch (e) {
          console.error(e);
        }
      },
      null, // onComplete
      true, // start
      "Asia/Tokyo" // タイムゾーン指定
    )
  );
  console.log(`${cronTime} JST でタスクをスケジュールしました`);
}

// スケジュールされたメッセージを送信する関数
async function sendScheduledMattingMessage(hour: number, client: Client) {
  console.log(`${hour}:00 JST のメッセージを送信します`);
  try {
    if (!TARGET_CHANNEL_ID) {
      console.error("TARGET_CHANNEL_IDが設定されていません");
      return;
    }
    if (!TARGET_GUILD_ID) {
      console.error("TARGET_GUILD_IDが設定されていません");
      return;
    }
    await matching({
      client,
      channelId: TARGET_CHANNEL_ID,
      guildId: TARGET_GUILD_ID,
      time: hour,
    });
  } catch (error) {
    console.error("メッセージ送信中にエラーが発生しました:", error);
  }
}

async function sendScheduledRecruitmentMessage(time: number, client: Client) {
  console.log(`${time}:00 JST のメッセージを送信します`);
  try {
    if (!TARGET_CHANNEL_ID) {
      console.error("TARGET_CHANNEL_IDが設定されていません");
      return;
    }
    if (!TARGET_GUILD_ID) {
      console.error("TARGET_GUILD_IDが設定されていません");
      return;
    }
    await recruitment({
      client,
      channelId: TARGET_CHANNEL_ID,
      guildId: TARGET_GUILD_ID,
      time,
    });
  } catch (error) {
    console.error("メッセージ送信中にエラーが発生しました:", error);
  }
}

async function sendAndRmTimeRoleMessage(client: Client) {
  try {
    if (!TARGET_CHANNEL_ID) {
      console.error("TARGET_CHANNEL_IDが設定されていません");
      return;
    }
    if (!TARGET_GUILD_ID) {
      console.error("TARGET_GUILD_IDが設定されていません");
      return;
    }
    const guild = await client.guilds.fetch(TARGET_GUILD_ID);
    if (!guild) {
      console.error("ギルドが見つかりません");
      return;
    }
    const channel = await guild.channels.fetch(TARGET_CHANNEL_ID);
    if (!channel || channel.type !== ChannelType.GuildText) {
      console.error("チャンネルが見つかりません");
      return;
    }
    try {
      const rmRoles = await rmTimeRole({
        guild,
        rollNames: getAllTimeRoleNames(),
      });
      let message = "# 昨日の時間ロールの解除をします";
      if (rmRoles.length === 0) {
        message += "## 昨日の時間ロールはありませんでした";
      } else {
        message += `## 昨日の時間ロールの解除をしました\n${rmRoles
          .map((r) => `- ${r.name}`)
          .join("\n")}`;
      }
      await channel.send(message);
    } catch (error) {
      console.error("ロールの解除中にエラーが発生:", error);
      try {
        const embed = new EmbedBuilder()
          .setColor("Red")
          .setDescription("ロールの解除中にエラーが発生しました");
        await channel.send({
          embeds: [embed],
        });
      } catch {
        console.error("メッセージ送信中にエラーが発生しました");
      }
    }
  } catch (error) {
    console.error("メッセージ送信中にエラーが発生しました:", error);
  }
}
