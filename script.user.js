// ==UserScript==
// @name            YouTube video downloader
// @icon            https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/images/icon.png
// @namespace       aGkgdGhlcmUgOik=
// @source          https://github.com/madkarmaa/youtube-downloader
// @supportURL      https://github.com/madkarmaa/youtube-downloader
// @updateURL       https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/script.user.js
// @downloadURL     https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/script.user.js
// @version         1.2.0
// @description     A simple userscript to download YouTube videos in MAX QUALITY
// @author          mk_
// @match           *://*.youtube.com/*
// @connect         co.wuk.sh
// @connect         raw.githubusercontent.com
// @grant           GM_addStyle
// @grant           GM.xmlHttpRequest
// @grant           GM.xmlhttpRequest
// @run-at          document-end
// ==/UserScript==

(async () => {
    'use strict';

    function Cobalt(videoUrl, audioOnly = false) {
        // Use Promise because GM.xmlHttpRequest is async and behaves differently with different userscript managers
        return new Promise((resolve, reject) => {
            // https://github.com/wukko/cobalt/blob/current/docs/api.md
            GM.xmlHttpRequest({
                method: 'POST',
                url: 'https://co.wuk.sh/api/json',
                headers: {
                    'Cache-Control': 'no-cache',
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    url: encodeURI(videoUrl), // video url
                    vQuality: 'max', // always max quality
                    filenamePattern: 'basic', // file name = video title
                    isAudioOnly: audioOnly,
                    disableMetadata: true, // privacy
                }),
                onload: (response) => {
                    const data = JSON.parse(response.responseText);
                    if (data?.url) resolve(data.url);
                    else reject(data);
                },
                onerror: (err) => reject(err),
            });
        });
    }

    // https://stackoverflow.com/a/61511955
    function waitForElement(selector) {
        return new Promise((resolve) => {
            if (document.querySelector(selector)) return resolve(document.querySelector(selector));

            const observer = new MutationObserver(() => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    // wait for the share button to appear before continuing
    const shareButton = await waitForElement(
        'div#player div.ytp-chrome-controls div.ytp-right-controls button[aria-label="Settings"]'
    );

    const downloadButton = document.createElement('button');

    const buttonId = `yt-downloader-btn-${Math.floor(Math.random() * Date.now())}`;
    downloadButton.id = buttonId;
    downloadButton.title = 'Click to download as video\nRight click to download as audio';
    downloadButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="24" viewBox="0 0 24 24" width="24" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;"><path d="M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z"></path></svg>';
    downloadButton.classList = shareButton.classList;
    downloadButton.classList.add('ytp-hd-quality-badge');

    // normal click => download video
    downloadButton.addEventListener('click', async () => {
        try {
            window.open(await Cobalt(window.location.href), '_blank');
        } catch (err) {
            window.alert(err);
        }
    });
    // right click => download audio
    downloadButton.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        try {
            window.open(await Cobalt(window.location.href, true), '_blank');
        } catch (err) {
            window.alert(err);
        }
        return false;
    });

    GM_addStyle(`
#${buttonId} > svg {
    margin-top: 3px;
    margin-bottom: -3px;
}

#${buttonId}:hover > svg {
    fill: #f00;
}
`);

    const buttonsRow = await waitForElement('div#player div.ytp-chrome-controls div.ytp-right-controls');
    if (!buttonsRow.contains(downloadButton)) buttonsRow.insertBefore(downloadButton, buttonsRow.firstChild);
})();
