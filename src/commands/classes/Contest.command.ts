import Command from './Command';
import fs from 'fs';
import drive from 'googleapis';
import path from 'path';
import validUrl from 'valid-url';
import { Message, TextChannel, MessageEmbed } from 'discord.js';
import { table, getBorderCharacters } from 'table';
import { dataflow } from "googleapis/build/src/apis/dataflow";
import { ContestData, ContestFile, ContestConfig, VoteInfo } from './exports';
import * as Contest from './Contest.functions';

export default class ContestCommand extends Command {
	public help = "Available Sub-commands for '!Contest': \nStart \nAdd \nVote \nEnd \nReset \nHelp "


	// Initiate a contest, announcing it to channel
	// This should read through the google drive folder, and choose N sample files in the root folder and save choice somewhere to be used when viewing list
	// Files to be added prior to starting via !Contest add
	public async start(args: Array<string>, message: Message) {
		if(!args[0]) {
			console.log("Please provide name for contest, !contest start <name>. \n ex: !contest start New Contest");
			message.reply("Please provide name for contest, !contest start <name>. \n ex: !contest start New Contest");
			return;
		}

		const config: ContestConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../data/ContestData/ContestConfig.json")).toString());
		if(!config.channelName) {
			console.error("No contest channel name set within config.");
			message.reply("Please set contest channel within /data/ContestData/ContestConfig.json");
			return;
		}
        if(Object.keys(config.reactions).length < config.sampleEntries) {
            console.error("Not enough reactions for sample entry count");
            message.reply("Failed to start contest, contact admin");
            return;
		}
		let serverId = message.guild.id;
		let channel: TextChannel;
    	try {
        	channel = message.guild.channels.cache.find(channel => channel.name === config.channelName) as TextChannel;
    	} catch (e) {
        	console.error("Error! Could not find contest channel!: "+e);
        	message.reply("Server contests channel not found, contact Admin");
        	return;
		}
		let channelId = channel.id;
		let contestName = args.join(" ");
		if(fs.existsSync(path.join(__dirname, `../../../data/ContestData/${serverId}/${contestName}`))) {
			console.log("There is already an ongoing contest with the given name.");
			message.reply("There is already an ongoing contest with the given name.");
			return;
		}

		let files: {[key: string]: ContestFile} = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../data/templates/sampleFiles.json")).toString()); // Replace with file Retrieval from GDrive once available
		files = Contest.selectFiles(files, config.sampleEntries, message);


		let announcement = "\n:musical_note::musical_note:Voting for the sample to use in our next contest \""+contestName+"\" is starting now:musical_note::musical_note: ";
		announcement += "\nPlace your vote by clicking the corresponding reaction! \n";
		let data: Array<[string, string]> = [];
    	let y = 0;
    	for(let entry of Object.values(files)) {
      		data.push([`${Object.keys(config.reactions)[y]}`, `[${entry.name}](${entry.url})\n`]);
			++y;
		}
		let tblConfig = { //  config for Embed table formatting
			border: getBorderCharacters('void'),
			columnDefault: {
			  paddingLeft: 0,
			  paddingRight: 1
			},
			drawHorizontalLine: () => {
			  return false;
			}
		};
		let mEmbed = new MessageEmbed().addField("Contest Entries", table(data, tblConfig));
		let messageId: string;
		await channel.send(announcement, {embed: mEmbed}).then( async function (message: Message) {      
			messageId = message.id;
		  
			for(let x =0; x < config.sampleEntries; ++x) {
			  await message.react(Object.values(config.reactions)[x] as any);
			}
			return;
		}).catch(function (e){
			console.error("Error creating contest message!"+e);
			return;
		});
		let info: VoteInfo = {
			"voteStage": 'sample',
  			"contestChannelId": channelId,
  			"messageId": messageId,
  			"entries": files
		}
		let filePath = path.join(__dirname,`../../../data/ContestData/${serverId}/${contestName}`);
		if(!fs.existsSync(filePath)){
			fs.mkdirSync(filePath, { recursive: true});
		}
		fs.writeFileSync(filePath+`/ContestVoteInfo.json`, JSON.stringify(info, null, 2),{ flag: 'w' });
		return;
	}

	// Advance contest from Sample Voting to Submission Voting
	public async advance(args: Array<string>, message: Message) {
		if(!args[0]) {
			console.log("Please provide name for contest, !contest advance <name>. \n ex: !contest start Running Contest");
			message.reply("Please provide name for contest, !contest advance <name>. \n ex: !contest start Running Contest");
			return;
		}
		let serverId = message.guild.id;
		let contestName = args.join(" ");
		let filePath = path.join(__dirname, `../../../data/ContestData/${serverId}/${contestName}`)
		if(!fs.existsSync(filePath)) {
			console.log("There is no ongoing contest with given name");
			message.reply("There is no ongoing contest with given name");
			return;
		}
		let data: VoteInfo = JSON.parse(fs.readFileSync(filePath+`/SampleVoteInfo.json`).toString());
		if(data.voteStage === 'submission'){
			console.log("Contest is already past sample vote phase.");
			message.reply("Contest is already past sample vote phase.");
			return;
		}
		if(data.voteStage === 'complete') {
			console.log("Contest is already complete.");
			message.reply("Contest is already complete.");
			return;
		}
		let channel = await message.guild.channels.resolve(data.contestChannelId) as TextChannel;
		let sampleMessage = await channel.messages.fetch(data.messageId);

		let reactions = sampleMessage.reactions.cache;
		let reacEmoji = [];
		let reacCount = [];
		for (let reaction of reactions) {
			reacEmoji.push(reaction[1].emoji);
			reacCount.push(reaction[1].count);
			if(reacCount.length >= Object.keys(data.entries).length){ break; }
		}

		let winners = [];
		let max = 0;
		for(let votes of reacCount) {
			max = votes > max ? votes : max;
		}
		while(reacCount.includes(max)) {
			let winner = {};
			let x = reacCount.indexOf(max);
			winner["emoji"] = reacEmoji[x];
			let fileUUID = Object.keys(data.entries)[x];
			winner["file"] = Object.assign(new Object, data.entries[fileUUID]);
			winner["UUID"] = fileUUID;
			delete data.entries[fileUUID];
			reacEmoji.splice(x,1);
			reacCount.splice(x,1);
			winners.push(winner);
		}
		let winner = winners[(Math.round(Math.random()*100))%winners.length];

		let announcement = `The sample for our "${contestName}" contest has been chosen!\nShare your sound file with "!contest submit ${contestName}" in the comment to enter the contest!`;
		let mEmbed = new MessageEmbed();
		mEmbed.setTitle(`${contestName}`);
		mEmbed.setDescription(`Sample file to use for your contest entry:  [${winner.file.name}](${winner.file.url})`);
		let contestMessage = await channel.send(announcement, mEmbed);

		try {
			data.voteStage = 'submission';
			data.entries = {};
			fs.writeFileSync(filePath+`/ContestVoteInfo.json`, JSON.stringify(data, null, 2), { flag: 'w' });
		}
		catch(e) {
			message.reply("An error occured while saving contest data, please contact an admin");
			return;
		}
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
		let contestData: ContestData = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../data/contestData.json")).toString());
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
					let names = "";
					let place = places[x];
					names += `[${winners[x].file.name}](${winners[x].file.url})\n`;
					while((x+1 < winners.length) && (winners[x].votes == winners[x+1].votes)){
						++x;
						names += `[${winners[x].file.name}](${winners[x].file.url})\n`;
					}
					mEmbed.addField(`${place} | ${winners[x].votes} votes`, names);
			
				}
				mEmbed.addField(":tada:CONGRATULATIONS:tada:", "\nLook forward to our next contest!");
				console.log('Successful');
				
				for(let x=0; x<winners.length; ++x){

					contestData.pastEntries[winners[x].UUID] = Object.assign(new Object, winners[x].file);
				}
				console.log("Writing contestData to file");
				contestData.contestActive = false;
				fs.writeFileSync(path.join(__dirname,"../../../data/contestData.json") ,JSON.stringify(contestData, null, 2),{ flag: 'w' });
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
		for(let entry in contestData.pastEntries){
			delete contestData.pastEntries[entry];
		}
		try{
			fs.writeFileSync(path.join(__dirname,"../../../data/contestData.json"), JSON.stringify(contestData, null, 2),{ flag: 'w' });
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
			console.log("Contest Command initiated with arg: ", args.join(" "));
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