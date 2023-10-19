import { Context, EventBridgeHandler, EventBridgeEvent, Callback } from 'aws-lambda';
//import { IpaScraper } from './scrapers/ipa-scraper';
//import { CGArtsScraper } from './scrapers/cgarts-scraper';
//import { CrawlerEventParams } from "@/interfaces/crawler-lambda-events"

export const event: EventBridgeHandler<string, any, void> = async function (
  event: EventBridgeEvent<string, any>,
  context: Context,
  callback: Callback,
) {
  console.log('test');
  console.log(event);
  console.log(event.detail);
  console.log(context);
  console.log(callback);
};
