import Command from './Command';
import AssignCommand from './Assign.command';
import { Client, Message } from 'discord.js';
import GraduateCommand from './Graduate.command';
import GreetCommand from './Greet.command';
import PromoteCommand from './Promote.command';
import ContestCommand from './Contest.command';
import ListCommand from './List.command';

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
            console.log(e);
            message.reply(`The command: { ${commandName} } is unavailable.`)
        }
    }
}

const commandBus = new CommandBus();

commandBus.addHiddenCommand('commands', new ListCommand);
commandBus.addHiddenCommand('graduate', new GraduateCommand);
commandBus.addPublicCommand('assign', new AssignCommand);
commandBus.addPublicCommand('greet', new GreetCommand);
commandBus.addPublicCommand('promote', new PromoteCommand);
commandBus.addPublicCommand('contest', new ContestCommand);

export {commandBus as CommandBus}