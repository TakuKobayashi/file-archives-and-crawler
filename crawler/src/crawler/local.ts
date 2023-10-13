import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { IpaScraper } from './scrapers/ipa-scraper';

(async function () {
  const ipaScrapers = new IpaScraper('https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html');
  const downloadFileUrls = await ipaScrapers.downloadFileUrls();
  for (const downloadFileUrl of downloadFileUrls) {
    const rootDirPath = path.join('../archives', downloadFileUrl.hostname, path.dirname(downloadFileUrl.pathname));
    if (!fs.existsSync(rootDirPath)) {
      fs.mkdirSync(rootDirPath, { recursive: true });
    }
    const fileRes = await axios.get(downloadFileUrl.href, { responseType: 'stream' });
    fileRes.data.pipe(fs.createWriteStream(path.join(rootDirPath, path.basename(downloadFileUrl.pathname))));
  }
})();
