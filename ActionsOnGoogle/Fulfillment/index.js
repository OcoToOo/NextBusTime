'use strict';

const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const client = require('cheerio-httpcli');

process.env.DEBUG = 'dialogflow:debug';

const DSMK = 2890;
const RAMK = 124;

const terminalMap = new Map();
terminalMap.set("大井町駅", ["大井町", "品川駅"]);
terminalMap.set("大森駅", ["蒲田駅", "池上駅", "池上営"]);

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  const agent = new WebhookClient({ request, response });

  function askNextBusTime(agent) {
    const destination = agent.parameters.destination;
    console.log('destination: ' + destination);

    let response;

    const nextBusTimes = getNextBusTimesFromTokyuBusNavi(terminalMap.get(destination));
    if (nextBusTimes.length > 0) {
      response = destination + ` 行きの次のバスは` + nextBusTimes[0] + `分後に来ます。`;
      if (nextBusTimes.length > 1) {
      　response += `その次のバスは` + nextBusTimes[1] + `分後`;
        if (nextBusTimes.length > 2) {
          response += `、さらにその次のバスは` + nextBusTimes[2] + `分後`;
        }
        response += `に来ます。`;
      }
    } else {
      response = destination + `行きの次のバスは発車準備中です。`;
    }

    agent.add(response);
  }

  function getNextBusTimesFromTokyuBusNavi(terminals) {
    const nextBusTimes = [];

    const url = 'http://tokyu.bus-location.jp/blsys/navi?VID=rsl&EID=nt&DSMK=' + DSMK + '&RAMK=' + RAMK;

    console.time('fetchSync');
    const res = client.fetchSync(url);
    console.timeEnd('fetchSync');

    res.$('dd').each(function() {
      const text = res.$(this).text();
      if (text.includes("分待ち")) {
        terminals.forEach(function(terminal) {
          if (text.includes(terminal)) {
            nextBusTimes.push(Number(text.substr(text.length-5, 2)));
          }
        });
      }
    });

    nextBusTimes.sort(function(a, b) {
      return (a > b) ? 1 : -1;
    });

    return nextBusTimes;
  }

　const intentMap = new Map();
  intentMap.set('Ask Next Bus Time Intent', askNextBusTime);
  agent.handleRequest(intentMap);
});
