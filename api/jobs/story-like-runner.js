require('dotenv').config();

const express = require('express');
const cron = require('node-cron');
const { Worker, Queue } = require('bullmq');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

// ✅ Import Express routes
const igSessionRoute = require('./backend/routes/igSession');
const competitorRoute = require('./backend/routes/competitor');
const storyLikeRoute = require('./backend/routes/storyLike');
const stripeWebhookRoute = require('./backend/routes/stripeWebhook'); // ✅ NEW
const testTriggerRoute = require('./backend/routes/testTrigger'); // ✅ NEW

// ✅ Mount routes
app.use('/ig', igSessionRoute);
app.use('/competitor', competitorRoute);
app.use('/api/story', storyLikeRoute);
app.use('/webhook/stripe', stripeWebhookRoute); // ✅ NEW
app.use('/api/test', testTriggerRoute); // ✅ NEW

// ✅ Start API server
app.listen(3000, () => {
  console.log('🚀 Express server running on port 3000');
});

// 🖁 Queue + Worker Setup
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
};

const storyQueue = new Queue('story-like-queue', { connection });

// 👇 DB helper functions
const {
  getStoryTargetsForUser,
  markTargetAsCompleted,
  insertNewStoryTargets
} = require('./backend/lib/supabaseClient');

// ✅ Worker to process story view jobs
const worker = new Worker('story-like-queue', async job => {
  const { igUsername, session_cookie, userId } = job.data;
  console.log(`🧠 Starting story-like for ${igUsername}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    await page.setCookie({
      name: 'sessionid',
      value: session_cookie,
      domain: '.instagram.com',
      path: '/',
      httpOnly: true,
      secure: true
    });

    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
    console.log(`✅ Logged in as ${igUsername}`);

    const targets = await getStoryTargetsForUser(userId);

    if (!targets.length) {
      console.log(`⚠️ No story targets for user ${userId}`);
      return;
    }

    for (const username of targets) {
      try {
        const url = `https://www.instagram.com/stories/${username}/`;
        await page.goto(url, { waitUntil: 'networkidle2' });
        await page.waitForTimeout(3000);

        await markTargetAsCompleted(userId, username);
        console.log(`✅ Viewed and marked complete: ${username}`);
      } catch (err) {
        console.error(`❌ Failed viewing ${username}:`, err);
      }
    }

    console.log(`✅ Finished story view job for ${igUsername}`);
  } catch (err) {
    console.error('❌ Puppeteer error:', err);
  } finally {
    await browser.close();
  }
}, { connection });

console.log('👀 Story-like worker is listening for jobs...');

// 🥒 CRON: Sync + Queue Targets Every 12 Hours
const ACTIVE_USERS = [/* TODO: Replace with real Supabase user IDs */];

cron.schedule('0 */12 * * *', async () => {
  console.log('⏰ CRON: Syncing story targets...');

  for (const userId of ACTIVE_USERS) {
    try {
      await insertNewStoryTargets(userId);
      const targets = await getStoryTargetsForUser(userId);

      if (!targets.length) {
        console.log(`⚠️ No targets for ${userId}`);
        continue;
      }

      await storyQueue.add('story-job', {
        userId,
        igUsername: 'placeholder',
        session_cookie: 'placeholder'
      });

      console.log(`✅ Queued story job for user ${userId}`);
    } catch (err) {
      console.error(`❌ Error during cron for user ${userId}:`, err);
    }
  }

  console.log('⏳ CRON complete.');
});


