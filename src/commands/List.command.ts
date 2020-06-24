import Command from "./Command";
import { Message } from "discord.js";
import { CommandBus } from "./Command.bus";
import { GoogleAPIOAuth } from '../gdrive/OAuth.gdrive';
import Drive from "../gdrive/Drive.gdrive";
import { ReturnEnvelope } from "../exports";

export default class ListCommand extends Command {
    action(args: string[], message: Message): void {
        let stringList = '\nCurrent commands are as follows:\n';

        for(const command in CommandBus.publicCommands) {
            stringList += `\t\t!${command}\n`;
        }

        let drive = new Drive();
        drive.list(GoogleAPIOAuth, '1Q6VhNhjiWhDgXZOUCSvPFCut5HLLngvf')
            .subscribe({
                next: (value: ReturnEnvelope) => {
                    console.log('Obtained: ', value.data);
                }
            });

        stringList += 'Please append "help" to any command to get a description on usage';
        message.reply(stringList);
    }
}