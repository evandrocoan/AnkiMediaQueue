# Anki Media Queue

Use `export PUPPETEER_HEADLESS=false` to see a chrome windows running the tests.

1. `npm install --no-optional` (requires npm --version == 6.14.15 or superior)
1. `npm run build`
1. `npm run test`

Use `anki\qt\ts> npm test -- reviewer-exceptions.test.ts` to run a single test file

![](https://user-images.githubusercontent.com/5332158/80896475-faf41400-8cc4-11ea-9dcc-553569eb567b.gif)

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

### License

```
/* Copyright: Ankitects Pty Ltd and contributors
 * License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html */
```
