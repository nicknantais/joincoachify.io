const express = require('express');
const router = express.Router();
const { loginAndSaveSession } = require('../services/igLogin');

// POST /ig/login
router.post('/login', async (req, res) => {
  const { username, password, userId } = req.body;

  if (!username || !password || !userId) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    const result = await loginAndSaveSession(username, password, userId);
    
    if (result.success) {
      return res.json({ success: true, message: 'Instagram session saved.' });
    } else {
      return res.status(500).json({ success: false, message: result.error });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;
