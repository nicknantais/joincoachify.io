// BullMQ queue setup for scraping competitor followers

const { Queue } = require('bullmq');
const Redis = require('ioredis');

const redisConnection = new Redis(process.env.REDIS_URL);
const competitorQueue = new Queue('competitor-scrape-queue', {
  connection: redisConnection,
});

async function queueScrapeJob({ userId, competitorUsername }) {
  await competitorQueue.add('scrapeFollowers', { userId, competitorUsername });
}

module.exports = { competitorQueue, queueScrapeJob };

