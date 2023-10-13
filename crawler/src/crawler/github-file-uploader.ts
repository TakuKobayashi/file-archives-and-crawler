import { Octokit } from 'octokit';
import { glob } from 'fast-glob';
import * as fs from 'fs';
import * as _ from 'lodash';

const targetBranch = 'master';
const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN });

(async function () {
  const myGihubUserResponse = await octokit.rest.users.getAuthenticated();
  const uploadFiles = await glob('../archives/ipa-exams/**/*.*');
  const chunkUploadFiles = _.chunk(uploadFiles, 20);
  const latestCommit = await octokit.rest.repos.getBranch({
    owner: myGihubUserResponse.data.login,
    repo: process.env.GITHUB_UPLOAD_FILE_REPO,
    branch: targetBranch,
  });
  let lastCommitSha = latestCommit.data.commit.sha;
  const existFiles = await octokit.rest.git.getTree({
    owner: myGihubUserResponse.data.login,
    repo: process.env.GITHUB_UPLOAD_FILE_REPO,
    tree_sha: latestCommit.data.commit.sha,
    recursive: 'true',
  });
  const trees: {
    path?: string;
    mode?: string;
    type?: string;
    sha?: string;
    size?: number;
    url?: string;
  }[] = existFiles.data.tree;
  for (const uploadFiles of chunkUploadFiles) {
    const uploadFilePathes = [];
    const createdBlobPromises = [];
    for (const filePath of uploadFiles) {
      const saveFilePath = filePath.split('/').slice(1).join('/');
      if (trees.some((tree) => tree.path.includes(saveFilePath))) {
        continue;
      }
      const base64Content = fs.readFileSync(filePath, 'base64');
      const createdBlobPromise = octokit.rest.git.createBlob({
        owner: myGihubUserResponse.data.login,
        repo: process.env.GITHUB_UPLOAD_FILE_REPO,
        encoding: 'base64',
        content: base64Content,
      });
      createdBlobPromises.push(createdBlobPromise);
      uploadFilePathes.push(saveFilePath);
    }
    const createdBlobs = await Promise.all(createdBlobPromises);
    if (createdBlobs.length <= 0) {
      continue;
    }
    const createdTree = await octokit.rest.git.createTree({
      owner: myGihubUserResponse.data.login,
      repo: process.env.GITHUB_UPLOAD_FILE_REPO,
      tree: createdBlobs.map((createdBlob, index) => {
        return {
          type: 'blob',
          path: uploadFilePathes[index],
          mode: '100644',
          sha: createdBlob.data.sha,
        };
      }),
      base_tree: lastCommitSha,
    });
    const now = new Date();
    const createdCommit = await octokit.rest.git.createCommit({
      owner: myGihubUserResponse.data.login,
      repo: process.env.GITHUB_UPLOAD_FILE_REPO,
      message: `archives ipa-exams upload ${now.toString()}`,
      tree: createdTree.data.sha,
      parents: [lastCommitSha],
    });
    await octokit.rest.git.updateRef({
      owner: myGihubUserResponse.data.login,
      repo: process.env.GITHUB_UPLOAD_FILE_REPO,
      ref: `heads/${latestCommit.data.name}`,
      sha: createdCommit.data.sha,
    });
    lastCommitSha = createdCommit.data.sha;
  }
})()
