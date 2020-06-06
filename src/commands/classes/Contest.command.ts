import Command from './Command';
import { Message, Channel, TextChannel } from 'discord.js';
import fs from 'fs';
import drive from 'googleapis';
import path from 'path';
import validUrl from 'valid-url';
import { dataflow } from "googleapis/build/src/apis/dataflow";
import contestData from "../../../data/contestData.json";
import sampleFiles from "../../../templates/sampleFiles.json";

export default class ContestCommand extends Command {
  public help = "Available Sub-commands for '!Contest': \nStart \nAdd \nVote \nEnd \nReset \nHelp "


  // Initiate a contest, announcing it to channel
  // This should read through the google drive folder, and choose N sample files in the root folder and save choice somewhere to be used when viewing list
  // Files to be added prior to starting via !Contest add
  public start(args: Array<string>, message: Message): void{
    if(contestData.contestActive){
      message.reply(`There is already a Contest ongoing. \nCheck <#${contestData.contestChannelId}> to participate!`);
      return;
    }
    console.log("---Contest Creation Started---")
    let reacts = contestData.reactions;
    let failMes = "Failed to start contest, please try again or contact an Admin.";
    let chosenEntries = [];

    console.log("Starting Entry Selection");
    try {
      let files = sampleFiles; // Replace with file Retrieval from GDrive once available
      let pastEntrants = contestData.pastEntries;
      console.log("pastEntrants initialization:  "+pastEntrants+ "\nEntry 1: "+pastEntrants[0]+"\nEntry2:  "+pastEntrants[1]);
      
      
      let entryCount = 5;
      if(entryCount > reacts.length){  
        let err = new Error();
        err.name = "Reaction Limit Error";
        err.message = "Not enough reactions for chosen entry amount.";
        throw(err);
      }
      console.log("Reaction limit check passed");

      if(entryCount > files.length){
        let err = new Error();
        err.name = "Entrant Count Error";
        err.message = "Not enough aplicants for entries";
        throw(err);
      }
      console.log("Applicant count check passed");

      for (let x = 0; x < entryCount; ++x) {
        let id = Math.round(Math.random()*10000)%files.length;
        let fails= 0;
        let failTerm = 1000; //number of times to repick file before throwing error
        while(pastEntrants.includes(files[id]) ||  chosenEntries.includes(files[id])){ //check if chosen files is a past entrant or is already chosen
          id = Math.round(Math.random()*10000)%files.length;
          fails++;
          if(fails >= failTerm){
            let err = new Error();
            err.name = "Attempts Count Error"
            err.message = "No valid file found within "+fails+" attempts." ;
            throw(err);           
          }
        }
  
        chosenEntries.push(files[id]);
      }
    }  catch (e) {
      console.error("Error during contest entry selection!: "+ e);
      message.reply(failMes);
      return;
    }
    console.log("Successful");

    contestData.entries = chosenEntries;

    console.log("Writing data to file");
    
    fs.writeFileSync(path.join(__dirname,"../../../data/contestData.json"),JSON.stringify(contestData, null, 2),{ flag: 'w' });
    console.log("Contest Data successfully written to file.");
    
    console.log("Successful");


    console.log("Creating announcement string");
    let announcement = "\n:musical_note::musical_note:Its time for another contest!:musical_note::musical_note: ";
    announcement += "\nPlace your vote by clicking the corresponding reaction! \n"
    
    for(let x=0; x < contestData.entries.length; ++x){
      let entry=contestData.entries[x];
      announcement += `\n${reacts[x]} ${entry.name}\n${entry.url}\n`;
    }
    
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

    let reaction_numbers = ["\u0030\u20E3","\u0031\u20E3","\u0032\u20E3","\u0033\u20E3","\u0034\u20E3","\u0035\u20E3", "\u0036\u20E3","\u0037\u20E3","\u0038\u20E3","\u0039\u20E3"];
    channel.send(announcement).then(function (message: Message){
      contestData.messageId = message.id;
      for(let x=1; x <= contestData.entries.length; ++x){

        if(x <= 10){
          message.react(reaction_numbers[x]);
        }
        else{
          message.react(reacts[x-1]); 
        }
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
    try{
      fs.writeFileSync(path.join(__dirname,"../../../data/contestData.json"),JSON.stringify(contestData, null, 2),{ flag: 'w' });
      console.log("Contest Data successfully written to file.");
    }
    catch(e){
      console.error("Error writing Contest Data to file!: "+e);
      message.reply(failMes);
      return;
    }
    console.log("---Contest Successfully Started---");
    return;
    
  }

  // Add to a list of sample files to be used for Contest
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
  public end(args: Array<string>, message: Message): void{ //
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
          if(reacCount.length >= contestData.entries.length){ break; }
        }

        console.log("Determining winners");
        let winners = [];
        while(winners.length < 3){
          let max = 0;
          for(let x of reacCount){
            max = x > max ? x : max;
          }
          
          while(reacCount.includes(max)){
            let winner = {};
            let x = reacCount.indexOf(max);
            winner["emoji"] = reacEmoji[x];
            winner["count"] = reacCount[x];
            winner["file"] = files[x];
            files.splice(x,1);
            reacEmoji.splice(x,1);
            reacCount.splice(x,1);
            winners.push(winner);
          }

        }
        console.log("Successful");

        console.log("Creating announcement message");
        let announcement = "\nThe contest has ended and our winners are: "
        for(let x=0; x<winners.length; ++x){
          announcement += `\n${winners[x].count} votes:   [${winners[x].file.name}]  `;
          let urls = `\n${winners[x].file.url} `;
          while((x+1 < winners.length) && (winners[x].count == winners[x+1].count)){
            ++x;
            announcement += `and  [${winners[x].file.name}]  `;
            urls += `\n\n${winners[x].file.url} `;
          }
          announcement += urls+"\n";
      
        }
        announcement += "\n :tada:CONGRATULIONS:tada: \n\n Remember to upload your files before the next contest!";
        console.log('Successful');
        
        for(let x=0; x<winners.length; ++x){
          contestData.pastEntries.push(winners[x].file);
        }
        console.log("Writing contestData to file");
        contestData.contestActive = false;
        try{
          fs.writeFileSync(path.join(__dirname,"../../../data/contestData.json"),JSON.stringify(contestData, null, 2),{ flag: 'w' });
        }
        catch(e){
          console.error("Warning! Failure writing contest data to file after !contest end!: "+e);
        }
        console.log("Successful");

        contestChannel.send(announcement);

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
    contestData.pastEntries = [];
    try{
      fs.writeFileSync(path.join(__dirname,"../../../data/contestData.json"),JSON.stringify(contestData, null, 2),{ flag: 'w' });
    }
    catch(e){
      console.error("Warning! Failure writing contest data to file after !contest reset!: "+e);
    }
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