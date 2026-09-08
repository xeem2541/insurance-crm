const axios = require('axios');
async function test() {
  try {
    const payload = {
      "destination": "Uxxx",
      "events": [
        {
          "type": "message",
          "message": {
            "type": "text",
            "id": "1234567890",
            "text": "???????????? Honda City ?? 2020 ????"
          },
          "timestamp": 1625665242211,
          "source": {
            "type": "user",
            "userId": "U72b9aeb69c6fdb4bc6283db856abf21f"
          },
          "replyToken": "nHuyWiB7yP5Zw52FIkcQobQuGDXCTA",
          "mode": "active"
        }
      ]
    };
    const res = await axios.post('https://insurance-crm-kpff.onrender.com/api/webhook', payload);
    console.log(res.status, res.data);
  } catch (err) {
    console.error(err.message);
  }
}
test();
