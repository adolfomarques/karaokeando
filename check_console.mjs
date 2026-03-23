import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request =>
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText)
  );

  console.log('Navigating...');
  const response = await page.goto('https://karaokefactory.org/', { waitUntil: 'networkidle2' });
  console.log('Response status:', response.status());

  await browser.close();
})();
