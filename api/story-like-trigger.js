require('dotenv').config();
const express = require('express');
const { Queue } = require('bullmq');

const router = express.Router();

// 🔗 Redis connection config
const connection = {
  host: 'localhost',
  port: 6379
};

// 🎯 Initialize BullMQ queue
const storyLikeQueue = new Queue('story-like-queue', { connection });

// 🚀 POST /api/story/story-like
router.post('/story-like', express.json(), async (req, res) => {
  // 🔐 Authorization check
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (token !== process.env.INTERNAL_TRIGGER_SECRET) {
    console.warn('🔒 Rejected request with invalid token');
    return res.status(403).json({ success: false, message: 'Forbidden: Invalid token' });
  }

  // ✅ Payload validation
  const { igUsername, session_cookie } = req.body;

  if (!igUsername || !session_cookie) {
    return res.status(400).json({ success: false, message: 'Missing igUsername or session_cookie' });
  }

  try {
    // 🧠 Queue job
    await storyLikeQueue.add('story-like-job', {
      igUsername,
      session_cookie
    });

    console.log(`📨 Job successfully queued for ${igUsername}`);
    res.status(200).json({ success: true, message: 'Story-like job queued.' });
  } catch (err) {
    console.error('❌ Failed to queue job:', err);
    res.status(500).json({ success: false, message: 'Queue error.' });
  }
});

module.exports = router;

