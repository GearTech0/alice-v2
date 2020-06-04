import Command from "./Command";
import { Message } from "discord.js";

export default class ContestCommand extends Command {
  public help = "Available options for 'Contest Command': \nStart \nAdd \nVote \nEnd ";

 //initiate a contest, announcing it to channel and 
 //This should read through the google drive folder, and choose N sample files in the root folder and save choice somewhere to be used when viewing list
  public start(args: Array<string>, message: Message): void{  
    
  }

//add to a list of sample files to be used for Contest
  public add(args: Array<string>, message: Message): void{
    
  }

//add vote to selected file in running Contest
  public vote(args: Array<string>, message: Message): void{
    
  }

//tally vote and announce winner of Contest
  public end(args: Array<string>, message: Message): void{ //
    
  }

  public helpAction(args: Array<string>, message: Message): void{
    message.reply(this.help);
    return;
  }

  public action(args: Array<string>, message: Message): void{
    let func = args.shift().toLowerCase();
    if(func === "help") { func = "helpAction";}
    try{
        this['${func}'](args);
    }
    catch (Error) { console.error(Error.message);}
  }
}