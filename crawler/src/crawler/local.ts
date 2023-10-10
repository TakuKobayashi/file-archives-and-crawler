import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { IpaScraper } from './scrapers/ipa-scraper';

(async function () {
  const ipaScrapers = new IpaScraper('https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html');
  const downloadFileUrls = await ipaScrapers.downloadFileUrls();
  for (const downloadFileUrl of downloadFileUrls) {
    const fileRes = await axios.get(downloadFileUrl.href, { responseType: 'stream' });
    fileRes.data.pipe(fs.createWriteStream(path.basename(downloadFileUrl.href)));
  }
})();
