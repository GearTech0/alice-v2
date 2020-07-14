import Command from './classes/Command';
import { Client, Message } from 'discord.js';

import AssignCommand from './classes/Assign.command';
import GraduateCommand from './classes/Graduate.command';
import GreetCommand from './classes/Greet.command';
import PromoteCommand from './classes/Promote.command';
import ListCommand from './classes/List.command';
import UpdateCommand from './classes/Update.command';
import ContestCommand from './classes/Contest.command';

export default class CommandBus {
    public static all: {[key: string]: Command} = {};
    public static publicCommands: {[key: string]: Command} = {};

    public static AddHiddenCommand(commandName: string, command: Command) {
        this.all[commandName] = command;
    }

    public static AddPublicCommand(commandName: string, command: Command) {
        this.publicCommands[commandName] = command;
        this.all[commandName] = command;
    }

    public static UseCommand(commandName: string, args: Array<string>, message: Message) {
        try {
            console.log(commandName);
            this.all[commandName].action(args, message);
        } catch (e) {
            if (!e.message.includes("Cannot read property 'action' of undefined")) {
                console.log(e);
            }
            message.reply(`The command: { ${commandName} } is unavailable.\nTo see the list of available commands use !list`);
        }
    }
}

/**
 * Command: list
 * Usage:
 * Permissions: All
 */
CommandBus.AddHiddenCommand('list', new ListCommand);

/**
 * Command: graduate
 * Usage:
 * Permissions: Admin
 */
CommandBus.AddHiddenCommand('graduate', new GraduateCommand);

/**
 * Command: update
 * Usage:
 * Permissions: Admin
 */
CommandBus.AddHiddenCommand('update', new UpdateCommand);

/**
 * Command: assign
 * Usage:
 * Permissions: All (conditional)
 */
CommandBus.AddPublicCommand('assign', new AssignCommand);

/**
 * Command: greet
 * Usage: 
 * Permissions: All
 */
CommandBus.AddPublicCommand('greet', new GreetCommand);

/**
 * Command: promote
 * Usage: 
 * Permissions: All
 */
CommandBus.AddPublicCommand('promote', new PromoteCommand);

/**
 * Command: contest
 * Usage:
 * Permissions: Admin
 */
CommandBus.AddHiddenCommand('contest', new ContestCommand);
