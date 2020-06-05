import Command from "./Command";
import { Message } from "discord.js";

export default class GreetCommand extends Command {
    public help = "Help for 'Greet Command': no arguments are needed for this command.";
    action(args: string[], message: Message): void {
        try {
            args[0] = args[0].toLowerCase()
            if (args[0] === "help") {
                message.reply(this.help);
                return;
            }
        } catch (err) {
            message.reply("An error has occured. Please contact admin");
            console.error(err);
        }
        
        message.reply("hello :)");
    }
}