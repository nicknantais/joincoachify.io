const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ Save scraped competitor followers to DB
async function saveFollowersToDB(userId, competitorUsername, usernames) {
  const uniqueUsernames = [...new Set(usernames)];

  const entries = uniqueUsernames.map(username => ({
    user_id: userId,
    competitor: competitorUsername,
    ig_username: username,
    status: 'new',
    added_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('competitor_followers').insert(entries);

  if (error) {
    console.error('❌ Error saving followers to DB:', error);
  }
}

// ✅ Fetch pending story targets for a user
async function getStoryTargetsForUser(userId) {
  const { data, error } = await supabase
    .from('story_targets')
    .select('ig_username')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .limit(10);

  if (error) {
    console.error('❌ Error loading targets:', error);
    return [];
  }

  return data.map(row => row.ig_username);
}

// ✅ Mark a story target as completed
async function markTargetAsCompleted(userId, ig_username) {
  const { error } = await supabase
    .from('story_targets')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('ig_username', ig_username);

  if (error) {
    console.error('❌ Failed to mark as completed:', error);
  }
}

// ✅ Insert new story targets from fresh competitor followers
async function insertNewStoryTargets(userId) {
  const { data, error } = await supabase
    .from('competitor_followers')
    .select('ig_username')
    .eq('user_id', userId)
    .eq('status', 'new');

  if (error) {
    console.error('❌ Failed fetching new followers:', error);
    return;
  }

  const unique = [...new Set(data.map(f => f.ig_username))];
  if (unique.length === 0) return;

  const insertPayload = unique.map(username => ({
    user_id: userId,
    ig_username: username,
    status: 'pending',
    added_at: new Date().toISOString()
  }));

  const { error: insertError } = await supabase
    .from('story_targets')
    .insert(insertPayload, { onConflict: ['user_id', 'ig_username'] });

  if (insertError) {
    console.error('❌ Failed inserting into story_targets:', insertError);
  } else {
    console.log(`✅ Inserted ${insertPayload.length} new story targets`);
  }

  // ✅ Mark these as queued in competitor_followers
  await supabase
    .from('competitor_followers')
    .update({ status: 'queued' })
    .eq('user_id', userId)
    .eq('status', 'new');
}

module.exports = {
  saveFollowersToDB,
  getStoryTargetsForUser,
  markTargetAsCompleted,
  insertNewStoryTargets
};

