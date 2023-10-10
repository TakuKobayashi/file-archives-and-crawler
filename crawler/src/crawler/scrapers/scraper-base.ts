import * as cheerio from 'cheerio';
import axios from 'axios';

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
      const childUrl = new URL(this.baseUrl.origin);
      childUrl.pathname = element.attribs.href;
      childrenUrls.push(childUrl);
    }
    return childrenUrls;
  }
}
