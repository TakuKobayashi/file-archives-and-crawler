import type { AWS } from '@serverless/typescript';

import { config } from 'dotenv';
const configedEnv = config();

const serverlessConfiguration: AWS = {
  service: 'file-archives-crawler',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild', 'serverless-offline', 'serverless-dotenv-plugin'],
  provider: {
    name: 'aws',
    runtime: 'nodejs18.x',
    region: 'ap-northeast-1',
    timeout: 900,
    memorySize: 384,
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
    },
  },
  // import the function via paths
  functions: {
    crons: {
      handler: 'src/crawler/lambda.event',
      events: [
        {
          schedule: {
            rate: ['rate(30 minutes)'],
            enabled: true,
            input: {
              crawlParams: [
                {
                  rootUrl: 'https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html',
                  crawlerType: 'ipa',
                  uploadGithubRootPath: 'archives',
                  uploadGithubBranch: 'file-uploads',
                },
                {
                  rootUrl: 'https://www.cgarts.or.jp/v1/kentei/past/index.html',
                  crawlerType: 'cgarts',
                  uploadGithubRootPath: 'archives',
                  uploadGithubBranch: 'file-uploads',
                },
              ],
            },
          },
        },
      ],
    },
  },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node18',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
    dotenv: {
      path: './.env',
      include: Object.keys(configedEnv.parsed),
    },
  },
};

module.exports = serverlessConfiguration;
