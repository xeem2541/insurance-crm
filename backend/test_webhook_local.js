const express = require('express');
const axios = require('axios');
require('dotenv').config();
const { pool } = require('./src/db');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.db = pool;
  next();
});

const webhookRouter = require('./src/routes/webhook');
app.use('/api/webhook', webhookRouter);

app.listen(5001, async () => {
  console.log('Local server running on 5001');
  try {
    const payload = {
      "destination": "Uxxx",
      "events": [
        {
          "type": "message",
          "message": {
            "type": "text",
            "id": "1234567890",
            "text": "??????? Honda City ?? 2020 ????"
          },
          "timestamp": 1625665242211,
          "source": {
            "type": "user",
            "userId": "U72b9aeb69c6fdb4bc6283db856abf21f"
          },
          "replyToken": "dummyToken12345",
          "mode": "active"
        }
      ]
    };
    const res = await axios.post('http://localhost:5001/api/webhook', payload);
    console.log('Response:', res.data);
    
    // wait for a bit for background processing to finish
    setTimeout(() => process.exit(0), 10000);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
