const express = require('express');
const router = express.Router();
const { queueScrapeJob } = require('../jobs/competitorQueue');
const { insertNewStoryTargets } = require('../lib/supabaseClient');

// 🔁 Route: Add competitor to be scraped
router.post('/add', async (req, res) => {
  const { userId, competitorUsername } = req.body;

  if (!userId || !competitorUsername) {
    return res.status(400).json({ error: 'Missing userId or competitorUsername' });
  }

  try {
    await queueScrapeJob({ userId, competitorUsername });
    return res.status(200).json({ success: true, message: `Tracking ${competitorUsername}` });
  } catch (err) {
    console.error('❌ Error queuing competitor scrape:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 🔁 Route: Sync new followers → story_targets
router.post('/sync-targets', async (req, res) => {
  const { userId } = req.body;

  // 🔐 Optional bearer auth
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.INTERNAL_TRIGGER_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    await insertNewStoryTargets(userId);
    return res.status(200).json({ success: true, message: 'Story targets synced' });
  } catch (err) {
    console.error('❌ Failed to sync story targets:', err);
    return res.status(500).json({ error: 'Internal error syncing targets' });
  }
});

module.exports = router;
