import Command from './Command';
import { exec, ExecException, spawn } from 'child_process';
import { Message, Channel } from 'discord.js';

export default class UpdateCommand extends Command {
    public help = "\nHelp for Update: \n To use command, enter !update and Alice will update on her own.";
    action(args: string[], message: Message): void {
        if (args[0] === "help") {
            message.reply(this.help);
            return;
        }

        if (this.isUnauthorized(message.member)) {
            message.reply("You are not authorized to use this. \n\nWho told you of this command? (ó﹏ò｡)");
            return;
        }

        message.reply("Alice will now update...");

        const pull = spawn('git', ['pull', 'origin', 'theonewhostands/ALC-4']);
        let success = false;
        let uptodate = false;

        pull.stdout.on('data', (data: any) => {
            console.log(`stdout: ${data}`);

            success = true;
            if(data.toString().toLowerCase().match('already up to date.')) {
                uptodate = true;
            }
        });
        pull.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
        pull.on('close', (code) => {
            console.log(`child process exited with code ${code}`);

            if (success) {
                if (uptodate) {
                    message.reply('Already up-to-date.\n\n ♪♪I woke up like this.♪♪ (ᇴ‿ฺᇴ)');
                } else {
                    setTimeout(() => {
                        process.exit();
                    }, 1000);

                    message.reply('Updated to the newest version. \n\nI feel new and refreshed. Thanks♪(･ω･)ﾉ ');
                }
            } else {
                message.reply('Cannot pull. \n\nApologies if this is inconvinient for you. ๐·°(৹˃̵﹏˂̵৹)°·๐');
            }
        });
    }
}