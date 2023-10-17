import { ScraperBase } from './scraper-base';

export class CGArtsScraper extends ScraperBase {
  async downloadFileUrls(): Promise<URL[]> {
    const childrenPageUrls = await this.loadChildrenPageUrls('div');
    return childrenPageUrls;
  }
}
