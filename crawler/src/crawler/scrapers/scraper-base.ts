import * as cheerio from 'cheerio';
import axios from 'axios';
import * as path from 'path';

export abstract class ScraperBase {
  protected baseUrl: URL;

  constructor(baseUrl: string) {
    this.baseUrl = new URL(baseUrl);
  }

  async loadWithCheerio(): Promise<cheerio.CheerioAPI> {
    const res = await axios.get(this.baseUrl.href);
    return cheerio.load(res.data, null, false);
  }

  async loadChildrenPageUrls(filterNode: string): Promise<URL[]> {
    const $ = await this.loadWithCheerio();
    const childrenUrls: URL[] = [];
    const childrenElements = $(filterNode).find('a');
    for (let i = 0; i < childrenElements.length; ++i) {
      const element = childrenElements[i.toString()];
      // 全角英数字などがまぎれていることがあるのでNFKCで正規化する
      const linkText = element.attribs.href.normalize('NFKC');
      if (linkText.startsWith('http://') || linkText.startsWith('https://')) {
        const childUrl = new URL(linkText);
        childrenUrls.push(childUrl);
      } else if (linkText.startsWith('/')) {
        const childUrl = new URL(this.baseUrl.origin);
        childUrl.pathname = element.attribs.href;
        childrenUrls.push(childUrl);
      } else {
        const childUrl = new URL(this.baseUrl.href);
        let pathname = '';
        if (childUrl.pathname.endsWith('/')) {
          pathname = path.join(childUrl.pathname, element.attribs.href);
        } else {
          pathname = path.join(path.dirname(childUrl.pathname), element.attribs.href);
        }
        childUrl.pathname = pathname.split(path.sep).join('/');
        childrenUrls.push(childUrl);
      }
    }
    return childrenUrls;
  }

  abstract downloadFileUrls(): Promise<URL[]>;
}
