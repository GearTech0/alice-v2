export interface ContestFile {
  name: string;
  submitter?: string;
  webContentLink: string;
  [key: string]: any;
  shortlink?: string;
  id?: string;  // Remove optional after fully converting from text files
}

export interface ContestData { // to be removed
  contestActive: boolean;
  contestChannelName: string;
  contestChannelId?: string;
  gDriveFolder?: string;
  messageId?: string;
  entries?: { [key: string]: ContestFile };
  pastEntries?: { [key: string]: ContestFile };
  reactions: {};
}

export interface ContestConfig {
  contestAdminRoles?: Array<string>;
  channelName: string;
  reactions: {};
  sampleEntries: number;
}

export interface VoteInfo {
  voteStage: 'sample' | 'submission' | 'complete' | 'terminated';
  contestChannelId: string;
  messageId: string;
  sample?: ContestFile;
  entries?: { [key: string]: ContestFile };
  winners?: Array <{ 
    votes: number;
    file: ContestFile;
    UUID: string;
  }>;
}

export interface BotConfig {
  adminRoles: Array<string>;
}