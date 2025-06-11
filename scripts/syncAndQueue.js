require('dotenv').config();
const { insertNewStoryTargets, getStoryTargetsForUser } = require('../backend/lib/supabaseClient');
const { Queue } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
};

const storyQueue = new Queue('story-like-queue', { connection });

async function run() {
  const userIds = [ /* hardcode or fetch active users here */ ];

  for (const userId of userIds) {
    console.log(`🔄 Syncing for user ${userId}`);

    await insertNewStoryTargets(userId);

    const targets = await getStoryTargetsForUser(userId);

    if (targets.length === 0) {
      console.log(`⚠️ No pending story targets for ${userId}`);
      continue;
    }

    console.log(`📬 Queueing ${targets.length} targets for user ${userId}`);

    await storyQueue.add('story-job', {
      userId,
      igUsername: 'your_ig_account',      // Optional: for login context
      session_cookie: 'your_cookie_here'  // You’ll replace this dynamically
    });
  }

  console.log('✅ Done syncing + queuing.');
  process.exit(0);
}

run().catch(console.error);
