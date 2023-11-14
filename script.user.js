// ==UserScript==
// @name            YouTube video downloader
// @icon            https://www.youtube.com/s/desktop/6ee70b2c/img/favicon_144x144.png
// @namespace       aGkgdGhlcmUgOik=
// @source          https://github.com/madkarmaa/youtube-downloader
// @supportURL      https://github.com/madkarmaa/youtube-downloader
// @updateURL       https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/script.user.js
// @downloadURL     https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/script.user.js
// @version         1.0.1
// @description     Download YouTube videos locally with the best quality!
// @author          mk_
// @match           *://*youtube.com/watch*
// @connect         co.wuk.sh
// @connect         raw.githubusercontent.com
// @grant           GM_addStyle
// @grant           GM.xmlHttpRequest
// @grant           GM.xmlhttpRequest
// ==/UserScript==

(async () => {
    'use strict';

    function Cobalt(video_url) {
        // Use Promise because GM.xmlHttpRequest is async and behaves differently with different userscript managers
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: 'POST',
                url: 'https://co.wuk.sh/api/json',
                headers: {
                    'Cache-Control': 'no-cache',
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    url: encodeURI(video_url),
                    vQuality: 'max',
                    filenamePattern: 'basic',
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
        'div#top-row > div#actions > div#actions-inner > div#menu button[aria-label="Share"]'
    );

    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download';

    const buttonId = `button-${Math.floor(Math.random() * Date.now())}`;
    downloadButton.id = buttonId;

    const buttonIcon = document.createElement('div');
    buttonIcon.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="24" viewBox="0 0 24 24" width="24" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;"><path d="M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z"></path></svg>';

    downloadButton.insertBefore(buttonIcon, downloadButton.firstChild);
    downloadButton.addEventListener('click', async () => {
        try {
            window.open(await Cobalt(window.location.href), '_blank');
        } catch (err) {
            window.alert(err);
        }
    });
    downloadButton.classList = shareButton.classList;

    GM_addStyle(`
#${buttonId} {
    margin-right: 8px !important;
    background-color: rgba(255, 0, 0, 0.3);
    transition: all 0.3s ease-in-out;
}

#${buttonId}:hover {
    background-color: rgba(255, 0, 0, 0.5);
    box-shadow: 0px 0px 4px 6px rgba(255, 0, 0, 0.3);
}

#${buttonId} > div {
    margin-right: 6px !important;
    margin-left: -6px !important;
}
`);

    const buttonsRow = document.querySelector(
        'div#top-row > div#actions > div#actions-inner > div#menu div#top-level-buttons-computed'
    );
    if (!buttonsRow.contains(downloadButton)) buttonsRow.insertBefore(downloadButton, buttonsRow.firstChild);
})();
