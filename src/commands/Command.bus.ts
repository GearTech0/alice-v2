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
            message.reply(`The command: { ${commandName} } is unavailable.`);
        }
    }
}

const commandBus = new CommandBus();

/**
 * Command: commands
 * Usage:
 * Permissions: All
 */
commandBus.addHiddenCommand('commands', new ListCommand);

/**
 * Command: graduate
 * Usage:
 * Permissions: Admin
 */
commandBus.addHiddenCommand('graduate', new GraduateCommand);

/**
 * Command: update
 * Usage:
 * Permissions: Admin
 */
commandBus.addHiddenCommand('update', new UpdateCommand);

/**
 * Command: assign
 * Usage:
 * Permissions: All (conditional)
 */
commandBus.addPublicCommand('assign', new AssignCommand);

/**
 * Command: greet
 * Usage: 
 * Permissions: All
 */
commandBus.addPublicCommand('greet', new GreetCommand);

/**
 * Command: promote
 * Usage: 
 * Permissions: All
 */
commandBus.addPublicCommand('promote', new PromoteCommand);

/**
 * Command: contest
 * Usage:
 * Permissions: Admin
 */
commandBus.addHiddenCommand('contest', new ContestCommand);

export {commandBus as CommandBus}