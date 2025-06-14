const express = require('express');
const router = express.Router();
const { loginAndSaveSession } = require('../services/igLogin');  // ✅ Use your puppeteer login function

// POST /ig/save-session
router.post('/save-session', async (req, res) => {
  const { username, password, userId } = req.body;

  if (!username || !password || !userId) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    const result = await loginAndSaveSession(username, password, userId);
    if (result.success) {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ success: false, message: result.error });
    }
  } catch (err) {
    console.error('❌ Error in save-session route:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
