import axios from 'axios';
import * as _ from 'lodash';
import { IpaScraper } from './scrapers/ipa-scraper';
import { Github, GithubFileUploader } from '../util/github';

(async function () {
  const ipaScrapers = new IpaScraper('https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html');
  const allDownloadFileUrls = await ipaScrapers.downloadFileUrls();
  const github = new Github(process.env.GITHUB_UPLOAD_FILE_REPO);
  const chunkDownloadFileUrls = _.chunk(allDownloadFileUrls, 20);
  for (const downloadFileUrls of chunkDownloadFileUrls) {
    const downloadPromises = [];
    for (const downloadFileUrl of downloadFileUrls) {
      downloadPromises.push(axios.get(downloadFileUrl.href, { responseType: 'arraybuffer' }));
    }
    const downloadResponses = await Promise.all(downloadPromises);
    const githubUploaders: GithubFileUploader[] = downloadResponses.map((downloadResponse, index) => {
      const downloadUrl = downloadFileUrls[index];
      return {
        savepath: ['archives', downloadUrl.hostname, downloadUrl.pathname].join('/'),
        content: downloadResponse.data,
      };
    });
    await github.uploadAndCommitFiles('file-uploads', githubUploaders);
  }
})();
