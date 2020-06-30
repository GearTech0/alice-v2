import Command from './Command';
import fs from 'fs';
import path from 'path';
import validUrl from 'valid-url';
import { v4 as UUID } from 'uuid';
import { Message, TextChannel, MessageEmbed, MessageAttachment, MessageReaction} from 'discord.js';
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
		Contest.checkAuthorization(message);
		if(!args[0]) {
			console.log("Please provide name for contest, !contest start <name>. \n ex: !contest start New Contest");
			message.reply("Please provide name for contest, !contest start <name>. \n ex: !contest start New Contest");
			return;
		}

		const config: ContestConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../data/contest_data/contest.config.json")).toString());
		if(!config.channelName) {
			console.error("No contest channel name set within config.");
			message.reply("Please set contest channel within /data/contest_data/contest.config.json");
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
		if(fs.existsSync(path.join(__dirname, `../../../data/contest_data/${serverId}/${contestName}`))) {
			console.log("There is already a contest with the given name.");
			message.reply("There is already a contest with the given name.");
			return;
		}

		let files: {[key: string]: ContestFile} = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../data/templates/sampleFiles.json")).toString()); // Replace with file Retrieval from GDrive once available
		files = Contest.selectFiles(files, config.sampleEntries, message);


		let announcement = "\n:musical_note::musical_note:Voting for the sample to use in our next contest \""+contestName+"\" is starting now:musical_note::musical_note: ";
		announcement += "\nPlace your vote by clicking the corresponding reaction! \n";
		let data: Array<[string, string]> = [];
    	let y = 0;
    	for(let entry of Object.values(files)) {
      		data.push([`${Object.keys(config.reactions)[y]}`, `[${entry.name}](${entry.webContentLink})\n`]);
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
		try {
			let filePath = path.join(__dirname,`../../../data/contest_data/${serverId}/${contestName}`);
			if(!fs.existsSync(filePath)){
				fs.mkdirSync(filePath, { recursive: true});
			}
			fs.writeFileSync(filePath+`/ContestVoteInfo.json`, JSON.stringify(info, null, 2),{ flag: 'w' });
			console.log("Data successfully saved.");
		}
		catch(e) {
			console.error("An error occured while saving contest data.");
			message.reply("An error has occured, please notify an admin");
			throw e;
		}
		
		return;
	}

	// Advance contest from Sample Voting to Submission Voting
	public async advance(args: Array<string>, message: Message) {
		Contest.checkAuthorization(message);
		if(!args[0]) {
			console.log("Please provide name for contest, !contest advance <name>. \n ex: !contest start Running Contest");
			message.reply("Please provide name for contest, !contest advance <name>. \n ex: !contest start Running Contest");
			return;
		}
		let serverId = message.guild.id;
		let contestName = args.join(" ");
		let filePath = path.join(__dirname, `../../../data/contest_data/${serverId}/${contestName}`)
		if(!fs.existsSync(filePath)) {
			console.log("There is no ongoing contest with given name");
			message.reply("There is no ongoing contest with given name");
			return;
		}
		let data: VoteInfo = JSON.parse(fs.readFileSync(filePath+`/ContestVoteInfo.json`).toString());
		if(data.voteStage === 'submission'){
			console.log("Contest is already past the sample vote phase.");
			message.reply("Contest is already past the sample vote phase.");
			return;
		}
		if(data.voteStage === 'complete' || data.voteStage === 'terminated') {
			console.log("Contest has already ended.");
			message.reply("Contest has already ended.");
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

		let winners:  Array<{"emoji": any, "file": ContestFile, "UUID": string}> = [];
		let max = 0;
		for(let votes of reacCount) {
			max = votes > max ? votes : max;
		}
		while(reacCount.includes(max)) {
			let winner: {"emoji": any, "file": ContestFile,	"UUID": string} = {emoji: undefined, file: undefined, UUID: undefined};
			let x = reacCount.indexOf(max);
			winner.emoji = reacEmoji[x];
			let fileUUID = Object.keys(data.entries)[x];
			winner.file = Object.assign(new Object, data.entries[fileUUID]);
			winner.UUID = fileUUID;
			delete data.entries[fileUUID];
			reacEmoji.splice(x,1);
			reacCount.splice(x,1);
			winners.push(winner);
		}
		let winner = winners[(Math.round(Math.random()*100))%winners.length];
		let announcement = `The sample for our "${contestName}" contest has been chosen!\nShare your track file with "!contest submit ${contestName}" in the comment to enter the contest!`;
		let mEmbed = new MessageEmbed();
		mEmbed.setTitle(`${contestName}`);
		mEmbed.setDescription(`Sample File:  [${winner.file.name}](${winner.file.webContentLink})\nVote for your favourite using the reactions!`);
		let mEmbed2 = new MessageEmbed();
		mEmbed2.setTitle('Submissions:');
		let contestMessage = await channel.send(announcement, mEmbed);

		try {
			data.voteStage = 'submission';
			data.entries = {};
			data.messageId = contestMessage.id;
			data.sample = winner.file;
			fs.writeFileSync(filePath+`/ContestVoteInfo.json`, JSON.stringify(data, null, 2), { flag: 'w' });
			console.log("Data successfully saved.");
		}
		catch(e) {
			console.error("An error occured while saving contest data.");
			message.reply("An error has occured, please notify an admin");
			throw e;
		}
		try {
			let peFilePath =  path.join(__dirname, `../../../data/contest_data/${serverId}/pastSamples.json`);
			let pastEntrants: {[key: string]: ContestFile} = {};
			if(fs.existsSync(peFilePath)) {
				pastEntrants = JSON.parse(fs.readFileSync(peFilePath).toString());
			}
			pastEntrants[winner.UUID] = winner.file;
			fs.writeFileSync(peFilePath, JSON.stringify(pastEntrants, null, 2), { flag: 'w' });
			console.log("Past entrant data successfully saved.");
		}
		catch(e) {
			console.error(`An error occured while attempting to update past entrants data. \n    ${e}`);
		}
		return;
	}

	// Submit a file for voting to a contest in the submission phase
	public async submit(args: Array<string>, message: Message) {
		if(!args[0]) {
			console.log("Please provide name for contest, !contest submit <name>. \n ex: !contest submit Running Contest");
			message.reply("Please provide name for contest, !contest submit <name>. \n ex: !contest submit Running Contest");
			return;
		}
		let serverId = message.guild.id;
		let contestName = args.join(" ");
		let filePath = path.join(__dirname, `../../../data/contest_data/${serverId}/${contestName}`);
		if(!fs.existsSync(filePath)) {
			console.log("There is no ongoing contest with given name");
			message.reply("There is no ongoing contest with given name");
			return;
		}
		let data: VoteInfo = JSON.parse(fs.readFileSync(filePath+`/ContestVoteInfo.json`).toString());
		if(data.voteStage === 'sample'){
			console.log("Contest is is still in the sample vote phase.");
			message.reply("Contest is still in the sample vote phase");
			return;
		}
		if(data.voteStage === 'complete' || data.voteStage === 'terminated') {
			console.log("Contest has already ended.");
			message.reply("Contest has already ended.");
			return;
		}
		let channel = await message.guild.channels.resolve(data.contestChannelId) as TextChannel;
		let voteMessage = await channel.messages.fetch(data.messageId);
		let config: ContestConfig = JSON.parse(fs.readFileSync(path.join(__dirname, `../../../data/contest_data/contest.config.json`)).toString());
		let mEmbed = voteMessage.embeds[0];
		let entryCount = mEmbed.fields.length;

		if(entryCount == 25) { // Max number of embed fields
			console.log("Entry max reached, cannot accept more entries!");
			message.reply("Maximum amount of entries have already been submitted.\nPlease try again in the next contest!");
			return;
		}
		if(entryCount == Object.keys(config.reactions).length) {
			console.log("Not enough reactions to accept more submissions");
			message.reply("There was an error with your submission, contact an admin.");
			return;
		}

		let submitter = message.author;
		for (let submission of Object.values(data.entries)) {
			if (submission.submitter === submitter.id) {
				message.reply("You have already submitted your entry for this contest.");
				message.delete();
				return;
			}
		}
		let submission: MessageAttachment;
		try{
			submission = Array.from(message.attachments.values())[0];
			if(!submission){
				message.reply("No file attachment found in message.");
				return;
			}
		}catch (e){
			//console.log(Array.from(message.attachments.values()).toLocaleString());
			console.error("No message attachment");
			message.reply("No submission file was provided.");
			throw e;
		}
		Contest.validate(submission); // validate attachment is usable for contest
		Contest.upload(submission) // save submission to gDrive
		// change these to reflect gDrive data
		let fileName = submission.name;
		let fileUrl = submission.url;
		let uuid = UUID();

		mEmbed.addField(`${Object.keys(config.reactions)[entryCount]} @${submitter.username}`, `[${fileName}](${fileUrl})`);
		voteMessage.edit(voteMessage.content, mEmbed);
		await voteMessage.react(Object.values(config.reactions)[entryCount] as any)
		message.delete();
		message.reply("Your submission has been entered into the contest.");

		try {
			data.entries[uuid] = {name: fileName, webContentLink: fileUrl};
			data.entries[uuid].submitter = submitter.id;
			fs.writeFileSync(filePath+`/ContestVoteInfo.json`, JSON.stringify(data, null, 2), { flag: 'w' });
			console.log("Data successfully saved.");
		}
		catch(e) {
			console.error("An error occured while saving contest data.");
			message.reply("An error has occured, please notify an admin");
			throw e;
		}
		return;
	}
	

	// Tally vote and announce top 3(can be more in case of ties) as winners of Contest
	public async end(args: Array<string>, message: Message) {
		Contest.checkAuthorization(message);
		if(!args[0]) {
			console.log("Please provide name for contest, !contest advance <name>. \n ex: !contest start Running Contest");
			message.reply("Please provide name for contest, !contest advance <name>. \n ex: !contest start Running Contest");
			return;
		}
		let serverId = message.guild.id;
		let contestName = args.join(" ");
		let filePath = path.join(__dirname, `../../../data/contest_data/${serverId}/${contestName}`)
		if(!fs.existsSync(filePath)) {
			console.log("There is no ongoing contest with given name");
			message.reply("There is no ongoing contest with given name");
			return;
		}
		let data: VoteInfo = JSON.parse(fs.readFileSync(filePath+`/ContestVoteInfo.json`).toString());
		if(data.voteStage === 'sample'){
			console.log("Contest is still in the sample vote phase.");
			message.reply("Contest is still in the sample vote phase.");
			return;
		}
		if(data.voteStage === 'complete' || data.voteStage === 'terminated') {
			console.log("Contest has already ended.");
			message.reply("Contest has already ended.");
			return;
		}
		let channel = await message.guild.channels.resolve(data.contestChannelId) as TextChannel;
		let voteMessage = await channel.messages.fetch(data.messageId);
		let entries = Object.assign(new Object, data.entries);
		let cache = voteMessage.reactions.cache;

		if (Object.keys(data.entries).length === 0) {
			message.reply("There has not yet been any submission for that contest.");
			return;
		}

		let reacCounts = [];
        for (let reaction of cache) {
			reacCounts.push(reaction[1].count);
        }
		
		let winners: Array<{"file": ContestFile, "votes": number, "UUID": string}> = [];
		while (winners.length < 3 && (winners.length < reacCounts.length)) {
			let max = 0;
			for (let count of reacCounts) {
				max = count > max ? count : max;
			}

			while (reacCounts.includes(max)) {
				let winner: {"file": ContestFile, "votes": number, 	"UUID": string} = {file: undefined, votes: undefined, UUID: undefined};
				let index = reacCounts.indexOf(max);
				winner.votes = max;
				winner.file = Object.assign(new Object, Object.values(entries)[index]);
				winner.UUID = Object.keys(entries)[index];
				delete entries[winner.UUID];
				reacCounts.splice(index, 1);
				winners.push(winner);
			}
		}

		let places = ['1st Place', '2nd Place', '3rd Place'];
		let mEmbed = new MessageEmbed();
		mEmbed.setTitle(`${contestName} winners: `);
		let announcement = `${contestName} has ended!`;
		for (let x=0; x<winners.length; ++x) {
			let place = places[x];
			let submitter =  await message.guild.members.fetch(winners[x].file.submitter);
			let string = `${submitter} - [${winners[x].file.name}](${winners[x].file.url})`;
			while (x+1 < winners.length && winners[x].votes === winners[x+1].votes) {
				++x;
				string += `\n@${winners[x].file.submitter} - [${winners[x].file.name}](${winners[x].file.url})`;
			}
			mEmbed.addField(`${place}, ${winners[x].votes} votes:`, string);
		}
		mEmbed.addField(":tada:CONGRATULATIONS:tada:", "\nLook forward to our next contest!");
		
		// Edit message from !advance to show contest submissions and voting are closed
		let voteEmbed = voteMessage.embeds[0];
		let embedText = `Sample File: [${data.sample.name}](${data.sample.webContentLink}) \nSubmissions + Voting Are Closed`;
		voteEmbed.setDescription(embedText);
		let voteMessageText = `The ccontest "${contestName}" is now over! \nCheck the message below for the winners!`;
		voteMessage.edit(voteMessageText, voteEmbed);

		// Send message announcing winners
		let contestMessage = await channel.send(announcement, mEmbed);

		try {
			data.voteStage = 'complete';
			data.messageId = contestMessage.id;
			data.winners = winners;
			fs.writeFileSync(filePath+`/ContestVoteInfo.json`, JSON.stringify(data, null, 2), { flag: 'w' });
			console.log("Data successfully saved");
		}
		catch(e) {
			console.error("An error occured while saving contest data.");
			message.reply("An error has occured, please notify an admin");
			throw e;
		}

		return;
	}
	

	public helpAction(args: Array<string>, message: Message): void{
		message.reply(this.help);
		return;
	}

		// Add sample file to GDrive to be used for Contest Sample Vote
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

	// Clear Past Entrants data to add them back to applicant pool
	public async reset(args: Array<string>, message: Message) {
		let serverId = message.guild.id;
		let peFilePath = path.join(__dirname, `../../../data/ContestData/${serverId}/pastSamples.json`);
		if(!fs.existsSync(peFilePath)) {
			message.reply("These is no data to reset.");
		}
		try {
			fs.unlinkSync(peFilePath);
		}
		catch(e) {
			console.error(`Error while attemping to delete past sample entrant file of server: ${serverId} \n    ${e.name}: ${e.message}`);
			message.reply("Failed to reset data.")
			return;
		}
		message.reply("Data reset.");
		return;
	}

	// Terminate contest from any phase, ending it without announcing a winner.
	public async terminate(args: Array<string>, message: Message) {
		Contest.checkAuthorization(message);
		if(!args[0]) {
			console.log("Please provide name for contest, !contest advance <name>. \n ex: !contest start Running Contest");
			message.reply("Please provide name for contest, !contest advance <name>. \n ex: !contest start Running Contest");
			return;
		}
		let serverId = message.guild.id;
		let contestName = args.join(" ");
		let filePath = path.join(__dirname, `../../../data/contest_data/${serverId}/${contestName}`)
		if(!fs.existsSync(filePath)) {
			console.log("There is no ongoing contest with given name");
			message.reply("There is no ongoing contest with given name");
			return;
		}
		let data: VoteInfo = JSON.parse(fs.readFileSync(filePath+`/ContestVoteInfo.json`).toString());		
		try {
			data.voteStage = 'terminated';
			fs.writeFileSync(filePath+`/ContestVoteInfo.json`, JSON.stringify(data, null, 2), { flag: 'w' });
			console.log("Data successfully saved");
		}
		catch(e) {
			console.error("An error occured while saving contest data.");
			message.reply("An error has occured, please notify an admin");
			throw e;
		}
		message.reply("Contest terminated.");
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
			catch (error) {
					if (error.name === 'Authorization Error') {
						throw error;
					}
					if (error.name === 'TypeError') { 
						console.error("Invalid Command"); console.error(Error.name+": " + error.message); 
						message.reply("Invalid Sub-command. Please refer to !Contest help for list of Sub-commands and their use.");
					} 
						else {console.error(Error.name+": " + error.message); }
					}
		}
		return;
	}
	
}