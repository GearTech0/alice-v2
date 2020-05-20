import { Message, Client, GuildMember } from "discord.js";

export default abstract class Command {
    public name: string;
    public help: string;

    protected checkAdmin(guildMember: GuildMember): boolean {
        const roles = guildMember.roles;
        let memberRolesCache = {};
        for (let role of roles.cache) {
            memberRolesCache[role[1].name] = role[1];
        }
        return !memberRolesCache['Server Owner'] && !memberRolesCache['Moderator'];
    }

    abstract action(args: Array<string>, message: Message): void;
}