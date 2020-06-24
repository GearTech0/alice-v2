import * as Discord from 'discord.js';
import auth from '../secret/auth.json';
import Drive from './gdrive/Drive.gdrive';
import { GoogleAPIOAuth } from './gdrive/OAuth.gdrive';
import { CommandBus } from './commands/Command.bus';
import { map, concatAll } from 'rxjs/operators';
import { ReturnEnvelope } from './exports';

var bot = new Discord.Client();

bot.on("ready", () => {
    console.log('Connected');
    console.log('Logged in as: ');
    console.log(`${bot.user.username} - (${bot.user.id})`);
});

bot.on('message', (oMessage) => {
    let message = oMessage.content;
    if (message.substring(0, 1) == '!') {
        let args = message.split(' ');
        let cmd = args.shift();

        CommandBus.useCommand(cmd, args, oMessage);
    }
});

bot.login(auth.tokendev);
