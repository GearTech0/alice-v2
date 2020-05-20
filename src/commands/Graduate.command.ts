import { Message, Role } from "discord.js";
import Command from "./Command";

export default class GraduateCommand extends Command {
    public help = "";
    public action(args: Array<string>, message: Message) {
        // Check for permissions
        const member = message.member;
        const guild = message.guild;
        const roles = member.roles;

        if (this.checkAdmin(member)) return;

        const guildRoles = guild.roles;
        let rolesCache = {};
        for (let role of guildRoles.cache) {
            rolesCache[role[1].name] = role[1];
        }
        let studentRole: Role = rolesCache['Student'];
        console.log(studentRole);
        const membersOfRole = studentRole.members;
        for (let memberCollection of membersOfRole) {
            const member = memberCollection[1];
            let addedRoles = [];

            let prevRoles = member.roles;
            let prevRolesCache = {};
            for (let prevRole of prevRoles.cache) {
                if (prevRole[1].name === "Student") {
                    continue;
                }
                prevRolesCache[prevRole[1].name.toLowerCase()] = prevRole[1];
                addedRoles.push(prevRole[1]);
            }

            addedRoles.push(rolesCache['Graduate']);
            message.channel.send(`Congratulations, ${member.user}, on graduating! Your role has been updated to reflect this awesome achievment!`);
            member.edit({roles: addedRoles});
        }
    }
}