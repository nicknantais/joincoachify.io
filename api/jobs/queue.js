const { Queue } = require('bullmq');
require('dotenv').config();

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const storyLikeQueue = new Queue('story-like-runner', { connection });

module.exports = {
  storyLikeQueue
};
