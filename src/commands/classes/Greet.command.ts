import Command from "./Command";
import { Message } from "discord.js";

export default class GreetCommand extends Command {
    public help = "Help for 'Greet Command': no arguments are needed for this command.";
    action(args: string[], message: Message): void {
        if (args[0].toLowerCase() === "help") {
            message.reply(this.help);
            return;
        }
        message.reply("hello :)");
    }
}