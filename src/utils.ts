import { Guild, Role, GuildMember } from "discord.js";
import { createHash } from "crypto";

// 挙手受付可能な時間帯（24時間制）
export const startOclocks = new Set([/*14, 15,*/ 19, 20, 21, 22, 23]); // デフォルトは[ 21, 22, 23]
export const startRecruitment = 12; // デフォルトは12
export const acceptRolls: string[] = [
  "KMU",
  "UT",
  "NGT",
  "ITF",
  "HU",
  "Tohoku",
  "mir",
  "Rits",
  "MUS",
  "SU",
  "KU×TT",
  "Hosei",
  "K!T",
  "tym",
];
export const leastRoleName = "試合数5";
export const startBeforeLimitMinutes = 13; //デフォルトは7

export const PORT: number = process.env.PORT
  ? parseInt(process.env.PORT)
  : 8000;

export const getJPDate = () => {
  const now = new Date();
  const jstOffset = 9 * 60;
  now.setMinutes(now.getMinutes() + jstOffset);
  return now;
};

export function isAcceptTime(wantTime: number): boolean {
  // 日本時間の現在時刻を取得
  if (!startOclocks.has(wantTime)) {
    return false;
  }
  const now = getJPDate();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  console.log("now:", now);
  console.log("hour:", hour);
  console.log("minute:", minute);

  // wantTimeの7分前(n-1)時の53分まで受付
  if (hour < startRecruitment) {
    return false;
  }
  if (
    (60 - startBeforeLimitMinutes) % 60 > minute &&
    (wantTime - 1) % 24 === hour
  ) {
    return true;
  }

  // n-2時間前かつ12時以降なら無条件で受付
  if ((wantTime - 1) % 24 > hour) {
    return true;
  }
  return false;
}

export const toSHA256 = (text: string): string => {
  const hash = createHash("sha256");
  hash.update(text);
  return hash.digest("hex");
};

export const parseTimeRoleName = (time: number): string => {
  return `time:${toSHA256(time.toString())}`;
};

export const getTimeRoleTuples: () => [number, string][] = () => {
  const tuples: [number, string][] = [];
  startOclocks.forEach((time) => {
    tuples.push([time, parseTimeRoleName(time)]);
  });
  return tuples;
};

export function getTimeRoleName(time: number): string | null {
  if (!startOclocks.has(time)) {
    return null;
  }
  return parseTimeRoleName(time);
}

export function getRoleByName(
  roleName: string,
  guild: Guild
): Role | undefined {
  return guild.roles.cache.find((role) => role.name === roleName);
}

export function getAllTimeRoleNames(): string[] {
  const timeRoleNames: string[] = [];
  startOclocks.forEach((hour) => timeRoleNames.push(parseTimeRoleName(hour)));
  return timeRoleNames;
}

export async function getOrCreateRole(
  guild: Guild,
  roleName: string
): Promise<Role> {
  let role = guild.roles.cache.find((r) => r.name === roleName);
  if (!role) {
    try {
      role = await guild.roles.create({
        name: roleName,
        reason: "Bot による自動作成",
      });
      console.log(`ロール "${roleName}" を作成しました。`);
    } catch (error) {
      console.error(`ロール "${roleName}" の作成に失敗:`, error);
      throw new Error(`ロール "${roleName}" の作成に失敗しました。`);
    }
  }
  return role;
}

export function hasLeastRoleName(role: Role): boolean {
  // あるロールのメンバーが優先順位を最低にするロールを持っているか
  return role.members.some((member: GuildMember) =>
    member.roles.cache.some((r) => r.name === leastRoleName)
  );
}

export function returnRoleNameWithLeastTag(role: Role): string {
  return (
    role?.name ||
    "名前がありません" + (hasLeastRoleName(role) ? ` (${leastRoleName})` : "")
  );
}

export function checkHasAcceptRole(member: GuildMember): boolean {
  return member.roles.cache.some((r) => acceptRolls.includes(r.name));
}
