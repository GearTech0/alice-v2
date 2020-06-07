import Command from "./Command";
import { Message, MessageEmbed } from "discord.js";
import drive from "googleapis";
import fs from "fs";
import path from 'path';
import validUrl from 'valid-url';
import { table, getBorderCharacters } from 'table';
import { dataflow } from "googleapis/build/src/apis/dataflow";

export default class ContestCommand extends Command {
  public help = "Available Sub-commands for '!Contest': \nStart \nAdd \nVote \nEnd \nHelp ";

  //initiate a contest, announcing it to channel and 
  //This should read through the google drive folder, and choose N sample files in the root folder and save choice somewhere to be used when viewing list
  //5 random samples from gdrive, added prior to starting
  public async start(args: Array<string>, message: Message): Promise<void>{
    try {
      let obj = {name:"Entry File", webLink: "www.com"};
  
      let files = [obj]//GDriveController.getFiles();
      let contestEntries = [obj];
      let pastEntrants = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../data/pastEntrants.json")).toString());
      
      for (let x = 0; x < 5; x++) {
        let id = Math.round(Math.random()*10000)%files.length;
        while(false /*check if file name matches any within pastEntrants*/){
          id = Math.round(Math.random()*10000)%files.length;
        }
  
        contestEntries[x] = files[id];
      }
      let announcement = "A contest has started! \nVote for your favourite with !Contest vote {entry number} \nEntrants: ";
      for (let x in contestEntries) {
        let y = parseInt(x);
        announcement += '\n'+ [y+1] +': '+ contestEntries[y].name + '\n'+ contestEntries[y].webLink + '\n'; //
      } 
      message.reply(announcement);
    }  catch (e) {

    } 
    //record entries
    return;
    
  }

  //add to a list of sample files to be used for Contest
  //can be added to at any time, sounds files to be stored in gdrive
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

  
  //add vote to selected file in running Contest
  public vote(args: Array<string>, message: Message): void{
    // add check for on going contest
    if (false) {
      return
    }

    let votes = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../data/votes.json")).toString());
    if(!args[0]){
      var voteList = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../data/votingList.json")).toString());

      let data: Array<[string, string, string]> = [];
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

      let cnt = [];
      for(let vote in votes){

        cnt[parseInt(votes[vote])-1] = (cnt[parseInt(votes[vote])]-1) ? cnt[parseInt(votes[vote])-1]+1 : 1;
      }

      for(let x in voteList.samples){
        data.push([`${parseInt(x)+1}`, `[${voteList.titles[x]}](${voteList.samples[x]})`, `${(cnt[x]) ? cnt[x] : 'no votes'}`]);
      }

      let tbl = table(data, config);
      message.reply({
        embed: new MessageEmbed()
          .addField("Contest", tbl)
      });
      return;
    }
    const user = message.member.user.id;
    const vote = args[0];
    if( !((parseInt(vote) <= 5) && (parseInt(vote) > 0) ) ) {message.reply("Invalid vote. Usage: !Contest vote {1-5}"); return}
    votes[user] = vote;
    
    fs.writeFileSync(path.join(__dirname,"../../../data/votes.json"),JSON.stringify(votes),{ flag: 'w' });
    message.reply("Vote Accepted");
    return;
  }

  //tally vote and announce winner of Contest
  //top 3 get move to unused entries folder to be reshuffled once all entries have been gone through
  public end(args: Array<string>, message: Message): void{ //
    
  }

  public helpAction(args: Array<string>, message: Message): void{
    message.reply(this.help);
    return;
  }


  public test(args: Array<string>, message: Message): void{ //remove on production
      console.log("Testing JSON import: ");
      return;
  }


  public action(args: Array<string>, message: Message): void{
    
    if(args[0] === undefined) { message.reply("Please enter Sub-command: ex '!Contest help'")}
    else
    {
      let func = args.shift().toLowerCase();
      if(func === "help") { func = "helpAction";}
      try{
          console.log("Initiating Command " + func);
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