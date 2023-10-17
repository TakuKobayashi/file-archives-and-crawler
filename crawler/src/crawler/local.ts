import axios from 'axios';
import * as _ from 'lodash';
import * as path from 'path';
import { IpaScraper } from './scrapers/ipa-scraper';
import { CGArtsScraper } from './scrapers/cgarts-scraper';
import { Github, GithubFileUploader } from '../util/github';

const branchName = 'file-uploads';

(async function () {
  const ipaScrapers = new IpaScraper('https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html');
  const allDownloadFileUrls = await ipaScrapers.downloadFileUrls();
  const cgartsScraper = new CGArtsScraper('https://www.cgarts.or.jp/v1/kentei/past/index.html');
  const callDownloadFileUrls = await cgartsScraper.downloadFileUrls();
  for (const callDownloadFileUrl of callDownloadFileUrls) {
    allDownloadFileUrls.push(callDownloadFileUrl);
  }
  const github = new Github(process.env.GITHUB_UPLOAD_FILE_REPO);
  const pathTreeMap = await this.loadPathTreeMap(branchName);
  const chunkDownloadFileUrls = _.chunk(allDownloadFileUrls, 20);
  for (const downloadFileUrls of chunkDownloadFileUrls) {
    const downloadPromises = [];
    const willSavePathes = [];
    for (const downloadFileUrl of downloadFileUrls) {
      const willSavePath = path.join('archives', downloadFileUrl.hostname, downloadFileUrl.pathname).split(path.sep).join('/');
      if (pathTreeMap.has(willSavePath)) {
        continue;
      }
      downloadPromises.push(axios.get(downloadFileUrl.href, { responseType: 'arraybuffer' }));
      willSavePathes.push(willSavePath);
    }
    if (downloadPromises.length <= 0) {
      continue;
    }
    const downloadResponses = await Promise.all(downloadPromises);
    const githubUploaders: GithubFileUploader[] = downloadResponses.map((downloadResponse, index) => {
      const willSavePath = willSavePathes[index];
      return {
        savepath: willSavePath,
        content: downloadResponse.data,
      };
    });
    await github.uploadAndCommitFiles(branchName, githubUploaders);
  }
})();
