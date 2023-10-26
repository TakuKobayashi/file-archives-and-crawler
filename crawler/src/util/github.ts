import { Octokit } from 'octokit';
import { OctokitResponse } from '@octokit/types';
import { RecordFileRootInfo, SaveFileInfo } from '@/interfaces/archive-file-metum';

//const targetBranch = 'master';
const octokit = new Octokit({ auth: process.env.PERSONAL_ACCESS_TOKEN });

interface GithubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  ldap_dn?: string;
}

interface GithubBranch {
  name: string;
  commit: {
    url: string;
    sha: string;
    node_id: string;
    html_url: string;
    comments_url: string;
    commit: {
      url: string;
      author: {
        name?: string;
        email?: string;
        date?: string;
      };
      committer: {
        name?: string;
        email?: string;
        date?: string;
      };
      message: string;
      comment_count: number;
      tree: Partial<GithubTree>;
      verification?: {
        verified: boolean;
        reason: string;
        payload: string;
        signature: string;
      };
    };
    files?: {
      sha: string;
      filename: string;
      status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
      additions: number;
      deletions: number;
      changes: number;
      blob_url: string;
      raw_url: string;
      contents_url: string;
      patch?: string;
      previous_filename?: string;
    }[];
  };
}

interface GithubTree {
  path?: string;
  mode?: string;
  type?: string;
  sha?: string;
  size?: number;
  url?: string;
}

interface GithubBlob {
  url: string;
  sha: string;
}
export interface GithubFileUploader {
  savepath: string;
  content: Buffer;
}

export interface GithubBlobWithPath {
  savepath: string;
  blob: GithubBlob;
}

interface CommitFromUploadBlobsResult {
  committedSha: string;
  createdTrees: GithubTree[];
}

export class Github {
  private targetRepo: string;
  private cachedMyUser: GithubUser | null = null;
  private cachedTargetBranch: GithubBranch | null = null;
  private catchedlastCommitSha: string | null = null;
  private catchedPathTreeMap: Map<string, GithubTree> = new Map();

  constructor(targetRepo: string) {
    this.targetRepo = targetRepo;
  }

  async loadSelfUser(): Promise<GithubUser> {
    if (this.cachedMyUser) {
      return this.cachedMyUser;
    }
    const myGihubUserResponse: OctokitResponse<GithubUser, 200> = await octokit.rest.users.getAuthenticated();
    this.cachedMyUser = myGihubUserResponse.data;
    return this.cachedMyUser;
  }

  async loadLatestBranch(targetBranchName: string): Promise<GithubBranch> {
    if (this.cachedTargetBranch) {
      return this.cachedTargetBranch;
    }
    const myUser = await this.loadSelfUser();
    const githubBranchResponse: OctokitResponse<GithubBranch, 200> = await octokit.rest.repos.getBranch({
      owner: myUser.login,
      repo: this.targetRepo,
      branch: targetBranchName,
    });
    this.cachedTargetBranch = githubBranchResponse.data;
    this.catchedlastCommitSha = githubBranchResponse.data.commit.sha;
    return this.cachedTargetBranch;
  }

  async loadPathTreeMap(targetBranchName: string): Promise<Map<string, GithubTree>> {
    if (this.catchedPathTreeMap.size > 0) {
      return this.catchedPathTreeMap;
    }
    const targetBranch = await this.loadLatestBranch(targetBranchName);
    const myUser = await this.loadSelfUser();
    const currentTreeResponse = await octokit.rest.git.getTree({
      owner: myUser.login,
      repo: this.targetRepo,
      tree_sha: targetBranch.commit.sha,
      recursive: 'true',
    });
    for (const tree of currentTreeResponse.data.tree) {
      this.catchedPathTreeMap.set(tree.path, tree);
    }
    return this.catchedPathTreeMap;
  }

  async uploadAndCommitFiles(targetBranchName: string, uploaders: GithubFileUploader[]): Promise<void> {
    const treeMap = await this.loadPathTreeMap(targetBranchName);
    const myUser = await this.loadSelfUser();
    const uploadFilePathes = [];
    const createdBlobPromises = [];
    for (const uploader of uploaders) {
      if (treeMap.has(uploader.savepath)) {
        continue;
      }
      const base64Content = Buffer.from(uploader.content).toString('base64');
      const createdBlobPromise = octokit.rest.git.createBlob({
        owner: myUser.login,
        repo: this.targetRepo,
        encoding: 'base64',
        content: base64Content,
      });
      createdBlobPromises.push(createdBlobPromise);
      uploadFilePathes.push(uploader.savepath);
    }
    // clear and save memory
    uploaders.splice(0);
    const createdBlobs = await Promise.all(createdBlobPromises);
    if (createdBlobs.length <= 0) {
      return;
    }
    const blobWithPathes: GithubBlobWithPath[] = createdBlobs.map((createdBlob, index) => {
      return {
        savepath: uploadFilePathes[index],
        blob: createdBlob.data,
      };
    });
    const result = await this.commitFromUploadBlobs(blobWithPathes);
    for (const tree of result.createdTrees) {
      this.catchedPathTreeMap.set(tree.path, tree);
    }
    this.catchedlastCommitSha = result.committedSha;
  }

  async uploadFile(content: Buffer): Promise<GithubBlob> {
    const myUser = await this.loadSelfUser();
    const base64Content = Buffer.from(content).toString('base64');
    const createdBlobResponse = await octokit.rest.git.createBlob({
      owner: myUser.login,
      repo: this.targetRepo,
      encoding: 'base64',
      content: base64Content,
    });
    return createdBlobResponse.data;
  }

  async commitFromUploadBlobs(blobWithPathes: GithubBlobWithPath[]): Promise<CommitFromUploadBlobsResult> {
    const myUser = await this.loadSelfUser();
    const createdTreeResponse = await octokit.rest.git.createTree({
      owner: myUser.login,
      repo: this.targetRepo,
      tree: blobWithPathes.map((blobWithPath) => {
        return {
          type: 'blob',
          path: blobWithPath.savepath,
          mode: '100644',
          sha: blobWithPath.blob.sha,
        };
      }),
      base_tree: this.catchedlastCommitSha,
    });
    const createdTree = createdTreeResponse.data;
    const now = new Date();
    const createdCommit = await octokit.rest.git.createCommit({
      owner: myUser.login,
      repo: this.targetRepo,
      message: `archives file upload ${now.toString()}`,
      tree: createdTree.sha,
      parents: [this.catchedlastCommitSha],
    });
    const createdCommitSha = createdCommit.data.sha;
    await octokit.rest.git.updateRef({
      owner: myUser.login,
      repo: this.targetRepo,
      ref: `heads/${this.cachedTargetBranch.name}`,
      sha: createdCommitSha,
    });
    return { committedSha: createdCommitSha, createdTrees: createdTree.tree };
  }

  async recordFilesData(saveFileInfo: SaveFileInfo, recordFileRoot: RecordFileRootInfo) {
    const hostnameRecordFileInfoMap: Map<string, { [key: string]: string }[]> = new Map();
    for (const recordFile of recordFileRoot.recordFiles) {
      const downloadFileUrl = recordFile.downloadFileUrl;
      if (!hostnameRecordFileInfoMap.has(downloadFileUrl.hostname)) {
        hostnameRecordFileInfoMap.set(downloadFileUrl.hostname, []);
      }
      const recordFileInfos = hostnameRecordFileInfoMap.get(downloadFileUrl.hostname);
      recordFileInfos.push({
        fromUrl: recordFile.downloadFileUrl.href,
        filePath: recordFile.filePath,
        filename: recordFile.filename,
        githubSha: recordFile.githubFileSha,
      });
      hostnameRecordFileInfoMap.set(downloadFileUrl.hostname, recordFileInfos);
    }
    const archiveHostnames = Array.from(hostnameRecordFileInfoMap.keys());
    const rootJson = JSON.stringify(
      archiveHostnames.map((archiveHostname) => {
        return {
          archiveHostname: archiveHostname,
          rootUrls: [recordFileRoot.rootUrl.href],
        };
      }),
    );
    const blobWithPathes: GithubBlobWithPath[] = [];
    const rootJsonBlob = await this.uploadFile(Buffer.from(rootJson, 'utf-8'));
    blobWithPathes.push({
      savepath: [saveFileInfo.rootDirPath, saveFileInfo.rootInfoFileName].join('/'),
      blob: rootJsonBlob,
    });
    for (const archiveHostname of archiveHostnames) {
      const recordFileInfo = hostnameRecordFileInfoMap.get(archiveHostname);
      const recordFileInfoJsonBlob = await this.uploadFile(Buffer.from(JSON.stringify(recordFileInfo), 'utf-8'));
      blobWithPathes.push({
        savepath: [saveFileInfo.rootDirPath, archiveHostname, saveFileInfo.hostnameInfoFileName].join('/'),
        blob: recordFileInfoJsonBlob,
      });
    }
    await this.commitFromUploadBlobs(blobWithPathes);
  }

  async clearCache() {
    this.cachedMyUser = null;
    this.cachedTargetBranch = null;
    this.catchedlastCommitSha = null;
    this.catchedPathTreeMap.clear();
  }
}
