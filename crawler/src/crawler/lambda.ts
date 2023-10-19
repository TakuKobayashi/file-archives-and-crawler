import { Context, EventBridgeHandler, Callback } from 'aws-lambda';
import { IpaScraper } from './scrapers/ipa-scraper';
import { CGArtsScraper } from './scrapers/cgarts-scraper';
import { ScraperBase } from './scrapers/scraper-base';
import { CrawlerEventParams } from '@/interfaces/crawler-lambda-events';

export const event: EventBridgeHandler<string, any, void> = async (event: { [s: string]: any }, context: Context, callback: Callback) => {
  const crawlParams = event.crawlParams as CrawlerEventParams[];
  const downloadFilesAndUploadToGithubPromises: Promise<void>[] = [];
  for (const crawlParam of crawlParams) {
    let scraper: ScraperBase;
    if (crawlParam.crawlerType === 'ipa') {
      scraper = new IpaScraper(crawlParam.rootUrl);
    } else if (crawlParam.crawlerType === 'cgarts') {
      scraper = new CGArtsScraper(crawlParam.rootUrl);
    }
    downloadFilesAndUploadToGithubPromises.push(
      scraper.downloadFilesAndUploadToGithub(crawlParam.uploadGithubBranch, crawlParam.uploadGithubRootPath),
    );
  }
  await Promise.all(downloadFilesAndUploadToGithubPromises);
};
