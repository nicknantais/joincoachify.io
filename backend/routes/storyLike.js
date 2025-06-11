const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.get('/progress/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const { data, error } = await supabase
      .from('story_targets')
      .select('status, count(*)')
      .eq('user_id', userId)
      .group('status');

    if (error) {
      throw error;
    }

    const result = {
      pending: 0,
      completed: 0,
      failed: 0
    };

    for (const row of data) {
      result[row.status] = parseInt(row.count);
    }

    return res.status(200).json({ success: true, userId, progress: result });
  } catch (err) {
    console.error('❌ Failed to fetch progress:', err);
    return res.status(500).json({ error: 'Failed to fetch user progress' });
  }
});

module.exports = router;
