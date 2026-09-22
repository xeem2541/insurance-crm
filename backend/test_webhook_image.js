require('dotenv').config({ path: '../.env' });
const crypto = require('crypto');
const axios = require('axios');

async function testWebhookImage() {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  
  // Dummy payload simulating an image upload from the user
  const payload = {
    "destination": "Uxxx",
    "events": [
      {
        "type": "message",
        "message": {
          "type": "image",
          "id": "12345678901234"
        },
        "webhookEventId": "dummy_event_id",
        "deliveryContext": {
          "isRedelivery": false
        },
        "timestamp": Date.now(),
        "source": {
          "type": "user",
          "userId": "U90bf2669b1d454c38d3879b9bd7a3a24" 
        },
        "replyToken": "dummy_reply_token",
        "mode": "active"
      }
    ]
  };

  const bodyString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('SHA256', channelSecret)
    .update(bodyString)
    .digest('base64');

  try {
    console.log('Sending mock image webhook to local server...');
    const response = await axios.post('http://localhost:5001/api/webhook', payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-line-signature': signature
      }
    });
    console.log('Webhook Server Response:', response.data);
    console.log('If successful, you should receive a notification on LINE.');
  } catch (error) {
    console.error('Error hitting webhook:', error.response ? error.response.data : error.message);
  }
}

testWebhookImage();