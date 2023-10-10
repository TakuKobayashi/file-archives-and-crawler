import * as cheerio from 'cheerio';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

(async function() {
  const res = await axios.get("https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html")
  const $ = cheerio.load(res.data, null, false);
  const archivePageAElement = $("ul.card-link").find("a")
  for(let i = 0;i < archivePageAElement.length;++i) {
    const element = archivePageAElement[i.toString()];
    const baseUrl = new URL("https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html");
    baseUrl.pathname = element.attribs.href
    const childRes = await axios.get(baseUrl.href)
    const childElement = cheerio.load(childRes.data, null, false);
    const fileAElement = childElement("div.def-list__wrap").find("a");
    for(let j = 0;j < fileAElement.length;++j) {
      const fileElement = fileAElement[j.toString()];
      baseUrl.pathname = fileElement.attribs.href
      const fileRes = await axios.get(baseUrl.href, {responseType: 'stream'})
      fileRes.data.pipe(fs.createWriteStream(path.basename(baseUrl.href)))
    }
  }
})();