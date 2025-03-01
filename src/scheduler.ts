import * as dotenv from "dotenv";
import {
  startBeforeLimitMinutes,
  startOclocks,
  startRecruitment,
} from "./utils.js";
import { CronJob } from "cron";
import { Client } from "discord.js";
import { matching } from "./matching.js";
import { recruitment } from "./recruitment.js";

dotenv.config();

export const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID;
export const TARGET_GUILD_ID = process.env.TARGET_GUILD_ID;

let schedulerEnabled = true;

// 各時間のスケジュールを保存するオブジェクト
const jobs: CronJob[] = [];

// すべてのスケジュールを設定
export function setupSchedules(client: Client) {
  startOclocks.forEach((hour, index) => {
    // CronJob形式での時間指定 (秒 分 時 日 月 曜日)
    // 日本時間を指定するため、タイムゾーンを'Asia/Tokyo'に設定
    //const cronTime = `0 0 ${hour} * * *`; // 毎日hour時00分00秒に実行
    const cronTime = `0 ${(60 - startBeforeLimitMinutes) % 60} ${
      (hour - 1) % 24
    } * * *`;

    jobs.push(
      new CronJob(
        cronTime,
        function () {
          try {
            if (schedulerEnabled) {
              sendScheduledMattingMessage(hour % 24, client);
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

    console.log(`${hour}:00 JST でタスクをスケジュールしました`);
  });
  jobs.push(
    new CronJob(`0 0 ${startRecruitment % 24} * * *`, function () {
      try {
        if (schedulerEnabled) {
          sendScheduledRecruitmentMessage(startRecruitment % 24, client);
        }
      } catch (e) {
        console.error(e);
      }
    })
  );
  console.log(`${startRecruitment % 24}:00 JST でタスクをスケジュールしました`);
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
    await recruitment({
      client,
      channelId: TARGET_CHANNEL_ID,
      time,
    });
  } catch (error) {
    console.error("メッセージ送信中にエラーが発生しました:", error);
  }
}
