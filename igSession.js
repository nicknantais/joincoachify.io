const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post('/save-session', async (req, res) => {
  const { userId, igUsername, sessionCookie } = req.body;

  if (!userId || !igUsername || !sessionCookie) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { error } = await supabase.from('igAccounts').insert([
      {
        user_id: userId,
        igUsername: igUsername,
        encryptedSession: sessionCookie,
      }
    ]);

    if (error) throw error;

    return res.status(200).json({ success: true, message: 'IG session saved and trigger queued' });
  } catch (err) {
    console.error('Failed to save session:', err.message);
    return res.status(500).json({ error: 'Failed to store IG session' });
  }
});

module.exports = router;
