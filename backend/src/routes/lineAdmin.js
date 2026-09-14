const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateToken } = require('../middlewares/auth');

const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// GET /users - Fetch all LINE users who have interacted with the bot
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const [users] = await req.db.query(`
      SELECT user_id, display_name, picture_url, is_bot_paused, needs_attention, last_interacted_at
      FROM line_users
      ORDER BY last_interacted_at DESC
    `);
    res.json(users);
  } catch (error) {
    console.error('Error fetching line users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /chat/:userId - Fetch chat history for a specific user
router.get('/chat/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  try {
    // Clear needs_attention when admin views the chat
    await req.db.query("UPDATE line_users SET needs_attention = FALSE WHERE user_id = ?", [userId]);

    const [history] = await req.db.query(`
      SELECT id, role, message, created_at
      FROM chat_history
      WHERE user_id = ?
      ORDER BY created_at ASC
    `, [userId]);
    res.json(history);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// POST /reply - Send a message to a user as an admin
router.post('/reply', authenticateToken, async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) {
    return res.status(400).json({ error: 'Missing userId or message' });
  }

  try {
    // Send via LINE Messaging API
    await axios.post('https://api.line.me/v2/bot/message/push', {
      to: userId,
      messages: [{ type: 'text', text: message }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
      }
    });

    // Save to chat_history as admin
    await req.db.query(`
      INSERT INTO chat_history (user_id, role, message)
      VALUES (?, 'admin', ?)
    `, [userId, message]);

    // Update last interacted
    await req.db.query(`
      UPDATE line_users SET last_interacted_at = CURRENT_TIMESTAMP WHERE user_id = ?
    `, [userId]);

    res.json({ success: true, message: 'Reply sent' });
  } catch (error) {
    console.error('Error sending reply:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// POST /broadcast - Send a message to all users in line_users (or via LINE broadcast endpoint)
router.post('/broadcast', authenticateToken, async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  try {
    // We can use the LINE Broadcast API which sends to all friends
    await axios.post('https://api.line.me/v2/bot/message/broadcast', {
      messages: [{ type: 'text', text: message }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
      }
    });

    // We could optionally log this broadcast in a new table, but for now we just return success
    res.json({ success: true, message: 'Broadcast sent to all users' });
  } catch (error) {
    console.error('Error sending broadcast:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// POST /toggle-bot - Turn AI answering on/off for a specific user
router.post('/toggle-bot', authenticateToken, async (req, res) => {
  const { userId, isPaused } = req.body;
  if (!userId || isPaused === undefined) {
    return res.status(400).json({ error: 'Missing userId or isPaused' });
  }

  try {
    await req.db.query(`
      UPDATE line_users SET is_bot_paused = ? WHERE user_id = ?
    `, [isPaused, userId]);

    res.json({ success: true, is_bot_paused: isPaused });
  } catch (error) {
    console.error('Error toggling bot status:', error);
    res.status(500).json({ error: 'Failed to toggle bot status' });
  }
});

// GET /bot-prompt - Get current bot system prompt
router.get('/bot-prompt', authenticateToken, async (req, res) => {
  try {
    const [rows] = await req.db.query("SELECT value FROM master_data WHERE category = 'BotPrompt' LIMIT 1");
    if (rows.length > 0) {
      res.json({ prompt: rows[0].value });
    } else {
      res.json({ prompt: '' });
    }
  } catch (error) {
    console.error('Error fetching bot prompt:', error);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// POST /bot-prompt - Update bot system prompt
router.post('/bot-prompt', authenticateToken, async (req, res) => {
  const { prompt } = req.body;
  if (prompt === undefined) {
    return res.status(400).json({ error: 'Missing prompt text' });
  }

  try {
    await req.db.query(`
      INSERT INTO master_data (category, value) 
      VALUES ('BotPrompt', ?) 
      ON DUPLICATE KEY UPDATE value = ?
    `, [prompt, prompt]);

    res.json({ success: true, message: 'Prompt updated successfully' });
  } catch (error) {
    console.error('Error updating bot prompt:', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

module.exports = router;
