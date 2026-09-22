const express = require('express');
const router = express.Router();
const axios = require('axios');

// Proxy LINE Image Content
router.get('/image/:messageId', async (req, res) => {
  const messageId = req.params.messageId;
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    return res.status(500).send('LINE_CHANNEL_ACCESS_TOKEN is not configured');
  }

  try {
    const response = await axios({
      method: 'get',
      url: `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'stream'
    });

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Pipe the image stream directly to the response
    response.data.pipe(res);
  } catch (error) {
    console.error(`Error proxying LINE image ${messageId}:`, error.message);
    res.status(404).send('Image not found or expired');
  }
});

module.exports = router;
