export interface CrawlerEventParams {
  rootUrl: string;
  crawlerType: CrawlerType;
  uploadGithubRootPath: string;
  uploadGithubBranch: string;
}

type CrawlerType = 'ipa' | 'cgarts';
