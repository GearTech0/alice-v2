export interface ContestFile {
  name: string;
  url: string;
  submitter?: string;
  [key: string]: any;
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