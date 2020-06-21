import Command from './classes/Command';
import { Client, Message } from 'discord.js';

import AssignCommand from './classes/Assign.command';
import GraduateCommand from './classes/Graduate.command';
import GreetCommand from './classes/Greet.command';
import PromoteCommand from './classes/Promote.command';
import ListCommand from './classes/List.command';
import UpdateCommand from './classes/Update.command';
import ContestCommand from './classes/Contest.command';

class CommandBus {
    public all: {[key: string]: Command} = {};
    public publicCommands: {[key: string]: Command} = {};

    public addHiddenCommand(commandName: string, command: Command) {
        this.all[commandName] = command;
    }

    public addPublicCommand(commandName: string, command: Command) {
        this.publicCommands[commandName] = command;
        this.all[commandName] = command;
    }

    public useCommand(commandName: string, args: Array<string>, message: Message) {
        try {
            this.all[commandName].action(args, message);
        } catch (e) {
            if (!e.message.includes("Cannot read property 'action' of undefined")) {
                console.log(e);
            }
            if(e.name === 'Authorization Error') {
                message.reply("You do no have permission to use that command.");
            }
            message.reply(`The command: { ${commandName} } is unavailable.`);
        }
    }
}

const commandBus = new CommandBus();

commandBus.addHiddenCommand('commands', new ListCommand);
commandBus.addHiddenCommand('graduate', new GraduateCommand);
commandBus.addHiddenCommand('update', new UpdateCommand);

commandBus.addPublicCommand('assign', new AssignCommand);
commandBus.addPublicCommand('greet', new GreetCommand);
commandBus.addPublicCommand('promote', new PromoteCommand);
commandBus.addPublicCommand('contest', new ContestCommand);

export {commandBus as CommandBus}