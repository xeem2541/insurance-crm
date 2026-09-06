require('dotenv').config();
const https = require('https');

const options = {
  hostname: 'api.line.me',
  path: '/v2/bot/info',
  headers: {
    'Authorization': 'Bearer ' + process.env.LINE_CHANNEL_ACCESS_TOKEN
  }
};

https.get(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const info = JSON.parse(data);
      console.log('BOT_ID: ' + info.basicId);
    } catch(e) {
      console.log('Error parsing: ', data);
    }
  });
}).on('error', err => {
  console.log('Error: ', err.message);
});
