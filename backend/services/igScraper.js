// Puppeteer script to scrape followers from IG competitor account with session validation

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { saveFollowersToDB } = require('../lib/supabaseClient');

puppeteer.use(StealthPlugin());

// ✅ Helper to validate session cookies
async function isSessionValid(session_cookie) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
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

    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
    const content = await page.content();
    const isLoggedOut = content.includes('Log in') || content.includes('session expired');
    return !isLoggedOut;
  } catch (err) {
    console.error('❌ Session check error:', err);
    return false;
  } finally {
    await browser.close();
  }
}

async function scrapeFollowers({ userId, competitorUsername, session_cookie }) {
  const isValid = await isSessionValid(session_cookie);
  if (!isValid) {
    console.log(`⛔ Invalid session for user ${userId}. Skipping scrape.`);
    return;
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
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

    await page.goto(`https://www.instagram.com/${competitorUsername}/followers`, {
      waitUntil: 'networkidle2',
    });

    const usernames = await page.evaluate(() => {
      let links = Array.from(document.querySelectorAll('a[href*="/"]'));
      let followers = links
        .map(a => {
          const match = a.href.match(/instagram\.com\/([^\/]+)\//);
          return match ? match[1] : null;
        })
        .filter(u => !!u);
      return followers.slice(0, 100);
    });

    await saveFollowersToDB(userId, competitorUsername, usernames);
  } catch (error) {
    console.error('Scraper error:', error);
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeFollowers, isSessionValid };
