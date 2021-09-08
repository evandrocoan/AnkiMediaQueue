# Anki Media Queue

Use `export PUPPETEER_HEADLESS=false` to see a chrome windows running the tests.

Use `anki\qt\ts> npm test -- reviewer-exceptions.test.ts` to run a single test file

1. `npm run build`
1. `npm run test`
1. `npm install --no-optional`

Use this inside a test to pause its execution, allowing you to open the chrome console
and while keeping the express server running: chrome://inspect/#devices
```js
jest.setTimeout(2000000000);

(async () => await page.setDefaultTimeout(2000000000))();
(async () => await page.setDefaultNavigationTimeout(2000000000))();
debugger; await new Promise(function(resolve) {});
```

You can also create a `.env` on the root of this project to defining the following environment variables:
```bash
PUPPETEER_SLOWMO=500   # milliseconds
PUPPUPPETEER_CHROME_ARGS="--window-position=960,10"
PUPPETEER_HEADLESS=false
```
