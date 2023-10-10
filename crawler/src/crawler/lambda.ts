import { Context, EventBridgeHandler, EventBridgeEvent, Callback } from 'aws-lambda';

export const event: EventBridgeHandler<string, any, void> = function (
  event: EventBridgeEvent<string, any>,
  context: Context,
  callback: Callback,
) {
  console.log('test');
  // { key1: 'value1', key2: 'value2', stageParams: { stage: 'dev' } }
  console.log(event);
  /*
  INFO	{
  callbackWaitsForEmptyEventLoop: [Getter/Setter],
  succeed: [Function (anonymous)],
  fail: [Function (anonymous)],
  done: [Function (anonymous)],
  functionVersion: '$LATEST',
  functionName: 'resource-crawler-api-dev-crons',
  memoryLimitInMB: '128',
  logGroupName: '/aws/lambda/resource-crawler-api-dev-crons',
  logStreamName: '2022/05/30/[$LATEST]cbef64784d8b4c1c8e730ff6395af2c7',
  clientContext: undefined,
  identity: undefined,
  invokedFunctionArn: 'arn:aws:lambda:ap-northeast-1:071477189111:function:resource-crawler-api-dev-crons',
  awsRequestId: 'b4557567-ee75-4ccb-9dd4-1a5fa8fdd30e',
  getRemainingTimeInMillis: [Function: getRemainingTimeInMillis]
}
2022-05-30T20:22:48.792Z b4557567-ee75-4ccb-9dd4-1a5fa8fdd30e INFO { callbackWaitsForEmptyEventLoop: [Getter/Setter], succeed: [Function (anonymous)], fail: [Function (anonymous)], done: [Function (anonymous)], functionVersion: '$LATEST', functionName: 'resource-crawler-api-dev-crons', memoryLimitInMB: '128', logGroupName: '/aws/lambda/resource-crawler-api-dev-crons', logStreamName: '2022/05/30/[$LATEST]cbef64784d8b4c1c8e730ff6395af2c7', clientContext: undefined, identity: undefined, invokedFunctionArn: 'arn:aws:lambda:ap-northeast-1:071477189111:function:resource-crawler-api-dev-crons', awsRequestId: 'b4557567-ee75-4ccb-9dd4-1a5fa8fdd30e', getRemainingTimeInMillis: [Function: getRemainingTimeInMillis] }
  */
  console.log(context);
  // [Function (anonymous)]
  console.log(callback);
};
