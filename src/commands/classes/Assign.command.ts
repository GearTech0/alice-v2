import Command from './Command';
import { Message, Client } from 'discord.js';

export default class AssignCommand extends Command {
    public help = "Help for 'Assign Command': \nTo use command, please enter !assign followed by a comma seperated list of roles you would like to assign for yourself.";
    public action(args: Array<string>, message: Message): void {
        if (args[0].toLowerCase() === "help") {
            message.reply(this.help);
            return;
        }

        const member = message.member;
        const guild = message.guild;
        let addedRoles = [];
        let duplicates = false;
        let extraMessages = [];

        let newRoles = [];
        let rejectedRoles = [];

        // Locally cache roles for faster lookup
        let roles = {};
        for (let role of guild.roles.cache) {
            roles[role[1].name.toLowerCase()] = role[1];
        }

        // Cache previous roles for member
        let prevRoles = member.roles;
        let prevRolesCache = {};
        for (let prevRole of prevRoles.cache) {
            prevRolesCache[prevRole[1].name.toLowerCase()] = prevRole[1];
            addedRoles.push(prevRole[1]);   // Keep previous roles
        }

        let rolenames: Array<string> = [];
        let bag: string = "";
        for (let str of args) {
            bag += str;
            
            if (bag.indexOf(',') !== -1) {
                bag.replace(',', '');
                rolenames.push(bag);

                bag = "";
            }
        }

        for (let roleName of rolenames) {

            try {
                let role = roles[roleName];

                // Check member's role to check if they can add this role
                if (prevRolesCache[roleName.toLowerCase()]) {
                    duplicates = true;
                    continue;
                }

                if (!role) {
                    throw `${roleName} is not a compatible role.`;
                }

                // Graduates cannot become students
                if (this.isUnauthorized(member)) {
                    message.reply("You are not allowed to use this command. If you think this is an error, please contact an admin.")
                    continue;
                }

                if (role.name !== 'Server Owner' && role.name !== 'Moderator') {
                    addedRoles.push(role);
                    newRoles.push(role);
                } else {
                    throw new Error("Role is incompatable with member");
                }
            } catch (e) {
                rejectedRoles.push(roleName);
            }
        }

        if (rejectedRoles.length !== 0) message.reply(`${rejectedRoles} have been rejected. Please see Moderator or Server Owner for issues.`);
        
        if (newRoles.length !== 0){
            message.reply(`[${newRoles.map((role) => " " + role.name)}] has been assigned to you.`);
            member.edit({roles: addedRoles});
        }
        
        if (duplicates){
            message.reply('it seems that you already have some of these roles. Please contact an admin if this does\'t sound correct.')
        }
    }
}