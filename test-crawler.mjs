import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.text().includes('[UNIT FAIL]') || msg.text().includes('[STARTUP]')) {
         console.log(msg.text());
    }
  });

  await page.goto('http://localhost:3000');
  
  // Wait for 5 seconds for tests to finish
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // get results
  const failed = await page.evaluate(() => {
     let failures = 0;
     const walk = (suite) => {
         if (!suite) return;
         if (suite.children) {
             suite.children.forEach(c => walk(c));
         }
         if (suite.failedExpectations) {
             failures += suite.failedExpectations.length;
         }
     }
     if (window.jasmine && window.jasmine.getEnv) {
         walk(window.jasmine.getEnv().topSuite());
     }
     return failures;
  });
  
  console.log(`Failed jasmine tests: ${failed}`);
  await browser.close();
})();
