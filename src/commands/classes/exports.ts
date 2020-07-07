export interface ContestFile {
  name: string;
  webContentLink: string;
  [key: string]: any;
  shortlink?: string;
  id?: string;  // Remove optional after fully converting from text files
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