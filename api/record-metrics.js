const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Debugging log
console.log("🔐 Using Supabase Key:", process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 12) + "...");

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Route to record metrics
router.post('/record-metrics', async (req, res) => {
  const { email, leads, interactions, followers, conversations, calls_booked } = req.body;

  const { data, error } = await supabase
    .from('metrics_snapshot')
    .insert([{
      user_email: email,
      leads,
      interactions,
      followers,
      conversations,
      calls_booked
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Error saving metrics:', error);
    return res.status(500).json({ success: false, error });
  }

  console.log('📊 Recorded metrics for', email);
  res.status(200).json({ success: true, data });
});

module.exports = router;
