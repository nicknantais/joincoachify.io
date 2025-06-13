const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { saveSessionToDB } = require('../lib/supabaseClient'); // ✅ you already have supabase connected

puppeteer.use(StealthPlugin());

async function loginAndSaveSession(username, password, userId) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });

    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', username, { delay: 100 });
    await page.type('input[name="password"]', password, { delay: 100 });

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);

    // ✅ wait for potential verification (can expand here later)
    await page.waitForTimeout(3000);

    const cookies = await page.cookies();
    const sessionCookie = cookies.find(c => c.name === 'sessionid');

    if (!sessionCookie) {
      throw new Error('Failed to retrieve session cookie.');
    }

    // ✅ Save to Supabase using your helper
    await saveSessionToDB(userId, sessionCookie.value);

    console.log('✅ Session cookie saved successfully');
    return { success: true };

  } catch (err) {
    console.error('❌ Login failed:', err);
    return { success: false, error: err.message };
  } finally {
    await browser.close();
  }
}

module.exports = { loginAndSaveSession };
