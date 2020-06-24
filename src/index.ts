import * as Discord from 'discord.js';
import auth from '../secret/auth.json';
import Drive from './gdrive/Drive.gdrive';
import cluster from 'cluster';
import { GoogleAPIOAuth } from './gdrive/OAuth.gdrive';
import { CommandBus } from './commands/Command.bus';
import { map, concatAll } from 'rxjs/operators';
import { ReturnEnvelope } from './exports';
import { filePrep } from "./commands/classes/Bot.prep";

filePrep();
var bot = new Discord.Client();

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    cluster.fork();
    // Whenever a worker has dropped, spin it back up
    cluster.on('exit', (worker: cluster.Worker, code: number, signal: string) => {
        // spin up worker
        console.log("Worker is being restarted...");
        cluster.fork();
    });
} else {
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

    bot.on('disconnect', (event) => {
        
    });

    console.log(`Alice started in ${process.env.NODE_ENV} mode`);
    let runModes = ["production", "development"];
    try {
        switch(process.env.NODE_ENV) {
            case runModes[0]:
                bot.login(auth.token);
                break;
            case runModes[1]:
                bot.login(auth.tokendev);
                break;
            default:
                throw Error(`Run mode is not specified. Please append one of the following to the run command: ${runModes}`);
        }
    } catch (e) {
        console.error(e);
    }
}
