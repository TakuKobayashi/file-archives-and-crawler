import * as cheerio from 'cheerio';
import axios from 'axios';
import { chunk } from 'lodash';
import * as path from 'path';
import * as Encoding from 'encoding-japanese';
import { Github } from '@/util/github';
import { RecordFileInfo } from '@/interfaces/archive-file-metum';

export abstract class ScraperBase {
  protected baseUrl: URL;

  constructor(baseUrl: string) {
    this.baseUrl = new URL(baseUrl);
  }

  async loadWithCheerio(): Promise<cheerio.CheerioAPI> {
    const res = await axios.get(this.baseUrl.href, { responseType: 'arraybuffer' });
    const unicodeBody = Encoding.convert(res.data, { to: 'UNICODE', from: Encoding.detect(res.data) });
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

  async downloadFilesAndUploadToGithub(uploadBranchName: string, fileRootPath: string): Promise<void> {
    const downloadFileUrls = await this.downloadFileUrls();
    await this.downloadFilesAndUploadToGithubFromUrls(uploadBranchName, fileRootPath, downloadFileUrls);
  }

  async downloadFilesAndUploadToGithubFromUrls(uploadBranchName: string, fileRootPath: string, downloadUrls: URL[]): Promise<void> {
    const recordFiles: RecordFileInfo[] = [];
    const github = new Github(process.env.UPLOAD_FILE_REPO);
    const pathTreeMap = await github.loadPathTreeMap(uploadBranchName);
    const chunkDownloadFileUrls = chunk(downloadUrls, 20);
    for (const downloadFileUrls of chunkDownloadFileUrls) {
      const blobWithPathes = [];
      for (const downloadFileUrl of downloadFileUrls) {
        const willSavePath = path.join(fileRootPath, downloadFileUrl.hostname, downloadFileUrl.pathname).split(path.sep).join('/');
        if (pathTreeMap.has(willSavePath)) {
          continue;
        }
        // メモリの使用量削減のため直列に実行する
        const fileContentResponse = await axios.get(downloadFileUrl.href, { responseType: 'arraybuffer' });
        const uploadedBlob = await github.uploadFile(fileContentResponse.data);
        blobWithPathes.push({
          savepath: willSavePath,
          blob: uploadedBlob,
        });
        recordFiles.push({
          downloadFileUrl: downloadFileUrl,
          filePath: willSavePath,
          filename: path.basename(downloadFileUrl.pathname),
          githubFileSha: uploadedBlob.sha,
        });
      }
      if (blobWithPathes.length <= 0) {
        continue;
      }

      await github.commitFromUploadBlobs(blobWithPathes);
      blobWithPathes.splice(0);
    }
    await github.recordFilesData(
      { rootDirPath: 'archives-database', rootInfoFileName: '_root.json', hostnameInfoFileName: '_dbfile.json' },
      {
        rootUrl: this.baseUrl,
        recordFiles: recordFiles,
      },
    );
  }
}
