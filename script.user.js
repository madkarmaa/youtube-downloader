// ==UserScript==
// @name            YouTube downloader
// @icon            https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/images/icon.png
// @namespace       aGkgdGhlcmUgOik=
// @source          https://github.com/madkarmaa/youtube-downloader
// @supportURL      https://github.com/madkarmaa/youtube-downloader
// @updateURL       https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/script.user.js
// @downloadURL     https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/script.user.js
// @version         1.4.0
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

    const randomNumber = Math.floor(Math.random() * Date.now());

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

    function notify(title, message) {
        const notificationContainer = document.createElement('div');
        notificationContainer.id = `yt-downloader-notification-${randomNumber}`;

        const titleElement = document.createElement('h3');
        titleElement.textContent = title;

        const messageElement = document.createElement('span');
        messageElement.textContent = message;

        const closeButton = document.createElement('button');
        closeButton.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" height="1.5rem" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>';
        closeButton.addEventListener('click', () => {
            notificationContainer.remove();
        });

        notificationContainer.append(titleElement, messageElement, closeButton);
        document.body.appendChild(notificationContainer);
    }

    // detect which youtube service is being used
    const SERVICES = {
        YOUTUBE: 'www.youtube.com',
        SHORTS: '/shorts',
        MUSIC: 'music.youtube.com',
    };
    const YOUTUBE_SERVICE =
        window.location.hostname === SERVICES.YOUTUBE && window.location.pathname.startsWith(SERVICES.SHORTS)
            ? 'SHORTS'
            : window.location.hostname === SERVICES.MUSIC
            ? 'MUSIC'
            : 'YOUTUBE';

    // wait for the button to copy to appear before continuing
    const buttonToCopy = await waitForElement(
        YOUTUBE_SERVICE === 'YOUTUBE'
            ? 'div#player div.ytp-chrome-controls div.ytp-right-controls button[aria-label="Settings"]'
            : YOUTUBE_SERVICE === 'MUSIC'
            ? '[slot="player-bar"] div.middle-controls div.middle-controls-buttons #like-button-renderer #button-shape-dislike button[aria-label="Dislike"]'
            : 'div#actions.ytd-reel-player-overlay-renderer div#comments-button button'
    );

    const downloadButton = document.createElement('button');

    const buttonId = `yt-downloader-btn-${randomNumber}`;
    downloadButton.id = buttonId;
    downloadButton.title = 'Click to download as video\nRight click to download as audio';
    downloadButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="24" viewBox="0 0 24 24" width="24" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;"><path d="M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z"></path></svg>';
    downloadButton.classList = buttonToCopy.classList;

    if (YOUTUBE_SERVICE === 'YOUTUBE') downloadButton.classList.add('ytp-hd-quality-badge');
    downloadButton.classList.add(YOUTUBE_SERVICE);

    // normal click => download video
    async function leftClick() {
        if (!window.location.pathname.slice(1))
            return notify('Hey!', 'The video/song player is not open, I cannot see the link to download!'); // do nothing if video is not focused

        try {
            window.open(await Cobalt(window.location.href), '_blank');
        } catch (err) {
            notify('An error occurred!', JSON.stringify(err));
        }
    }
    downloadButton.addEventListener('click', leftClick);
    // right click => download audio
    async function rightClick() {
        if (!window.location.pathname.slice(1))
            return notify('Hey!', 'The video/song player is not open, I cannot see the link to download!'); // do nothing if video is not focused

        e.preventDefault();
        try {
            window.open(await Cobalt(window.location.href, true), '_blank');
        } catch (err) {
            notify('An error occurred!', JSON.stringify(err));
        }
        return false;
    }
    downloadButton.addEventListener('contextmenu', rightClick);

    GM_addStyle(`
#${buttonId}.YOUTUBE > svg {
    margin-top: 3px;
    margin-bottom: -3px;
}

#${buttonId}.SHORTS > svg {
    margin-left: 3px;
}

#${buttonId}:hover > svg {
    fill: #f00;
}

#yt-downloader-notification-${randomNumber} {
    background-color: #282828;
    color: #fff;
    border: 2px solid #fff;
    border-radius: 8px;
    position: fixed;
    top: 0;
    right: 0;
    margin-top: 10px;
    margin-right: 10px;
    padding: 15px;
    z-index: 999;
}

#yt-downloader-notification-${randomNumber} > h3 {
    color: #f00;
    font-size: 2.5rem;
}

#yt-downloader-notification-${randomNumber} > span {
    font-style: italic;
    font-size: 1.5rem;
}

#yt-downloader-notification-${randomNumber} > button {
    position: absolute;
    top: 0;
    right: 0;
    background: none;
    border: none;
    outline: none;
    width: fit-content;
    height: fit-content;
    margin: 5px;
    padding: 0;
}

#yt-downloader-notification-${randomNumber} > button > svg {
    fill: #fff;
}
`);

    if (YOUTUBE_SERVICE !== 'SHORTS') {
        const buttonsRow = await waitForElement(
            YOUTUBE_SERVICE === 'YOUTUBE'
                ? 'div#player div.ytp-chrome-controls div.ytp-right-controls'
                : '[slot="player-bar"] div.middle-controls div.middle-controls-buttons'
        );
        if (!buttonsRow.contains(downloadButton)) buttonsRow.insertBefore(downloadButton, buttonsRow.firstChild);
    } else {
        function addButtonToShorts() {
            document.querySelectorAll('div#actions.ytd-reel-player-overlay-renderer').forEach((buttonsRow) => {
                const dlButtonCopy = downloadButton.cloneNode(true);
                dlButtonCopy.addEventListener('click', leftClick);
                dlButtonCopy.addEventListener('contextmenu', rightClick);

                if (!buttonsRow.getAttribute('data-button-added') && !buttonsRow.contains(downloadButton)) {
                    buttonsRow.insertBefore(dlButtonCopy, buttonsRow.querySelector('div#like-button'));
                    buttonsRow.setAttribute('data-button-added', true);
                }
            });
        }

        addButtonToShorts();
        document.addEventListener('yt-navigate-finish', addButtonToShorts);
    }
})();
