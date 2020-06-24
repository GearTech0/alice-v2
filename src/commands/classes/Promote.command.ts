import Command from "./Command";
import { Message, GuildMember } from "discord.js";

export default class PromoteCommand extends Command {
    private promotions: {[key: string]: string} = {};
    public help: string = "Help for 'Promotion Command': \nTo use command, please enter !promote (set <promotional information> or <user's displayname> or me) to view or set promotions\nCurrently, this feature will reset whenever I am shutdown."
    action(args: string[], message: Message): void {
        const guild = message.guild;
        const member = message.member;
        
        let argPart = args[0].split(' ');
        let cmd = argPart[0];

        switch(cmd) {
            case 'set':
                let promotep1 = args.splice(1).join(' ');
                let promotep2 = argPart.splice(1).join(' ');
                let promote = promotep2 + promotep1;

                this.promotions[member.displayName] = promote;
                message.reply('your promotional message has been set.')
                break;
            case 'help':
                message.reply(this.help);
                break;
            case 'me':
                args[0] = member.displayName;
            default:
                const target = guild.members.cache.find((guildMember: GuildMember) => guildMember.displayName == args[0]);
                if (!target) {
                    message.reply(`cannot find user by name ${args[0]}.`);
                    return;
                } 

                const promotion = this.promotions[args[0]];
                if (!promotion) {
                    message.reply('this user does not have any promotions set at this time.');
                    return;
                }

                message.reply(`\nPromotion for user { ${args[0]} }: \n${promotion}`);
                break;
        }
    }
}