import * as Discord from 'discord.js';
import auth from '../secret/auth.json';
import { CommandBus } from './commands/Command.bus';

var bot = new Discord.Client();

bot.on("ready", () => {
    console.log('Connected');
    console.log('Logged in as: ');
    console.log(`${bot.user.username} - (${bot.user.id})`);
});

bot.on('message', (oMessage) => {
    let message = oMessage.content;
    if (message.substring(0, 1) == '!') {
        let args = message.substring(1).split(' ')
        let cmd = args.shift();
        
        CommandBus.useCommand(cmd, args, oMessage);
    }
});

bot.login(auth.token);
