/* Copyright: Ankitects Pty Ltd and contributors
 * License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html */

var ankiPlatform = "desktop";
var typeans;

function _runHook(arr) {
    for (var i = 0; i < arr.length; i++) {
        arr[i]();
    }
}

function _updateQA(html, onupdate, onshown) {
    var qa = $("#qa");

    // update text
    try {
        qa.html(html);
    } catch (err: any) {
        qa.html(
            (
                `Invalid HTML on card: ${String(err).substring(0, 2000)}\n` +
                String(err.stack).substring(0, 2000)
            ).replace(/\n/g, "<br />")
        );
    }

    onupdate();
    onshown();
}

function _showQuestion(q, bodyclass) {
    _updateQA(
        q,
        function () {
            document.body.className = bodyclass;
        },
        function () {
            // focus typing area if visible
            typeans = document.getElementById("typeans");
            if (typeans) {
                typeans.focus();
            }
        }
    );
}

function _showAnswer(a, bodyclass) {
    _updateQA(
        a,
        function () {
            if (bodyclass) {
                //  when previewing
                document.body.className = bodyclass;
            }
        },
        function () {}
    );
}
