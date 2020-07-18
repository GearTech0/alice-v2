import Command from './Command';
import fs from 'fs';
import path from 'path';
import validUrl from 'valid-url';
import Drive from '../../googleapis/Drive.gdrive';
import GoogleAuth from '../../googleapis/OAuth.gdrive';
import BotConfig from '../../../bot.config.json';
import { ContestData, ContestFile } from './exports';
import { Message, TextChannel, MessageEmbed } from 'discord.js';
import { table, getBorderCharacters } from 'table';
import { ReturnEnvelope } from '../../exports';
import { map, concatAll } from 'rxjs/operators';
import { Observable, forkJoin } from 'rxjs';

export default class ContestCommand extends Command {
  public readonly HELP_MESSAGE = "Available Sub-commands for '!contest': \nstart \nadd \nvote \nend \nreset \nhelp";

  private readonly CONTEST_DATA_FILE = '../../../data/contestData.json';
  private readonly VOTING_LIST_FILE = '../../../data/votingList.json';

  // Initiate a contest, announcing it to channel
  // This should read through the google drive folder, and choose N sample files in the root folder and save choice somewhere to be used when viewing list
  // Files to be added prior to starting via !Contest add
  public start(args: Array<string>, message: Message): void {
    let contestData: ContestData = JSON.parse(fs.readFileSync(path.join(__dirname, this.CONTEST_DATA_FILE)).toString());
    if (contestData.contestActive) {
      message.reply(`There is already an ongoing contest. \nCheck <#${contestData.contestChannelId}> to participate!`);
      return;
    }
    let reacts = contestData.reactions;

    let gDrive = new Drive(); // initialize GDrive object
    gDrive.list(GoogleAuth.authClient, BotConfig.DriveFileID) // Pull files from GDrive
      .pipe(
        map((obsList: Array<Observable<ReturnEnvelope>>) => forkJoin(obsList)),
        concatAll(),
        map((envList: Array<ReturnEnvelope>) => {
          let filesObject: {[key: string]: ContestFile} = {};
          for (const envelope of envList) {
            filesObject[envelope.data.id] = envelope.data;
          }
          return {
            data: filesObject
          }
        })
      )
      .subscribe({
        next: (value: ReturnEnvelope) => {
          
          let channel;
          channel = message.guild.channels.cache.find(channel => channel.name === contestData.contestChannelName);
          if (channel == undefined) {
            console.log('Error! Could not find contest channel named!: ' + contestData.contestChannelName);
            message.reply('Server contests channel not found, contact Admin');
            return;
          }

          let files: {[key: string]: ContestFile} = value.data;
          let pastEntrants = contestData.pastEntries;
          let submissions = 5;
      
          var count = args.shift();
          submissions = count != undefined ? parseInt(count) : submissions;
          if (submissions < 3) {
            message.reply('You need at least 3 submissions to start a contest.');
            return;
          }

          if (submissions > Object.keys(files).length) {
            message.reply('Not enough aplicants to fill submission count.');
            return;
          }
      
          for (let uuid in pastEntrants) {
            delete files[uuid];
          }

          if (Object.keys(files).length < submissions) {
            for (let i = 0; Object.keys(files).length < submissions; i++) {
              let uuid = Object.keys(pastEntrants)[i];
              files[uuid] = pastEntrants[uuid];
            }
          }
          else {
            let pickedFiles: {[key: string]: ContestFile} = {};
            for (let i = 0; i < submissions; i++) {
              let fileCount = Object.keys(files).length
              let uuid = Object.keys(files)[Math.round(Math.random() * 100000) % fileCount];

              pickedFiles[uuid] = files[uuid];
              delete files[uuid];
            }
            files = pickedFiles;
          }
      
          contestData.entries = files;
          contestData.contestActive = true;
          fs.writeFileSync(path.join(__dirname, this.CONTEST_DATA_FILE), JSON.stringify(contestData, null, 2), { flag: 'w' });    
      
          let announcement = '\n:musical_note::musical_note:Its time for another contest!:musical_note::musical_note: ';
          announcement += '\nPlace your vote by clicking the corresponding reaction! \n';
          
          let mEmbed = this.createContestStartAnnouncement(contestData);

          channel.send(announcement, {embed: mEmbed}).then(async (message: Message) => {
            
            contestData.messageId = message.id;
          
            for (let i = 0; i < submissions; ++i) {
              await message.react(Object.values(reacts)[i] as any);
            }
            
            contestData.contestChannelId = message.channel.id;
            fs.writeFileSync(path.join(__dirname, this.CONTEST_DATA_FILE), JSON.stringify(contestData, null, 2), { flag: 'w' });
          })
          .catch((e: Error) => console.log(e));

          message.reply('Contest has been started!');
          return;
        }
      });
    
  }

  // Add sample file to GDrive to be used for Contest
  // Can be used at any time
  public add(args: Array<string>, message: Message): void {
    
    let contestSamples = {samples: []};
    
    //check that there is any previous data
    let data = fs.readFileSync(path.join(__dirname, this.VOTING_LIST_FILE));
    if (data) {
      contestSamples = JSON.parse(data.toString());
    }

    let url = args.join(' ');
    if (validUrl.isUri(url)) {
      contestSamples.samples.push(url);
      fs.writeFileSync(path.join(__dirname, this.VOTING_LIST_FILE), JSON.stringify(contestSamples), { flag: 'w' });

      message.reply(`${url} has been added to the voting list. (◕‿◕✿)`)
    }
    else {
      message.reply('This is not a valid URL. Sorry. ༼☯﹏☯༽ \n\nIf you think this is an error, please let a Moderator or the Server Owner know.');
    }
  }

  // Tally vote and announce top 3(can be more in case of ties) as winners of Contest
  // Winners get saved as Past Entries to be excluded from applicant pool in future contests
  public end(args: Array<string>, message: Message): void { 
    let contestData: ContestData = JSON.parse(fs.readFileSync(path.join(__dirname, this.CONTEST_DATA_FILE)).toString());
    if (contestData.contestActive) {
      let reaction_numbers = ['\u0030\u20E3','\u0031\u20E3','\u0032\u20E3','\u0033\u20E3','\u0034\u20E3','\u0035\u20E3', '\u0036\u20E3','\u0037\u20E3','\u0038\u20E3','\u0039\u20E3'];
      let files = contestData.entries;
      let contestChannel = message.guild.channels.cache.find((channel) => channel.name === contestData.contestChannelName) as TextChannel;
      
      contestChannel.messages.fetch(contestData.messageId).then(contestMessage => {
        
        let reactions = contestMessage.reactions.cache;
        let reacEmoji = [];
        let reacCount = [];
        for (let reaction of reactions) {
          reacEmoji.push(reaction[1].emoji);
          reacCount.push(reaction[1].count);
          if (reacCount.length >= Object.keys(files).length){ break; }
        }

        // Determining winners
        let winners = [];
        while (winners.length < 3 && (winners.length < reacCount.length)) {
          let max = 0;
          for (let i of reacCount) {
            max = i > max ? i : max;
          }
          
          while (reacCount.includes(max)) {
            let winner = {};
            let i = reacCount.indexOf(max);
            winner['emoji'] = reacEmoji[i];
            winner['votes'] = reacCount[i];
            let fileUUID = Object.keys(files)[i];
            winner['file'] = Object.assign(new Object, files[fileUUID]);
            winner['UUID'] = fileUUID;
            delete files[fileUUID];
            reacEmoji.splice(i, 1);
            reacCount.splice(i, 1);
            winners.push(winner);
          }

        }

        // Creating announcement message
        let places = ['1st Place', '2nd Place', '3rd Place'];
        let mEmbed = new MessageEmbed();
        let announcement = '\nThe contest has ended and our winners are: '
        for (let i = 0; i < winners.length; ++i) {
          let names = '';
          let place = places[i];
          names += `[${winners[i].file.name}](${winners[i].file.url})\n`;

          while (i + 1 < winners.length && winners[i].votes == winners[i + 1].votes) {
            ++i;
            names += `[${winners[i].file.name}](${winners[i].file.url})\n`;
          }
          mEmbed.addField(`${place} | ${winners[i].votes} votes`, names);
      
        }
        mEmbed.addField(':tada:CONGRATULATIONS:tada:', '\nLook forward to our next contest!');
        
        for (let i = 0; i < winners.length; ++i) {
          contestData.pastEntries[winners[i].UUID] = Object.assign(new Object, winners[i].file);
        }
        contestData.contestActive = false;

        fs.writeFileSync(path.join(__dirname,this.CONTEST_DATA_FILE), JSON.stringify(contestData, null, 2),{ flag: 'w' });

        contestChannel.send(announcement, {embed: mEmbed});
      })
      .catch(e => console.info(e));
    }
    else {
      message.reply('There is not an active contest.');
    }
    
    return;
  }

  public helpAction(args: Array<string>, message: Message): void {
    message.reply(this.HELP_MESSAGE);
    return;
  }

  // Clear Past Entrants data to add them back to applicant pool
  public reset() {
    let contestData = JSON.parse(fs.readFileSync(path.join(__dirname, this.CONTEST_DATA_FILE)).toString());
    console.log('Clearing Past Entrant records');
    for (let entry in contestData.pastEntries){
      delete contestData.pastEntries[entry];
    }
    try{
      fs.writeFileSync(path.join(__dirname, this.CONTEST_DATA_FILE), JSON.stringify(contestData, null, 2),{ flag: 'w' });
    }
    catch(e){
      console.error('Warning! Failure writing contest data to file after !contest reset!: ' + e);
      return;
    }
    return;
  }

  public action(args: Array<string>, message: Message): void {
    
    if (args[0] === undefined) {
      message.reply("Please enter Sub-command: ex '!contest help'")
    }
    else {
      let func = args.shift().toLowerCase();
      if (func === 'help') { func = 'helpAction';}
      try {
          this[func](args, message);
      }
      catch (Error) {
          if (Error.name === 'TypeError') { 
            message.reply('Invalid sub-command. Please use "!contest help" for list of sub-commands.');
          } 
          else {
            console.error(`${Error.name}: ${Error.message}`); 
          }
      }
    }
    return;
  }

  private createContestStartAnnouncement(contestData: ContestData): MessageEmbed{
    let config = {
      border: getBorderCharacters('void'),
      columnDefault: {
        paddingLeft: 0,
        paddingRight: 1
      },
      drawHorizontalLine: () => {
        return false;
      }
    };

    let data: Array<[string, string]> = [];
    let i = 0;
    for (let entry of Object.values(contestData.entries)) {
      data.push([`${Object.keys(contestData.reactions)[i]}`, `[${entry.name}](${entry.shortlink ? entry.shortlink : entry.webContentLink})\n`]);
      ++i;
    }
      
    let tbl = table(data, config);
    return new MessageEmbed().addField('Contest Submissions', tbl);
  }
}