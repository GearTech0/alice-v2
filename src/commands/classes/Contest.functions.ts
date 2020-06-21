import fs from 'fs';
import path from 'path';
import { Message, TextChannel, MessageEmbed, MessageAttachment } from 'discord.js';
import { ContestData, ContestFile, ContestConfig, BotConfig } from './exports';
import { table, getBorderCharacters } from 'table';
import { createDecipher } from 'crypto';


export function selectFiles(files: {[key: string]: ContestFile}, entryCount: number, message: Message): {[key: string]: ContestFile} {
    if(entryCount > Object.keys(files).length) {
        let err = new Error();
        err.name = "Sample Count Error";
        err.message = "Not enough samples to fill entry count.";
        message.reply("Failed to start contest, contact admin.");
        throw(err);
    }
    let serverId = message.guild.id;
    let peFile = path.join(__dirname, `../../../data/ContestData/${serverId}/pastSamples.json`);
    let pastEntrants: {[key: string]: ContestFile} = {};
    if(fs.existsSync(peFile)) {
        pastEntrants = JSON.parse(fs.readFileSync(peFile).toString());
        for(let uuid in pastEntrants) {
            delete files[uuid];
        }
    }
    if(Object.keys(files).length < entryCount) {
        console.log(`Not enough unused entries, pulling ${entryCount-Object.keys(files).length} from Past Entrants`);
        while(Object.keys(files).length < entryCount) {
            let uuid = Object.keys(pastEntrants)[0];
            files[uuid] = pastEntrants[uuid];
            delete pastEntrants[uuid];
        }
    }else {
        while(Object.keys(files).length > entryCount) {
            let fileCount = Object.keys(files).length
            let dif = fileCount - entryCount;
            let pos = Math.round(Math.random()*100000)%fileCount;
            let dfe = fileCount - pos;
            let num = 0;
            if( dif == 1 || dfe == 1){
                num = 1
            }else{
                num = Math.round(Math.random()*100000)%(dif >= dfe ? dfe : dif);
            }
            for(let x=0; x<num; ++x){
                let uuid = Object.keys(files)[pos+x];
                delete files[uuid];
            }
        }
    }
    return files;
}

export function checkAuthorization(message: Message) {
    if (message.member.hasPermission('ADMINISTRATOR')) {
        return;
    }

    let botConfig: BotConfig =  JSON.parse(fs.readFileSync(path.join(__dirname, "../../../data/bot.config.json")).toString());
    for (let role of botConfig.adminRoles) {
        if(message.member.roles.cache.has(role)) {
            return;
        }
    }

    let contestConfig: ContestConfig  = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../data/contest_data/contest.config.json")).toString());
    for (let x in contestConfig.contestAdminRoles) {
        if(message.member.roles.cache.has(contestConfig.contestAdminRoles[x])) {
            return;
        }
    }

    console.log("User does not have required authority for command.");
    let e = new Error('Authorization Error');
    e.message = 'User does not have required authorization level for command.';
	throw e;
}

export function validate(attachment: MessageAttachment) { // todo
    return;
}
export function upload(attachment: MessageAttachment) { // todo

}