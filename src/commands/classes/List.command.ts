import Command from "./Command";
import { Message } from "discord.js";
import { CommandBus } from "../Command.bus";

export default class ListCommand extends Command {
    action(args: string[], message: Message): void {
        let stringList = '\nCurrent commands are as follows:\n';

        if (this.isUnauthorized(message.member)){
            for(const command in CommandBus.all){
                stringList += `\t\t!${command}\n`;
            }
        }
        else{
            for(const command in CommandBus.publicCommands) {
                stringList += `\t\t!${command}\n`;
            }
        }

        stringList += 'Please append "help" to any command to get a description on usage';
        message.reply(stringList);
    }
}