import { Guild } from "discord.js";
import { isCreatedRole } from "./role-name-helper.js";

export async function rmTimeRole({ guild }: { guild: Guild }) {
  const roles = guild.roles.cache.filter((role) => isCreatedRole(role.name));
  await Promise.all(
    roles.map(async (role) => {
      try {
        await role.delete();
      } catch (error) {
        console.error(`Failed to remove ${role.name}:`, error);
        throw new Error(`Failed to remove ${role.name}`);
      }
    })
  );
  return Array.from(roles.values());
}
