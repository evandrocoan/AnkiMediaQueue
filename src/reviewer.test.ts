/* Copyright: Ankitects Pty Ltd and contributors
 * License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html */
/// <reference path="./reviewer.ts" />

import "./ankimedia";
const { ANKI_MEDIA_QUEUE_PREVIEW_TIMEOUT } = require("./ankimedia");

// Jest is not showing which on which line the timeout is happening.
// https://github.com/facebook/jest/issues/9881#issuecomment-654627853
const g_wait_timeout = 5000;

jest.disableAutomock();
jest.setTimeout(g_wait_timeout + 1000);

describe("Test question and answer audios", () => {
    let self: any = global;
    let page = self.page;
    let pagelogs = self.pagelogs;
    let address = process.env.SERVER_ADDRESS;

    var cardTemplate = (media_tag, setup_code, first_text) => {
        return `${first_text}
        <input type="button" value="x0.6" onclick="setAnkiMedia( media => { media.playbackRate = 0.6; } )">
        <input type="button" value="x10.6" onclick="setAnkiMedia( media => { media.playbackRate = 10.6; } )">
        ${media_tag}
        <script type="text/javascript">
            ${setup_code}
        </script>`;
    };

    var questionTemplate = (file_name, setup_code) => {
        return cardTemplate(
            `<audio src="${file_name}" controlslist="nodownload" controls></audio>`,
            setup_code,
            `What is the past simple of the verb to bumb?<br>`
        );
    };

    var answerTemplate = (file_name, setup_code) => {
        return cardTemplate(
            `<audio src="${file_name}" controlslist="nodownload" controls></audio>`,
            setup_code,
            `<hr id="answer">The past simple is to boobs.<br>`
        );
    };

    var dataSpeedTemplate = (file_name, setup_code) => {
        return cardTemplate(
            `<audio src="${file_name}" data-speed="5" controlslist="nodownload" controls></audio>`,
            setup_code,
            `What is the past simple of the verb to bumb?<br>`
        );
    };

    var noAudioTemplate = (file_name, setup_code) => {
        return cardTemplate(
            file_name,
            setup_code,
            `What is the past simple of the verb to bumb?<br>`
        );
    };

    let showQuestion = async (front_mp3, front_setup, templateName) =>
        await page.evaluate(
            async (mp3, setup, template) =>
                _showQuestion(await eval(`${template}(mp3, setup)`), ""),
            front_mp3,
            front_setup,
            templateName
        );

    let questionAndAnswer = async (
        question_mp3,
        question_setup,
        answer_mp3,
        answer_setup
    ) => {
        await page.evaluate(
            async (question_mp3, question_setup, answer_mp3, answer_setup) => {
                _showAnswer(
                    `${await questionTemplate(
                        question_mp3,
                        question_setup
                    )}${await answerTemplate(answer_mp3, answer_setup)}`,
                    ""
                );
            },
            question_mp3,
            question_setup,
            answer_mp3,
            answer_setup
        );
    };

    let getPausedMedias = async () =>
        await page.evaluate(async () => {
            let paused_medias = 0;
            let has_medias = 0;
            let playing = "";
            setAnkiMedia((media) => {
                has_medias += 1;
                if (media.paused) {
                    paused_medias += 1;
                } else {
                    playing += `${media.id}, `;
                }
            });
            if (has_medias) {
                let has = has_medias - paused_medias;
                if (has) {
                    return playing;
                } else {
                    return has;
                }
            } else {
                return "There were no medias found!";
            }
        });

    let getPlayTimes = async (mp3file) =>
        await page.evaluate(async (mp3) => {
            let audio = document.getElementById(mp3) as HTMLAudioElement;
            return [
                parseFloat(audio.getAttribute("data-has-started-at")),
                parseFloat(audio.getAttribute("data-has-ended-at")),
            ];
        }, mp3file);

    let deletePlayTimes = async (mp3file) =>
        await page.evaluate(async (mp3) => {
            let audio = document.getElementById(mp3) as HTMLAudioElement;
            audio.removeAttribute("data-has-started-at");
            audio.removeAttribute("data-has-ended-at");
        }, mp3file);

    let getAudioSource = async (mp3file) =>
        await page.evaluate(async (mp3) => {
            let audio = document.getElementById(mp3) as HTMLAudioElement;
            return audio.getAttribute("src");
        }, mp3file);

    beforeAll(async () => {
        await page.exposeFunction("cardTemplate", cardTemplate);
        await page.exposeFunction("questionTemplate", questionTemplate);
        await page.exposeFunction("answerTemplate", answerTemplate);
        await page.exposeFunction("dataSpeedTemplate", dataSpeedTemplate);
        await page.exposeFunction("noAudioTemplate", noAudioTemplate);
    });

    beforeEach(async () => {
        await page.goto(`${address}/main_webview.html`);
        await page.waitForSelector(`[id="qa"]`, {timeout: g_wait_timeout});
        expect(await page.evaluate(async () => ankimedia.is_setup)).toEqual(false);
        // console.log(`Running '${expect.getState().currentTestName}'.`);
        pagelogs.length = 0;
    });

    afterEach(async () => {
        expect(pagelogs).toHaveLength(0);
    });

    test.each([
        [
            `silence 1.mp3`,
            `ankimedia.setup({delay: 0, wait: true}); ankimedia.addall( "front" );`,
            `questionTemplate`,
        ],
        [
            `silence 1.mp3`,
            `ankimedia.setup({delay: 0, wait: false, medias: []}); ankimedia.addall( "front" );`,
            `questionTemplate`,
        ],
        [
            `silence 2.mp3`,
            'ankimedia.setup({delay: 0, wait: true}); ankimedia.add( `<audio src="silence 2.mp3" controlslist="nodownload" controls></audio>`, "front" );',
            `questionTemplate`,
        ],
        [
            `silence 2.mp3`,
            'ankimedia.setup({delay: 0, wait: false, medias: []}); ankimedia.add( `<audio src="silence 2.mp3" controlslist="nodownload" controls></audio>`, "front" );',
            `questionTemplate`,
        ],
        [
            `silence 2.mp3`,
            'ankimedia.setup({delay: 0, wait: false, medias: []}); ankimedia.add( `<audio src="silence 2.mp3" data-speed="5" controlslist="nodownload" controls></audio>`, "front" );',
            `dataSpeedTemplate`,
        ],
        // Without explicit "front"/"back"
        [`silence 1.mp3`, `ankimedia.setup({delay: 0, wait: true}); ankimedia.addall();`, `questionTemplate`],
        [
            `silence 1.mp3`,
            `ankimedia.setup({delay: 0, wait: false, medias: []}); ankimedia.addall();`,
            `questionTemplate`,
        ],
        [
            `silence 2.mp3`,
            'ankimedia.setup({delay: 0, wait: true}); ankimedia.add( `<audio src="silence 2.mp3" controlslist="nodownload" controls></audio>` );',
            `questionTemplate`,
        ],
        [
            `silence 2.mp3`,
            'ankimedia.setup({delay: 0, wait: false, medias: []}); ankimedia.add( `<audio src="silence 2.mp3" controlslist="nodownload" controls></audio>` );',
            `questionTemplate`,
        ],
        [
            `silence 2.mp3`,
            'ankimedia.setup({delay: 0, wait: false, medias: []}); ankimedia.add( `<audio src="silence 2.mp3" data-speed="5" controlslist="nodownload" controls></audio>` );',
            `dataSpeedTemplate`,
        ],
        // Sounds names with %20 should play normally
        [
            `silence%201.mp3`,
            'ankimedia.setup({delay: 0, wait: true}); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>`, "front" );',
            `questionTemplate`,
        ],
    ])(
        `Showing a question should play its audio file automatically:\nfront %s '%s'\n...`,
        async function (front_mp3, front_setup, templateName) {
            await showQuestion(front_mp3, front_setup, templateName);
            await page.waitForSelector(`audio[id="${front_mp3}"][data-has-ended-at]`, {timeout: g_wait_timeout});
            expect(await getPausedMedias()).toEqual(0);

            let question_times = await getPlayTimes(front_mp3);
            let audio_src = await getAudioSource(front_mp3);

            expect(audio_src).toEqual(front_mp3);
            expect(question_times[0]).toBeLessThan(question_times[1]);

            expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(false);
        }
    );

    test(`Pausing a audio should stop it from playing:\n...`, async function () {
        await showQuestion("silence 1.mp3", `ankimedia.setup(); ankimedia.addall( "front" );`, `questionTemplate`);
        await page.waitForSelector(`audio[id="silence 1.mp3"][data-has-started-at]`, {timeout: g_wait_timeout});
        expect(await getPausedMedias()).toEqual("silence 1.mp3, ");

        expect(await page.evaluate(() => ankimedia._playing_element.paused)).toBeFalsy();
        expect(await page.evaluate(() => ankimedia.togglePause())).toEqual(false);
        expect(await page.evaluate(() => ankimedia._playing_element.paused)).toBeTruthy();
        expect(await getPausedMedias()).toEqual(0);

        let question_times = await getPlayTimes("silence 1.mp3");
        let audio_src = await getAudioSource("silence 1.mp3");

        expect(audio_src).toEqual("silence 1.mp3");
        expect(question_times[0]).toBeGreaterThan(0);
        expect(question_times[1]).toBeFalsy();

        expect(await page.evaluate(() => ankimedia.togglePause())).toEqual(true);
        expect(await page.evaluate(() => ankimedia._playing_element.paused)).toBeFalsy();
        expect(await getPausedMedias()).toEqual("silence 1.mp3, ");

        await page.waitForSelector(`audio[id="silence 1.mp3"][data-has-ended-at]`, {timeout: g_wait_timeout});
        expect(await getPausedMedias()).toEqual(0);

        question_times = await getPlayTimes("silence 1.mp3");
        audio_src = await getAudioSource("silence 1.mp3");

        expect(audio_src).toEqual("silence 1.mp3");
        expect(question_times[0]).toBeLessThan(question_times[1]);
        expect(await page.evaluate(() => ankimedia._playing_element)).toBeUndefined();
    });

    test(`Pausing between playing two audios should play the next audio after unpausing\n...`, async function () {
        await questionAndAnswer(
            "silence 1.mp3",
            'ankimedia.setup({delay: 1.5}); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>`, "back" );',
            "silence 2.mp3",
            'ankimedia.setup({delay: 1.5}); ankimedia.add( `<audio src="silence 2.mp3" controlslist="nodownload" controls></audio>`, "back" );',
        );
        expect(await page.evaluate(() => ankimedia._playing_element.paused)).toBeFalsy();
        await page.waitForSelector(`audio[id="silence 1.mp3"][data-has-ended-at]`, {timeout: g_wait_timeout});

        expect(await getPausedMedias()).toEqual(0);
        expect(await page.evaluate(() => ankimedia._playing_element.paused)).toBeTruthy();
        expect(await page.evaluate(() => ankimedia.togglePause())).toEqual(false);

        expect(await getPausedMedias()).toEqual(0);
        expect(await page.evaluate(() => ankimedia._playing_element.paused)).toBeTruthy();

        expect(await page.evaluate(() => ankimedia.togglePause())).toEqual(true);
        expect(await getPausedMedias()).toEqual("silence 2.mp3, ");
        expect(await page.evaluate(() => ankimedia._playing_element.paused)).toBeFalsy();

        await page.waitForSelector(`audio[id="silence 2.mp3"][data-has-ended-at]`, {timeout: g_wait_timeout});
        let question_times = await getPlayTimes("silence 1.mp3");
        let answer_times = await getPlayTimes("silence 2.mp3");

        expect(await getPausedMedias()).toEqual(0);
        expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(false);
        expect(await page.evaluate(() => ankimedia._playing_element)).toBeUndefined();
        expect(answer_times[0] - question_times[1]).toBeLessThan(1500);
    });

    test(`Pausing on the first audio should play the next audio after unpausing:\n...`, async function () {
        await questionAndAnswer(
            "silence 1.mp3",
            'ankimedia.setup({delay: 1.5}); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>`, "back" );',
            "silence 2.mp3",
            'ankimedia.setup({delay: 1.5}); ankimedia.add( `<audio src="silence 2.mp3" controlslist="nodownload" controls></audio>`, "back" );',
        );
        await page.waitForSelector(`audio[id="silence 1.mp3"][data-has-started-at]`, {timeout: g_wait_timeout});
        expect(await getPausedMedias()).toEqual("silence 1.mp3, ");

        expect(await page.evaluate(() => ankimedia._playing_element.paused)).toBeFalsy();
        expect(await page.evaluate(() => ankimedia.togglePause())).toEqual(false);
        expect(await page.evaluate(() => ankimedia._playing_element.paused)).toBeTruthy();
        expect(await getPausedMedias()).toEqual(0);

        let question_times = await getPlayTimes("silence 1.mp3");
        let audio_src = await getAudioSource("silence 1.mp3");

        expect(audio_src).toEqual("silence 1.mp3");
        expect(question_times[0]).toBeGreaterThan(0);
        expect(question_times[1]).toBeFalsy();

        expect(await page.evaluate(() => ankimedia.togglePause())).toEqual(true);
        expect(await page.evaluate(() => ankimedia._playing_element.paused)).toBeFalsy();
        expect(await getPausedMedias()).toEqual("silence 1.mp3, ");

        await page.waitForSelector(`audio[id="silence 2.mp3"][data-has-ended-at]`, {timeout: g_wait_timeout});
        expect(await getPausedMedias()).toEqual(0);

        question_times = await getPlayTimes("silence 1.mp3");
        let answer_times = await getPlayTimes("silence 2.mp3");

        expect(await getPausedMedias()).toEqual(0);
        expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(false);
        expect(await page.evaluate(() => ankimedia._playing_element)).toBeUndefined();
        expect(answer_times[0] - question_times[1]).toBeGreaterThan(1500);
    });

    test.each([[`"front"`], [``]])(
        `Test disabling the setup(auto=false) stops starting the audio immediately:\nfront '%s'\n...`,
        async function (front_setup) {
            await showQuestion(
                `silence 1.mp3`,
                'ankimedia.setup({auto: false}); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>`, ' + `${front_setup} );`,
                `questionTemplate`
            );
            await page.waitForSelector(`audio[id="silence 1.mp3"]`, {timeout: g_wait_timeout});
            expect(await getPausedMedias()).toEqual(0);
            let question_times = await getPlayTimes("silence 1.mp3");

            await showQuestion(
                `silence 2.mp3`,
                'ankimedia.setup(); ankimedia.add( `<audio src="silence 2.mp3" controlslist="nodownload" controls></audio>`, ' + `${front_setup} );`,
                `questionTemplate`
            );
            await page.waitForSelector(`audio[id="silence 2.mp3"]`, {timeout: g_wait_timeout});
            let second_question_times = await getPlayTimes("silence 2.mp3");

            expect(await getPausedMedias()).toEqual(0);
            expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(false);

            expect(question_times[0]).toBeFalsy();
            expect(question_times[1]).toBeFalsy();
            expect(second_question_times[0]).toBeFalsy();
            expect(second_question_times[1]).toBeFalsy();
        }
    );

    test(`Test defining media with a child/nested media source file\n...`, async function () {
        await showQuestion(
            `<audio controlslist="nodownload" controls><source src="silence 1.mp3"></audio>`,
            'ankimedia.setup(); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>`, "front" );',
            `noAudioTemplate`
        );
        await page.waitForSelector(`audio[id="silence 1.mp3"][data-has-ended-at]`, {timeout: g_wait_timeout});

        expect(await getPausedMedias()).toEqual(0);
        expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(false);
    });

    test(`Test playing an audio without a HTML tag does not throw\n...`, async function () {
        await showQuestion(
            ``,
            'ankimedia.setup(); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>`, "front" );',
            `noAudioTemplate`
        );
        await page.waitForSelector(`input[type="button"]`, {timeout: g_wait_timeout});

        expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(true);
        expect(pagelogs[0]).toContain('Could not find an HTML audio element when adding');
        expect(pagelogs[1]).toContain('Could not find an HTML audio element when playing');
        expect(pagelogs).toHaveLength(2);
        pagelogs.length = 0;
    });

    test(`Test showing a question does not reset ankimedia state\n...`, async function () {
        await showQuestion(
            ``,
            'ankimedia.setup(); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>`, "front" );',
            `noAudioTemplate`
        );
        await page.waitForSelector(`input[type="button"]`, {timeout: g_wait_timeout});

        await page.evaluate(async () =>
            _showQuestion(
                await noAudioTemplate(`<div id="noAudioTemplate"> </div>`, ``),
                ""
            )
        );
        await page.waitForSelector(`div[id="noAudioTemplate"]`, {timeout: g_wait_timeout});

        expect(await page.evaluate(async () => ankimedia.is_setup)).toEqual(true);
        expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(true);

        expect(pagelogs[0]).toContain('Could not find an HTML audio element when adding');
        expect(pagelogs[1]).toContain('Could not find an HTML audio element when playing');
        expect(pagelogs).toHaveLength(2);
        pagelogs.length = 0;
    });

    test(`Test ankimedia.setup{delay} parameter creates an delay between medias\n...`, async function () {
        await questionAndAnswer(
            "silence 1.mp3",
            'ankimedia.setup({delay: 1.0}); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>`, "back" );',
            "silence 2.mp3",
            'ankimedia.setup({delay: 1.0}); ankimedia.add( `<audio src="silence 2.mp3" controlslist="nodownload" controls></audio>`, "back" );',
        );
        await page.waitForSelector(`audio[id="silence 2.mp3"][data-has-ended-at]`, {timeout: g_wait_timeout});

        let question_times = await getPlayTimes("silence 1.mp3");
        let answer_times = await getPlayTimes("silence 2.mp3");

        expect(answer_times[0] - question_times[1]).toBeGreaterThan(1000);
        expect(await getPausedMedias()).toEqual(0);
        expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(false);
    });

    test.each([
        [`"front"`, `"back"`],
        [``, ``],
    ])(
        `Test ankimedia.skip_front with addall should skip playing the front media:\nfront '%s', back '%s'\n...`,
        async function (front_setup, back_setup) {
            await page.evaluate(async () => ankimedia.setup({ skip: true }));

            await questionAndAnswer(
                "silence 1.mp3",
                `ankimedia.setup(); ankimedia.addall( ${front_setup} );`,
                "silence 2.mp3",
                `ankimedia.setup(); ankimedia.addall( ${back_setup} );`
            );
            await page.waitForSelector(`audio[id="silence 2.mp3"][data-has-ended-at]`, {timeout: g_wait_timeout});

            let question_times = await getPlayTimes("silence 1.mp3");
            let answer_times = await getPlayTimes("silence 2.mp3");

            expect(question_times[0]).toBeFalsy();
            expect(question_times[1]).toBeFalsy();

            expect(answer_times[0]).toBeTruthy();
            expect(answer_times[1]).toBeTruthy();

            expect(await getPausedMedias()).toEqual(0);
            expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(false);
        }
    );

    test.each([
        [`"front"`, `"back"`],
        [``, ``],
    ])(
        `Test ankimedia.skip_front with add should skip playing the front media:\nfront '%s', back '%s'\n...`,
        async function (front_setup, back_setup) {
            await page.evaluate(async () => ankimedia.setup({ skip: true }));

            await questionAndAnswer(
                "silence 1.mp3",
                'ankimedia.setup(); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>`, ' + `${front_setup} );`,
                "silence 2.mp3",
                'ankimedia.setup(); ankimedia.add( `<audio src="silence 2.mp3" controlslist="nodownload" controls></audio>`, ' + `${back_setup} );`,
            );
            await page.waitForSelector(`audio[id="silence 2.mp3"][data-has-ended-at]`, {timeout: g_wait_timeout});

            let question_times = await getPlayTimes("silence 1.mp3");
            let answer_times = await getPlayTimes("silence 2.mp3");

            expect(question_times[0]).toBeFalsy();
            expect(question_times[1]).toBeFalsy();

            expect(answer_times[0]).toBeTruthy();
            expect(answer_times[1]).toBeTruthy();

            expect(await getPausedMedias()).toEqual(0);
            expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(false);
        }
    );

    test.each([
        [`"front"`, `"back"`],
        [``, ``],
    ])(
        `Test ankimedia.replay() should replay all the media:\nfront '%s', back '%s'\n...`,
        async function (front_setup, back_setup) {
            await showQuestion(
                "silence 1.mp3",
                'ankimedia.setup(); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>`, ' + `${front_setup} );`,
                `questionTemplate`
            );
            await questionAndAnswer(
                "silence 1.mp3",
                'ankimedia.setup(); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>`, ' + `${front_setup} );`,
                "silence 2.mp3",
                'ankimedia.setup(); ankimedia.add( `<audio src="silence 2.mp3" controlslist="nodownload" controls></audio>`, ' + `${back_setup} );`,
            );
            await page.waitForSelector(`audio[id="silence 2.mp3"][data-has-ended-at]`, {timeout: g_wait_timeout});
            let question_times = await getPlayTimes("silence 1.mp3");
            let answer_times = await getPlayTimes("silence 2.mp3");

            expect(await getPausedMedias()).toEqual(0);
            expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(false);

            await deletePlayTimes("silence 2.mp3");
            await page.evaluate(async () => ankimedia.replay());
            await page.waitForSelector(`audio[id="silence 2.mp3"][data-has-ended-at]`, {timeout: g_wait_timeout});

            let question_times1 = await getPlayTimes("silence 1.mp3");
            let answer_times1 = await getPlayTimes("silence 2.mp3");

            expect(await getPausedMedias()).toEqual(0);
            expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(false);

            expect(question_times[0]).toBeLessThan(question_times1[0]);
            expect(question_times[1]).toBeLessThan(question_times1[1]);

            expect(answer_times[0]).toBeLessThan(answer_times1[0]);
            expect(answer_times[1]).toBeLessThan(answer_times1[1]);

            await deletePlayTimes("silence 2.mp3");
            await page.evaluate(async () => ankimedia.replay());
            await page.waitForSelector(`audio[id="silence 2.mp3"][data-has-ended-at]`, {timeout: g_wait_timeout});

            let question_times2 = await getPlayTimes("silence 1.mp3");
            let answer_times2 = await getPlayTimes("silence 2.mp3");

            expect(question_times1[0]).toBeLessThan(question_times2[0]);
            expect(question_times1[1]).toBeLessThan(question_times2[1]);

            expect(answer_times1[0]).toBeLessThan(answer_times2[0]);
            expect(answer_times1[1]).toBeLessThan(answer_times2[1]);

            expect(await getPausedMedias()).toEqual(0);
            expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(false);
        }
    );

    test.each([
        [
            `silence 1.mp3`,
            `ankimedia.setup(); ankimedia.addall( "front" );`,
            `silence 2.mp3`,
            `ankimedia.setup(); ankimedia.addall( "front" );`,
        ],
        [
            `silence 1.mp3`,
            'ankimedia.setup(); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>`, "front" );',
            `silence 2.mp3`,
            'ankimedia.setup(); ankimedia.add( `<audio src="silence 2.mp3" controlslist="nodownload" controls></audio>`, "front" );',
        ],
        // Without explicit "front"/"back"
        [
            `silence 1.mp3`,
            `ankimedia.setup(); ankimedia.addall();`,
            `silence 2.mp3`,
            `ankimedia.setup(); ankimedia.addall();`,
        ],
        [
            `silence 1.mp3`,
            'ankimedia.setup(); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>` );',
            `silence 2.mp3`,
            'ankimedia.setup(); ankimedia.add( `<audio src="silence 2.mp3" controlslist="nodownload" controls></audio>` );',
        ],
    ])(
        `Showing a new question should play its audio automatically:\nfront %s '%s',\nrefront %s '%s'\n...`,
        async function (front_mp3, front_setup, refront_mp3, refront_setup) {
            await showQuestion(front_mp3, front_setup, "questionTemplate");
            await page.waitForSelector(`audio[id="${front_mp3}"][data-has-ended-at]`, {timeout: g_wait_timeout});
            expect(await getPausedMedias()).toEqual(0);

            let first_question_times = await getPlayTimes(front_mp3);
            let first_audio_src = await getAudioSource(front_mp3);

            await page.evaluate(async () => ankimedia._reset());
            await showQuestion(refront_mp3, refront_setup, "questionTemplate");
            await page.waitForSelector(`[id="${refront_mp3}"][data-has-ended-at]`, {timeout: g_wait_timeout});
            expect(await getPausedMedias()).toEqual(0);

            let second_question_times = await getPlayTimes(refront_mp3);
            let second_audio_src = await getAudioSource(refront_mp3);

            expect(first_audio_src).toEqual(front_mp3);
            expect(second_audio_src).toEqual(refront_mp3);

            expect(second_question_times[0]).toBeLessThan(second_question_times[1]);
            expect(first_question_times[0]).toBeLessThan(second_question_times[0]);
            expect(first_question_times[1]).toBeLessThan(second_question_times[1]);

            expect(await getPausedMedias()).toEqual(0);
            expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(false);
        }
    );

    test.each([
        [
            `silence 1.mp3`,
            `ankimedia.setup(); ankimedia.addall( "front" );`,
            `silence 1.mp3`,
            `ankimedia.setup(); ankimedia.addall( "back" );`,
        ],
        [
            `silence 1.mp3`,
            `ankimedia.setup(); ankimedia.addall( "front" );`,
            `silence 2.mp3`,
            `ankimedia.setup(); ankimedia.addall( "back" );`,
        ],
        [
            `silence 1.mp3`,
            'ankimedia.setup(); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>`, "front" );',
            `silence 1.mp3`,
            'ankimedia.setup(); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>`, "back" );',
        ],
        [
            `silence 1.mp3`,
            'ankimedia.setup(); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>`, "front" );',
            `silence 2.mp3`,
            'ankimedia.setup(); ankimedia.add( `<audio src="silence 2.mp3" controlslist="nodownload" controls></audio>`, "back" );',
        ],
        // Without explicit "front"/"back"
        [
            `silence 1.mp3`,
            `ankimedia.setup(); ankimedia.addall();`,
            `silence 1.mp3`,
            `ankimedia.setup(); ankimedia.addall();`,
        ],
        [
            `silence 1.mp3`,
            `ankimedia.setup(); ankimedia.addall();`,
            `silence 2.mp3`,
            `ankimedia.setup(); ankimedia.addall();`,
        ],
        [
            `silence 1.mp3`,
            'ankimedia.setup(); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>` );',
            `silence 1.mp3`,
            'ankimedia.setup(); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>` );',
        ],
        [
            `silence 1.mp3`,
            'ankimedia.setup(); ankimedia.add( `<audio src="silence 1.mp3" controlslist="nodownload" controls></audio>` );',
            `silence 2.mp3`,
            'ankimedia.setup(); ankimedia.add( `<audio src="silence 2.mp3" controlslist="nodownload" controls></audio>` );',
        ],
    ])(
        `Showing an answer with the same audio id as the question should only play the answer audio:\nfront %s '%s',\nback %s '%s'\n...`,
        async function (front_mp3, front_setup, back_mp3, back_setup) {
            let selector = back_mp3 == front_mp3 ? `${front_mp3}1` : back_mp3;

            await showQuestion(front_mp3, front_setup, "questionTemplate");
            await page.waitForSelector(`audio[id="${front_mp3}"][data-has-ended-at]`, {timeout: g_wait_timeout});
            expect(await getPausedMedias()).toEqual(0);

            let question_times = await getPlayTimes(front_mp3);
            let question_audio_src = await getAudioSource(front_mp3);

            await questionAndAnswer(front_mp3, front_setup, back_mp3, back_setup);
            await page.waitForSelector(`audio[id="${selector}"][data-has-ended-at]`, {timeout: g_wait_timeout});
            expect(await getPausedMedias()).toEqual(0);

            let question_times_recheck = await getPlayTimes(front_mp3);
            let answer_times = await getPlayTimes(selector);
            let answer_audio_src = await getAudioSource(selector);

            expect(question_audio_src).toEqual(front_mp3);
            expect(answer_audio_src).toEqual(back_mp3);

            // assert the question audio was not replayed when showing the answer
            expect(question_times[0]).toEqual(question_times_recheck[0]);
            expect(question_times[1]).toEqual(question_times_recheck[1]);

            expect(question_times[0]).toBeLessThan(question_times[1]);
            expect(answer_times[0]).toBeLessThan(answer_times[1]);
            expect(question_times[0]).toBeLessThan(answer_times[0]);
            expect(question_times[1]).toBeLessThan(answer_times[1]);

            expect(await getPausedMedias()).toEqual(0);
            expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(false);
        }
    );

    test.each([
        [`"front"`, `"back"`],
        [``, ``],
    ])(
        `The card preview should not play multiple times while editing the page:\nfront '%s', back '%s'\n...`,
        async function (front_setup, back_setup) {
            await page.goto(`${address}/card_layout.html`);
            await page.waitForSelector(`[id="qa"]`, {timeout: g_wait_timeout});

            let showEverything = async (first_mp3, second_mp3) =>
                await questionAndAnswer(
                    first_mp3,
                    `ankimedia.setup(); ankimedia.addall( ${front_setup} );`,
                    second_mp3,
                    `ankimedia.setup(); ankimedia.addall( ${back_setup} );`
                );

            await showEverything("silence 1.mp3", "silence 2.mp3");
            await page.waitForSelector(`audio[id="silence 2.mp3"][data-has-ended-at]`, {timeout: g_wait_timeout});
            let question_times = await getPlayTimes("silence 1.mp3");
            let answer_times = await getPlayTimes("silence 2.mp3");

            expect(await getPausedMedias()).toEqual(0);
            expect(question_times[0]).toBeLessThan(question_times[1]);
            expect(answer_times[0]).toBeLessThan(answer_times[1]);
            expect(question_times[0]).toBeLessThan(answer_times[0]);
            expect(question_times[1]).toBeLessThan(answer_times[1]);

            await page.waitForTimeout(ANKI_MEDIA_QUEUE_PREVIEW_TIMEOUT);
            await showEverything("silence 1.mp3", "silence 2.mp3");
            await page.waitForSelector(`audio[id="silence 2.mp3"]`, {timeout: g_wait_timeout});
            expect(await getPausedMedias()).toEqual(0);

            await showEverything("silence 1.mp3", "silence 2.mp3");
            await page.waitForSelector(`audio[id="silence 2.mp3"]`, {timeout: g_wait_timeout});
            expect(await getPausedMedias()).toEqual(0);

            await showEverything("silence 1.mp3", "silence 2.mp3");
            await page.waitForSelector(`audio[id="silence 2.mp3"]`, {timeout: g_wait_timeout});

            expect(await getPausedMedias()).toEqual(0);
            expect(await page.evaluate(() => ankimedia.is_playing)).toEqual(false);
        }
    );
});
