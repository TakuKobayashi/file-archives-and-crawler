export interface RecordFileRootInfo {
  rootUrl: URL;
  recordFiles: RecordFileInfo[];
}

export interface RecordFileInfo {
  downloadFileUrl: URL;
  filePath: string;
  filename: string;
  githubFileSha: string;
}

export interface SaveFileInfo {
  rootDirPath: string;
  rootInfoFileName: string;
  hostnameInfoFileName: string;
}
