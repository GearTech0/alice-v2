export interface ContestFile {
  name: string;
  url: string;
  [key: string]: any;
}

export interface ContestData {
  contestActive: boolean;
  contestChannelName: string;
  contestChannelId: string;
  messageId: string;
  entries: { [key: string]: ContestFile };
  pastEntries: { [key: string]: ContestFile };
  reactions: {};
}