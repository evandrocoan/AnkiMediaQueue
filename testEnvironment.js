/* Copyright: Ankitects Pty Ltd and contributors
 * License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html */
const puppeteer = require('puppeteer');

// const TestEnvironment = require('jest-environment-node'); // for server node apps
const TestEnvironment = require('jest-environment-jsdom'); // for browser js apps

class ExpressEnvironment extends TestEnvironment {
    constructor(config, context) {
        let cloneconfig = Object.assign({}, config);
        cloneconfig.testURL = process.env.SERVER_ADDRESS;
        super(cloneconfig, context);
    }

    async setup() {
        await super.setup();
        let PUPPETEER_BROWSER_ENDPOINT = process.env.PUPPETEER_BROWSER_ENDPOINT;
        if(!PUPPETEER_BROWSER_ENDPOINT) {
            throw new Error("Missing the PUPPETEER_BROWSER_ENDPOINT environment variable!");
        }

        let browser = await puppeteer.connect({browserWSEndpoint: PUPPETEER_BROWSER_ENDPOINT});
        let page = await browser.newPage();

        // closes the default blank page because it may open with invalid contents
        // https://github.com/puppeteer/puppeteer/issues/5737
        let [default_page] = await browser.pages();
        await default_page.close();
        let pagelogs = [];

        page.on('console', async msg => {
            const consoleMap = {
                'warning' : 'warn',
                'startGroup' : 'group',
                'endGroup' : 'groupEnd',
            };

            let msgType = msg._type;
            if(consoleMap[msgType]) {
                msgType = consoleMap[msgType];
            }
            else if(typeof console[msgType] === "undefined") {
                console.warn(`UNKNOWN CONSOLE TYPE: ${msgType}`);
                msgType = 'warn';
            }

            let items = [...await Promise.all(msg.args().map(arg => arg.jsonValue() /* arg.toString() */ ))];
            pagelogs.push(...items);
            console[msgType](...items);
        });
        this.global.page = page;
        this.global.pagelogs = pagelogs;
        this.global.browser = browser;
        this.global.jsdom = this.dom;
    }

    async teardown() {
        let browser = this.global.browser;

        // https://github.com/facebook/jest/issues/9867
        if(browser && "disconnect" in browser) {
            await browser.disconnect();
        }
        else {
            console.log("Warning: The ExpressEnvironment::setup() function did not run successfully!");
        }
        await super.teardown();
    }

    runScript(script) {
        return super.runScript(script);
    }
}

module.exports = ExpressEnvironment;
