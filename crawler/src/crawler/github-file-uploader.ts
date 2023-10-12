import { Octokit } from 'octokit';
import { glob } from 'fast-glob';
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';

const targetBranch = 'master';
const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN });

(async function () {
  const myGihubUserResponse = await octokit.rest.users.getAuthenticated();
  const uploadFiles = await glob('../archives/ipa-exams/**/*.*');
  const chunkUploadFiles = _.chunk(uploadFiles, 20);
  for (const uploadFiles of chunkUploadFiles) {
    const latestCommit = await octokit.rest.repos.getBranch({
      owner: myGihubUserResponse.data.login,
      repo: process.env.GITHUB_UPLOAD_FILE_REPO,
      branch: targetBranch,
    });
    const existFiles = await octokit.rest.git.getTree({
      owner: myGihubUserResponse.data.login,
      repo: process.env.GITHUB_UPLOAD_FILE_REPO,
      tree_sha: latestCommit.data.commit.sha,
      recursive: 'true',
    });
    console.log(existFiles.data.tree);
    const uploadFilePathes = [];
    const createdBlobPromises = [];
    for (const filePath of uploadFiles) {
      const saveFilePath = filePath.split(path.sep).slice(1).join('/');
      if (existFiles.data.tree.some((tree) => tree.path.includes(saveFilePath))) {
        continue;
      }
      uploadFilePathes.push(saveFilePath);
      const base64Content = fs.readFileSync(filePath, 'base64');
      const createdBlobPromise = octokit.rest.git.createBlob({
        owner: myGihubUserResponse.data.login,
        repo: process.env.GITHUB_UPLOAD_FILE_REPO,
        encoding: 'base64',
        content: base64Content,
      });
      createdBlobPromises.push(createdBlobPromise);
    }
    const createdBlobs = await Promise.all(createdBlobPromises);
    console.log(createdBlobs.map((createdBlob) => createdBlob.data));
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
      base_tree: latestCommit.data.commit.sha,
    });
    const now = new Date();
    const createdCommit = await octokit.rest.git.createCommit({
      owner: myGihubUserResponse.data.login,
      repo: process.env.GITHUB_UPLOAD_FILE_REPO,
      message: `archives ipa-exams upload ${now.toString()}`,
      tree: createdTree.data.sha,
      parents: [latestCommit.data.commit.sha],
    });
    await octokit.rest.git.updateRef({
      owner: myGihubUserResponse.data.login,
      repo: process.env.GITHUB_UPLOAD_FILE_REPO,
      ref: `heads/${latestCommit.data.name}`,
      sha: createdCommit.data.sha,
    });
  }
})();
