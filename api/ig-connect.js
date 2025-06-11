require('dotenv').config();
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const CryptoJS = require('crypto-js');
const { Queue } = require('bullmq');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 📦 Initialize BullMQ queue
const storyLikeQueue = new Queue('story-like-queue', {
  connection: {
    host: 'localhost',
    port: 6379
  }
});

router.post('/ig/connect', express.json(), async (req, res) => {
  const { userId, igUsername, session_cookie } = req.body;

  if (!userId || !igUsername || !session_cookie) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const encryptedSession = CryptoJS.AES.encrypt(session_cookie, process.env.SESSION_SECRET).toString();
    const encryptedUsername = CryptoJS.AES.encrypt(igUsername, process.env.SESSION_SECRET).toString();

    const { data: user } = await supabase
      .from('users')
      .select('maxAccounts')
      .eq('id', userId)
      .single();

    const { count } = await supabase
      .from('igAccounts')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId);

    if (count >= user.maxAccounts) {
      return res.status(403).json({ error: 'Plan limit reached. Upgrade to add more accounts.' });
    }

    const { data, error } = await supabase.from('igAccounts').insert([{
      userId,
      igUsername: encryptedUsername,
      encryptedSession,
      status: 'valid',
      isPrimary: count === 0
    }]);

    if (error) {
      console.error('DB insert error:', error);
      return res.status(500).json({ error: 'Database error.' });
    }

    // 📨 Auto-trigger story-like queue
    await storyLikeQueue.add('likeStories', {
      igUsername,
      session_cookie
    });

    console.log(`📨 Auto-queued story-like for ${igUsername}`);

    res.status(200).json({ success: true, message: 'Instagram session stored & story-like queued.' });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
