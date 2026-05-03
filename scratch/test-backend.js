const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/inventory',
  method: 'GET',
  timeout: 5000
};

console.log("Requesting http://127.0.0.1:5000/api/inventory ...");
const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response received.');
    try {
        const json = JSON.parse(data);
        console.log(`Count: ${json.length}`);
    } catch (e) {
        console.log('Not JSON:', data.substring(0, 100));
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.on('timeout', () => {
  console.error('Request timed out');
  req.destroy();
});

req.end();
