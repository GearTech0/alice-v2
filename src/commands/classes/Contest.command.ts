import Command from './Command';
import { Message, TextChannel, MessageEmbed } from 'discord.js';
import fs from 'fs';
import drive from 'googleapis';
import path from 'path';
import validUrl from 'valid-url';
import { table, getBorderCharacters } from 'table';
import { dataflow } from "googleapis/build/src/apis/dataflow";

export default class ContestCommand extends Command {
  public help = "Available Sub-commands for '!Contest': \nStart \nAdd \nVote \nEnd \nReset \nHelp "


  // Initiate a contest, announcing it to channel
  // This should read through the google drive folder, and choose N sample files in the root folder and save choice somewhere to be used when viewing list
  // Files to be added prior to starting via !Contest add
  public start(args: Array<string>, message: Message): void{
    let contestData = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../data/contestData.json")).toString());
    if(contestData.contestActive){
      message.reply(`There is already a Contest ongoing. \nCheck <#${contestData.contestChannelId}> to participate!`);
      return;
    }
    console.log("---Contest Creation Started---")
    let reacts = contestData.reactions;
    let failMes = "Failed to start contest, please try again or contact an Admin.";
    let files: {[key:string]:any} = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../templates/sampleFiles.json")).toString()); // Replace with file Retrieval from GDrive once available
    let pastEntrants = contestData.pastEntries;
    let entryCount;
    let config = { //  config for Embed table formatting
      border: getBorderCharacters('void'),
      columnDefault: {
        paddingLeft: 0,
        paddingRight: 1
      },
      drawHorizontalLine: () => {
        return false;
      }
    };


    try{
      let count = args.shift();
      console.log("count: "+count);
      if(!count) {throw(new Error);}
      entryCount = parseInt(count);
      if(entryCount < 3){
        console.log("Entry count must be 3 or more.");
        throw new Error;
      }
      console.log("entryCount:  "+entryCount);
    }
    catch(e){
      console.log("Argument for entry count is invalid or not provided, leaving as default value.");
      entryCount = 5;
    }

    console.log("Starting Entry Selection");

    if(entryCount > Object.keys(reacts).length){  
      let err = new Error();
      err.name = "Reaction Limit Error";
      err.message = "Not enough reactions for chosen entry amount.";
      throw(err);
    }
    console.log("Reaction limit check passed");

    //console.log("Sample Files: "+Object.keys(sampleFilesList).length);
    console.log("Current Applicant count: "+Object.keys(files).length);
    console.log("Current Past Entry count: " + Object.keys(pastEntrants).length);
    if(entryCount > Object.keys(files).length){
      let err = new Error();
      err.name = "Entrant Count Error";
      err.message = "Not enough aplicants to fill entry count.";
      throw(err);
    }
    console.log("Applicant count check passed");


    for(let uuid in pastEntrants){
      delete files[uuid];
    }
    if(Object.keys(files).length < entryCount){
      console.log(`Not enough unused entries, pulling ${entryCount-Object.keys(files).length} from Past Entrants`);
      while(Object.keys(files).length < entryCount){
        let uuid = Object.keys(pastEntrants)[0];
        files[uuid] = pastEntrants[uuid];
        delete pastEntrants[uuid];
      }
    }else{
      while(Object.keys(files).length > entryCount){
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
    console.log("Entrant Selection Successful");

    contestData.entries = files;
    console.log(files);

    console.log("Writing data to file");
    
    fs.writeFileSync(path.join(__dirname,"../../../data/contestData.json"),JSON.stringify(contestData, null, 2),{ flag: 'w' });    
    console.log("Successful");


    console.log("Creating announcement string");
    let announcement = "\n:musical_note::musical_note:Its time for another contest!:musical_note::musical_note: ";
    announcement += "\nPlace your vote by clicking the corresponding reaction! \n"
    
    let data: Array<[string, string]> = [];
    let y = 0;
    for(let entry of Object.values(contestData.entries)){//(let x=0; x < contestData.entries.length; ++x){
      //let entry = contestData.entries[uuid];
      data.push([`${Object.keys(reacts)[y]}`, `[${(<any>entry).name}](${(<any>entry).url})\n`]);
      ++y;
    }
    let tbl = table(data, config);
    let mEmbed = new MessageEmbed().addField("Contest Entries", tbl);
    
    console.log("Successful");

    console.log("Determining Server 'contests' channel");
    let channel;
    try {
      channel = message.guild.channels.cache.find(channel => channel.name === contestData.contestChannelName);
    } catch (e) {
      console.error("Error! Could not find contest channel!: "+e);
      message.reply("Server contests channel not found, contact Admin");
      return;
    }
    console.log("Successful");

    console.log("Sending announcement");

    let reaction_numbers = ["\u0030\u20E3","\u0031\u20E3","\u0032\u20E3","\u0033\u20E3","\u0034\u20E3","\u0035\u20E3", "\u0036\u20E3","\u0037\u20E3","\u0038\u20E3","\u0039\u20E3", "\uD83D\uDD1F"];  // 0 - 10
    channel.send(announcement, {embed: mEmbed}).then(async function (message: Message){
      
      contestData.messageId = message.id;
    
      for(let x =0; x < entryCount; ++x){
        await message.react(Object.values(reacts)[x] as any);
      }
      
      contestData.contestChannelId = message.channel.id;
      fs.writeFileSync(path.join(__dirname,"../../../data/contestData.json"),JSON.stringify(contestData, null, 2),{ flag: 'w' });
      return;
    }).catch(function (e){
      console.error("Error creating contest message!"+e);
      return;
    });
    console.log("Successful");

    contestData.contestActive = true;
    console.log("Writing data to file");
    fs.writeFileSync(path.join(__dirname,"../../../data/contestData.json"),JSON.stringify(contestData, null, 2),{ flag: 'w' });
    console.log("Contest Data successfully written to file.");

    console.log("---Contest Successfully Started---");
    return;
    
  }

  // Add sample file o GDrive to be used for Contest
  // Can be added to at any time, sounds files to be stored in gdrive
  public add(args: Array<string>, message: Message): void{
    
    let contestSamples = {samples: []};
    
    try {
      //check that there is any previous data
      let data = fs.readFileSync(path.join(__dirname, '../../../data/votingList.json'));
      if (data) {
        contestSamples = JSON.parse(data.toString());
      }
    } catch (e) {

    } finally {
      let url = args.join(' ');
      if (validUrl.isUri(url)) {
        contestSamples.samples.push(url);
        fs.writeFileSync(path.join(__dirname, '../../../data/votingList.json'), JSON.stringify(contestSamples), { flag: 'w' });
  
        message.reply(`${url} has been added to the voting list. (◕‿◕✿)`)
      } else {
        message.reply('This is not a valid URL. Sorry. ༼☯﹏☯༽ \n\nIf you think this is an error, please let a Moderator or the Server Owner know.');
        console.error(`ERROR: ${url} is not a valid url`);
      }
    }

  }

  // Tally vote and announce top 3(can be more in case of ties) as winners of Contest
  // Winners get saved as Past Entries to be excluded from applicant pool in future contests
  public end(args: Array<string>, message: Message): void{ 
    let contestData = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../data/contestData.json")).toString());
    if(contestData.contestActive){
      console.log("---Ending Contest---");
      let reaction_numbers = ["\u0030\u20E3","\u0031\u20E3","\u0032\u20E3","\u0033\u20E3","\u0034\u20E3","\u0035\u20E3", "\u0036\u20E3","\u0037\u20E3","\u0038\u20E3","\u0039\u20E3"];
      let files = contestData.entries;
      console.log("Determining contest channel");
      let contestChannel = message.guild.channels.cache.find((channel) => channel.name === contestData.contestChannelName) as TextChannel;
      console.log("Successful");
      
      console.log("Determining Contest origin message");
      contestChannel.messages.fetch(contestData.messageId).then(contestMessage => {
        
        let reactions = contestMessage.reactions.cache;
        console.log("Successful");
        let reacEmoji = [];
        let reacCount = [];
        for (let reaction of reactions){
          reacEmoji.push(reaction[1].emoji);
          reacCount.push(reaction[1].count);
          if(reacCount.length >= Object.keys(files).length){ break; }
        }

        console.log("Determining winners");
        let winners = [];
        while(winners.length < 3 && (winners.length < reacCount.length)){
          let max = 0;
          for(let x of reacCount){
            max = x > max ? x : max;
          }
          
          while(reacCount.includes(max)){
            let winner = {};
            let x = reacCount.indexOf(max);
            winner["emoji"] = reacEmoji[x];
            winner["votes"] = reacCount[x];
            let fileUUID = Object.keys(files)[x];
            winner["file"] = Object.assign(new Object, files[fileUUID]);
            winner["UUID"] = fileUUID;
            delete files[fileUUID];
            reacEmoji.splice(x,1);
            reacCount.splice(x,1);
            winners.push(winner);
          }

        }
        console.log("Successful");

        console.log("Creating announcement message");
        let places = ["1st Place", "2nd Place", "3rd Place"];
        let mEmbed = new MessageEmbed();
        let announcement = "\nThe contest has ended and our winners are: "
        for(let x=0; x<winners.length; ++x){
          //announcement += `\n${winners[x].votes} votes:   [${winners[x].file.name}]  `;
          let names = "";
          let place = places[x];
          names += `[${winners[x].file.name}](${winners[x].file.url})\n`;
          //let urls = `\n${winners[x].file.url} `;
          while((x+1 < winners.length) && (winners[x].votes == winners[x+1].votes)){
            ++x;
            names += `[${winners[x].file.name}](${winners[x].file.url})\n`;
            //announcement += `and  [${winners[x].file.name}]  `;
            //urls += `\n\n${winners[x].file.url} `;
          }
          //announcement += urls+"\n";
          mEmbed.addField(`${place} | ${winners[x].votes} votes`, names);
      
        }
        mEmbed.addField(":tada:CONGRATULIONS:tada:", "\nRemember to upload your files before the next contest!");
        //announcement += "\n :tada:CONGRATULIONS:tada: \n\n Remember to upload your files before the next contest!";
        console.log('Successful');
        
        for(let x=0; x<winners.length; ++x){

          contestData.pastEntries[winners[x].UUID] = Object.assign(new Object, winners[x].file);
        }
        console.log("Writing contestData to file");
        contestData.contestActive = false;
        fs.writeFileSync(path.join(__dirname,"../../../data/contestData.json"),JSON.stringify(contestData, null, 2),{ flag: 'w' });
        console.log("Successful");

        contestChannel.send(announcement, {embed: mEmbed});

        console.log("Contest has been Ended");
        return;
      }).catch(e => {
        console.error("Contest End Failed: "+e);
        return;
      });
    }
    else{
      console.log("No contest to end.");
      message.reply("There is not an active contest.");
    }
    
    return;
  }

  public helpAction(args: Array<string>, message: Message): void{
    message.reply(this.help);
    return;
  }

  // Clear Past Entrants data to add them back to applicant pool
  public reset(){
    let contestData = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../data/contestData.json")).toString());
    console.log("Clearing Past Entrant records");
    for( let entry in contestData.pastEntries){
      delete contestData.pastEntries[entry];
    }
    try{
      fs.writeFileSync(path.join(__dirname,"../../../data/contestData.json"),JSON.stringify(contestData, null, 2),{ flag: 'w' });
    }
    catch(e){
      console.error("Warning! Failure writing contest data to file after !contest reset!: "+e);
      return;
    }
    return;
  }

  public action(args: Array<string>, message: Message): void{
    
    if(args[0] === undefined) { message.reply("Please enter Sub-command: ex '!Contest help'")}
    else
    {
      let func = args.shift().toLowerCase();
      if(func === "help") { func = "helpAction";}
      try{
          this[func](args, message);
      }
      catch (Error) {
          if (Error.name === 'TypeError') { 
            console.error("Invalid Command"); console.error(Error.name+": " + Error.message); 
            message.reply("Invalid Sub-command. Please refer to !Contest help for list of Sub-commands and their use.");
          } 
            else {console.error(Error.name+": " + Error.message); }
          }
    }
    return;
  }

  
}