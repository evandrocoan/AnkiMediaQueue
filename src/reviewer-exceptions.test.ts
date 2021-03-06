/* Copyright: Ankitects Pty Ltd and contributors
 * License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
 *
 * Tell jest to not use puppeteer environment - https://github.com/facebook/jest/issues/2587
 * @jest-environment jsdom
 */
/// <reference path="./reviewer.ts" />

import "./ankimedia";
const { AnkiMediaQueue, setAnkiMedia } = require("./ankimedia");

jest.disableAutomock();
jest.setTimeout(100000);

describe("Test question and answer exception handling", () => {
    let ankimedia = new AnkiMediaQueue();

    beforeEach(async () => {
        ankimedia._reset();
        document.body.innerHTML = "";
    });

    test(`ankimedia.setup() with invalid parameters`, async function () {
        expect(() => ankimedia.setup(5)).toThrowError(`Invalid 'parameters=`);
        expect(() => ankimedia.setup("6")).toThrowError(`Invalid 'parameters=`);
        expect(() => ankimedia.setup([7])).toThrowError(`Invalid 'parameters=`);
        expect(() => ankimedia.setup({ car: 8 })).toThrowError(`Invalid 'parameters=`);
        expect(() => ankimedia.setup({ medias: "5" })).toThrowError(
            `is not a valid array object`
        );
    });

    test(`ankimedia.setup() with bad parameters`, async function () {
        expect(() => ankimedia.setup({ delay: "5" })).toThrowError(
            `is not a valid positive number`
        );
        let fake_audio = document.createElement("div");
        expect(() => ankimedia.setup({ medias: [fake_audio] })).toThrowError(
            `media element is missing its 'src=`
        );
        expect(() => ankimedia.setup({ extra: {} })).toThrowError(
            `is not a valid function`
        );
        fake_audio.setAttribute("src", "cool.mp3");
        fake_audio.setAttribute("data-speed", "{5}");
        expect(() => ankimedia.setup({ medias: [fake_audio] })).toThrowError(
            `media element has an invalid 'data-speed=`
        );
    });

    test(`do not call setup() before other methods`, async function () {
        expect(() => ankimedia.addall("front")).toThrowError(
            `setup() function must be called before calling`
        );
        expect(() => ankimedia.addall("front", 1)).toThrowError(
            `setup() function must be called before calling`
        );
        expect(() => ankimedia.add("front", "thing.mp3")).toThrowError(
            `setup() function must be called before calling`
        );
    });

    test(`do not pass the correct value of where`, async function () {
        ankimedia.setup();
        expect(() => ankimedia.add("front", "thing.mp3")).toThrowError(
            `Invalid 'where=`
        );
        expect(() => ankimedia.add("thing.mp3", "")).toThrowError(
            `Missing the 'where=`
        );

        expect(() => ankimedia.addall("thing.mp3")).toThrowError(`Invalid 'where=`);

        expect(() => ankimedia.addall(5)).toThrowError(`Invalid 'where=`);
        expect(() => ankimedia.addall("front", "{5}")).toThrowError(
            `is not a valid positive number`
        );
        expect(() => ankimedia.addall("front", "{5}")).toThrowError(
            `is not a valid positive number`
        );
        expect(() => ankimedia.add("thing.mp3")).toThrowError(`Missing the 'where=`);
    });

    test(`do not use the correct value of where with addall()`, async function () {
        let fake_audio = document.createElement("audio");
        document.body.appendChild(fake_audio);

        fake_audio.setAttribute("src", "cool.mp3");
        fake_audio.setAttribute("data-where", "cool.mp3");
        ankimedia.setup();
        expect(() => ankimedia.addall("front")).toThrowError(`Invalid 'where=`);
    });

    test(`do not use the correct value of where with addall("front")`, async function () {
        let fake_audio = document.createElement("audio");
        document.body.appendChild(fake_audio);

        fake_audio.setAttribute("src", "cool.mp3");
        fake_audio.setAttribute("data-where", "cool.mp3");
        ankimedia.setup();
        expect(() => ankimedia.addall("front")).toThrowError(`Invalid 'where=`);
    });

    test(`do not use the correct value of where with add("cool.mp3")`, async function () {
        let fake_audio = document.createElement("audio");
        document.body.appendChild(fake_audio);

        fake_audio.setAttribute("src", "cool.mp3");
        fake_audio.setAttribute("data-where", "cool.mp3");
        ankimedia.setup();
        expect(() => ankimedia.add("cool.mp3")).toThrowError(`Invalid 'where=`);
    });

    test(`do not add media files with the correct speed or file name`, async function () {
        ankimedia.setup();
        expect(() => ankimedia.add({}, "front")).toThrowError(
            /The 'filename=.*' is not a valid string/
        );
        expect(() => ankimedia.add("thing.mp3", "front", {})).toThrowError(
            /The 'speed=.*' is not a valid positive number/
        );
        expect(() => ankimedia.add("thing.mp3", "front", -1)).toThrowError(
            /The 'speed=.*' is not a valid positive number/
        );
    });

    test(`Calling functions with invalid arguments count`, async function () {
        ankimedia.setup();
        expect(() => ankimedia.addall("front", 2, "thing.mp3")).toThrowError(
            `addall() requires from 0 up to 2 argument(s) only`
        );
        expect(() => ankimedia.add()).toThrowError(
            `add() requires from 1 up to 3 argument(s) only`
        );
        expect(() => ankimedia.add("thing.mp3", "front", 1, {})).toThrowError(
            `add() requires from 1 up to 3 argument(s) only`
        );
        expect(() => setAnkiMedia()).toThrowError(
            `setAnkiMedia() requires from 1 up to 2 argument(s) only`
        );
        expect(() => setAnkiMedia(() => {}, [], 1)).toThrowError(
            `setAnkiMedia() requires from 1 up to 2 argument(s) only`
        );
    });

    test(`setAnkiMedia() with invalid callback parameters`, async function () {
        expect(() => setAnkiMedia(() => {})).toThrowError(
            "should accept at least 1 argument"
        );
        expect(() => setAnkiMedia(document.createElement("div"))).toThrowError(
            `is not a valid function`
        );
        expect(() =>
            setAnkiMedia((some) => {}, document.createElement("div"))
        ).toThrowError(`is not a valid array object`);
    });

    test(`Creating an audio with trailing spaces on the name must fail on setup()`, async function () {
        let fake_audio = document.createElement("audio");
        document.body.appendChild(fake_audio);

        fake_audio.setAttribute("src", "cool.mp3 ");
        fake_audio.setAttribute("data-where", "front");
        expect(() => ankimedia.setup()).toThrowError(
            `A media element has leading or trailing whitespaces on its 'src=`
        );
    });

    test(`Test defining media with a invalid child/nested media source file`, async function () {
        let fake_audio = document.createElement("audio");
        let fake_source = document.createElement("source");
        fake_audio.appendChild(fake_source);
        fake_audio.setAttribute("src", "");

        document.body.appendChild(fake_audio);
        expect(() => ankimedia.setup()).toThrowError(
            `A media element is missing its 'src=null'`
        );
    });
});
