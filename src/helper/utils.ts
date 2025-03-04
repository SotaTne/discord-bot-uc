import { Guild, Role, GuildMember } from "discord.js";
import { isCreatedAndIsAtTimeRole } from "./role-name-helper.js";

// 挙手受付可能な時間帯（24時間制）
export const startOclocks = new Set([12, 21, 22, 23]); // デフォルトは[ 21, 22, 23]
export const startRecruitment = 11; // デフォルトは12
export const acceptRolls: Set<string> = new Set([
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
]);
export const leastRoleName = "試合数5";
export const startBeforeLimitMinutes = 10; //デフォルトは7
export const roleHeader = "time:";

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
  console.log((60 - startBeforeLimitMinutes) % 60 > minute);
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

export function getRoleByName(
  roleName: string,
  guild: Guild
): Role | undefined {
  for (const role of guild.roles.cache.values()) {
    if (role.name === roleName) {
      return role;
    }
  }
  return undefined;
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
  // メンバー情報が取得できたら、最小ロールを持っているか確認
  const members = role.members.values();
  let flag = false;
  for (const member of members) {
    for (const r of member.roles.cache.values()) {
      if (r.name === leastRoleName) {
        flag = true;
      }
    }
  }
  return flag;
}

export function returnRoleNameWithLeastTag(role: Role): string {
  const hasLeastRole = hasLeastRoleName(role);
  return role.name + (hasLeastRole ? ` (${leastRoleName})` : "");
}

export function checkHasAcceptRole(member: GuildMember): boolean {
  let flag = false;
  for (const role of member.roles.cache.values()) {
    if (acceptRolls.has(role.name)) {
      flag = true;
    }
  }
  return flag;
}

export async function getAllRoleByTargetTime(
  targetTime: number,
  guild: Guild
): Promise<Role[]> {
  if (!startOclocks.has(targetTime)) {
    return [];
  }
  const roles: Set<Role> = new Set();
  for (const role of guild.roles.cache.values()) {
    if (isCreatedAndIsAtTimeRole(role.name, targetTime)) {
      roles.add(role);
    }
  }
  return Array.from(roles);
}

export async function getTimeRolesTuple(
  guild: Guild
): Promise<[number, Role[]][]> {
  const tuple: [number, Role[]][] = [];
  for (const time of startOclocks) {
    const roles = await getAllRoleByTargetTime(time, guild);
    tuple.push([time, roles]);
  }
  return tuple;
}
