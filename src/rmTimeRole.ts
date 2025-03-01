import { Guild } from "discord.js";

export async function rmTimeRole({
  guild,
  rollNames,
}: {
  guild: Guild;
  rollNames: string[];
}) {
  const roles = guild.roles.cache.filter((role) =>
    rollNames.includes(role.name)
  );
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
