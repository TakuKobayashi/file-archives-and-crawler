import * as _ from 'lodash';
import { IpaScraper } from './scrapers/ipa-scraper';
import { CGArtsScraper } from './scrapers/cgarts-scraper';

const branchName = 'file-uploads';

(async function () {
  const ipaScrapers = new IpaScraper('https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html');
  await ipaScrapers.downloadFilesAndUploadToGithub(branchName, 'archives');
  const cgartsScraper = new CGArtsScraper('https://www.cgarts.or.jp/v1/kentei/past/index.html');
  await cgartsScraper.downloadFilesAndUploadToGithub(branchName, 'archives');
})();
