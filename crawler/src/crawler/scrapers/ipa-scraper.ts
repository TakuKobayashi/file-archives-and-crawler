import { ScraperBase } from './scraper-base';

export class IpaScraper extends ScraperBase {
  async downloadFileUrls(): Promise<URL[]> {
    const childrenPageUrls = await this.loadChildrenPageUrls('ul.card-link');
    const downloadFileUrlPromises: Promise<URL[]>[] = [];
    for (const childrenPageUrl of childrenPageUrls) {
      const childScraper = new IpaScraper(childrenPageUrl.href);
      downloadFileUrlPromises.push(childScraper.loadChildrenPageUrls('div.def-list__wrap'));
    }
    const downloadUrlsArray = await Promise.all(downloadFileUrlPromises);

    return downloadUrlsArray.flat();
  }
}
