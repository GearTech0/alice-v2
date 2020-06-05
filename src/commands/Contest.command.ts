import Command from "./Command";
import { Message } from "discord.js";
import drive from "googleapis";
import fs from "fs";
import path from "path";
import { dataflow } from "googleapis/build/src/apis/dataflow";

export default class ContestCommand extends Command {
  public help = "Available Sub-commands for '!Contest': \nStart \nAdd \nVote \nEnd \nHelp ";

  //initiate a contest, announcing it to channel and 
  //This should read through the google drive folder, and choose N sample files in the root folder and save choice somewhere to be used when viewing list
  //5 random samples from gdrive, added prior to starting
  public async start(args: Array<string>, message: Message): Promise<void>{  
    let obj = {name:"Entry File", webLink: "www.com"};

    let files = [obj]//GDriveController.getFiles();
    let contestEntries = [obj];
    let pastEntrants = (await import("../../pastEntrants.json"));
    console.log(pastEntrants[0]);
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
    //record entries
    return;
    
  }

  //add to a list of sample files to be used for Contest
  //can be added to at any time, sounds files to be stored in gdrive
  public add(args: Array<string>, message: Message): void{
    
  }

  
  //add vote to selected file in running Contest
  public vote(args: Array<string>, message: Message): void{
    if(false)/*add check for on going contest*/{return}
    let votes = import("../../votes.json");
    console.log("votes loaded")
    const user = message.member.user.id;
    const vote = args[0];
    if( !((parseInt(vote) <= 5) && (parseInt(vote) > 0) ) ) {message.reply("Invalid vote. Usage: !Contest vote {1-5}"); return}
    votes[user] = vote;
    console.log(votes[user]);
    console.log(JSON.stringify(votes));
    fs.writeFileSync(path.join(__dirname,"../../votes.json"),JSON.stringify(votes),{ flag: 'w' });
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
          console.log("func =  " + func + "\nInitiating Command");
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