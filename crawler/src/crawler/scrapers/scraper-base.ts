import * as cheerio from 'cheerio';
import axios from 'axios';
import * as path from 'path';
import * as Encoding from 'encoding-japanese';

export abstract class ScraperBase {
  protected baseUrl: URL;

  constructor(baseUrl: string) {
    this.baseUrl = new URL(baseUrl);
  }

  async loadWithCheerio(): Promise<cheerio.CheerioAPI> {
    const res = await axios.get(this.baseUrl.href, { responseType: 'arraybuffer' });
    const unicodeBody = Encoding.convert(res.data, {to: "UNICODE",from: Encoding.detect(res.data)})
    return cheerio.load(Encoding.codeToString(unicodeBody), null, false);
  }

  async loadChildrenPageUrls(filterNode: string): Promise<URL[]> {
    const $ = await this.loadWithCheerio();
    const childrenUrls: Set<URL> = new Set();
    const childrenElements = $(filterNode).find('a');
    for (let i = 0; i < childrenElements.length; ++i) {
      const element = childrenElements[i.toString()];
      // 全角英数字などがまぎれていることがあるのでNFKCで正規化する
      let childUrl: URL;
      const linkText = element.attribs.href.normalize('NFKC');
      if (linkText.startsWith('http://') || linkText.startsWith('https://')) {
        childUrl = new URL(linkText);
      } else if (linkText.startsWith('/')) {
        childUrl = new URL(this.baseUrl.origin);
        childUrl.pathname = element.attribs.href;
      } else {
        childUrl = new URL(this.baseUrl.href);
        let pathname = '';
        if (childUrl.pathname.endsWith('/')) {
          pathname = path.join(childUrl.pathname, element.attribs.href);
        } else {
          pathname = path.join(path.dirname(childUrl.pathname), element.attribs.href);
        }
        childUrl.pathname = pathname.split(path.sep).join('/');
      }
      childrenUrls.add(childUrl);
    }
    return Array.from(childrenUrls);
  }

  abstract downloadFileUrls(): Promise<URL[]>;
}
