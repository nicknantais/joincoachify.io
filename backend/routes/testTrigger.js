const express = require('express');
const router = express.Router();
const { Queue } = require('bullmq');

const storyQueue = new Queue('story-like-queue', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

router.post('/story-job', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    await storyQueue.add('story-job', {
      userId,
      igUsername: 'dummy_ig_user',
      session_cookie: 'dummy_cookie_here'
    });

    return res.status(200).json({
      success: true,
      message: `✅ Dummy story job queued for user ${userId}`
    });
  } catch (err) {
    console.error('❌ Error queuing story job:', err);
    return res.status(500).json({ error: 'Failed to queue job' });
  }
});

module.exports = router;
