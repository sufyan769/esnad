const https = require('https');
const APP_ID = '88G4AVERCC';
const API_KEY = '33b0b484f534b2ae2dac948d588345a6';
const INDEX_NAME = 'algolia_unified';

const makeRequest = (path, method = 'GET', data = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${APP_ID}-dsn.algolia.net`,
      path: `/1/indexes/${INDEX_NAME}${path}`,
      method: method,
      headers: {
        'X-Algolia-Application-Id': APP_ID,
        'X-Algolia-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
};

async function test() {
  const searchRes2 = await makeRequest('/query', 'POST', {
    params: `filters=id:847`
  });
  console.log("Hits via filters=id:847 :", searchRes2.hits?.length, "Message:", searchRes2.message);

  const searchRes3 = await makeRequest('/query', 'POST', {
    params: `filters=id="847"`
  });
  console.log("Hits via filters=id='847' :", searchRes3.hits?.length, "Message:", searchRes3.message);
  
  // What if we do empty query but limit to name "زبيد بن الحارث"?
  const searchRes4 = await makeRequest('/query', 'POST', {
    params: `query="زبيد بن الحارث"&hitsPerPage=10`
  });
  console.log("All chunks for this guy:", searchRes4.hits.filter(h => h.id === 847).map(h => h.objectID));

}

test();
