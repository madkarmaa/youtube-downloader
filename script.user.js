// ==UserScript==
// @name            YouTube downloader
// @icon            https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/images/icon.png
// @namespace       aGkgdGhlcmUgOik=
// @source          https://github.com/madkarmaa/youtube-downloader
// @supportURL      https://github.com/madkarmaa/youtube-downloader
// @updateURL       https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/script.user.js
// @downloadURL     https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/script.user.js
// @version         2.0.3
// @description     A simple userscript to download YouTube videos in MAX QUALITY
// @author          mk_
// @match           *://*.youtube.com/*
// @connect         co.wuk.sh
// @connect         raw.githubusercontent.com
// @grant           GM_addStyle
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_xmlHttpRequest
// @grant           GM_xmlhttpRequest
// @run-at          document-end
// ==/UserScript==

(async () => {
    'use strict';

    const randomNumber = Math.floor(Math.random() * Date.now());
    const buttonId = `yt-downloader-btn-${randomNumber}`;

    let oldLog = console.log;
    /**
     * Custom logging function copied from `console.log`
     * @param  {...any} args `console.log` arguments
     * @returns {void}
     */
    const logger = (...args) => oldLog.apply(console, ['\x1b[31m[YT Downloader >> INFO]\x1b[0m', ...args]);

    GM_addStyle(`
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&display=swap')

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
    z-index: 99999;
    max-width: 17.5%;
}

#yt-downloader-notification-${randomNumber} > h3 {
    color: #f00;
    font-size: 2.5rem;
}

#yt-downloader-notification-${randomNumber} > span {
    font-style: italic;
    font-size: 1.5rem;
}

#yt-downloader-notification-${randomNumber} a {
    color: #f00;
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

#yt-downloader-menu-${randomNumber} {
    width: 40vw;
    height: 60vh;
    background-color: rgba(0, 0, 0, 0.9);
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 999;
    border-radius: 8px;
    border: 2px solid rgba(255, 0, 0, 0.9);
    opacity: 0;
    display: flex;
    flex-direction: column;
    gap: 1.3rem;
	color: #fff;
	font-size: 1.5rem !important;
    padding: 15px;
}

#yt-downloader-menu-${randomNumber} > textarea {
    resize: none;
    width: 100%;
    background: transparent !important;
    border: none !important;
    color: #fff !important;
    height: 100%;
    outline: none !important;
    margin: 0 !important;
    padding: 0 !important;
    font-family: "Fira Code", monospace;
    font-size: 1.5rem;
}

#yt-downloader-menu-${randomNumber} > textarea::-webkit-scrollbar {
    display: none;
}

#yt-downloader-menu-${randomNumber} > button {
    opacity: 0.25;
    position: absolute;
    top: 0;
    right: 0;
    border-top-right-radius: 8px;
    background-color: rgba(255, 0, 0, 0.5);
    color: #fff;
    outline: none;
    border: none;
    border-bottom: 2px solid #f00;
    border-left: 2px solid #f00;
    cursor: pointer;
    font-family: "Fira Code", monospace;
    font-size: 1.2rem;
    transition: all .3s ease-in-out;
    margin: 0;
    padding: 3px 5px;
}

#yt-downloader-menu-${randomNumber} > button:hover {
    opacity: 1;
}

#yt-downloader-menu-${randomNumber}.opened {
    animation: openMenu .3s linear forwards;
}

#yt-downloader-menu-${randomNumber}.closed {
    animation: closeMenu .3s linear forwards;
}

input {
	accent-color: #f00;
}

@keyframes openMenu {
    0% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}

@keyframes closeMenu {
    0% {
        opacity: 1;
    }

    100% {
        opacity: 0;
    }
}
`);

    /**
     * Download a video using the Cobalt API
     * @param {String} videoUrl The url of the video to download
     * @param {*} audioOnly Wether to download the video as audio only or not
     * @returns
     */
    function Cobalt(videoUrl, audioOnly = false) {
        // Use Promise because GM.xmlHttpRequest is async and behaves differently with different userscript managers
        return new Promise((resolve, reject) => {
            // https://github.com/wukko/cobalt/blob/current/docs/api.md
            GM_xmlhttpRequest({
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

    /**
     * https://stackoverflow.com/a/61511955
     * @param {String} selector The CSS selector used to select the element
     * @returns {Promise<Element>} The selected element
     */
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

    /**
     * Append a notification element to the document
     * @param {String} title The title of the message
     * @param {String} message The message to display
     * @returns {void}
     */
    function notify(title, message) {
        const notificationContainer = document.createElement('div');
        notificationContainer.id = `yt-downloader-notification-${randomNumber}`;

        const titleElement = document.createElement('h3');
        titleElement.textContent = title;

        const messageElement = document.createElement('span');
        messageElement.innerHTML = message;

        const closeButton = document.createElement('button');
        closeButton.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" height="1.5rem" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>';
        closeButton.addEventListener('click', () => {
            notificationContainer.remove();
        });

        notificationContainer.append(titleElement, messageElement, closeButton);
        document.body.appendChild(notificationContainer);
    }

    /**
     * Throw an error after `sec` seconds
     * @param {number} sec How long to wait before throwing an error (seconds)
     * @returns {Promise<void>}
     */
    function timeout(sec) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject('Request timed out after ' + sec + ' seconds');
            }, sec * 1000);
        });
    }

    /**
     * Detect which YouTube service is being used
     * @returns {"SHORTS" | "MUSIC" | "YOUTUBE" | null}
     */
    function updateService() {
        if (window.location.hostname === 'www.youtube.com' && window.location.pathname.startsWith('/shorts'))
            return 'SHORTS';
        else if (window.location.hostname === 'music.youtube.com') return 'MUSIC';
        else if (window.location.hostname === 'www.youtube.com' && window.location.pathname.startsWith('/watch'))
            return 'YOUTUBE';
        else return null;
    }

    /**
     * Left click => download video
     * @returns {void}
     */
    async function leftClick() {
        if (!window.location.pathname.slice(1))
            return notify('Hey!', 'The video/song player is not open, I cannot see the link to download!'); // do nothing if video is not focused

        if (!VIDEO_DATA) return notify("The video data hasn't been loaded yet", 'Try again in a few seconds...');

        try {
            // window.open(await Cobalt(window.location.href), '_blank');
            eval(replacePlaceholders(codeTextArea.value));
        } catch (err) {
            notify('An error occurred!', JSON.stringify(err));
        }
    }

    /**
     * Right click => download audio
     * @param {Event} e The right click event
     * @returns {void}
     */
    async function rightClick(e) {
        e.preventDefault();

        if (!window.location.pathname.slice(1))
            return notify('Hey!', 'The video/song player is not open, I cannot see the link to download!'); // do nothing if video is not focused

        try {
            window.open(await Cobalt(window.location.href, true), '_blank');
        } catch (err) {
            notify('An error occurred!', JSON.stringify(err));
        }

        return false;
    }

    /**
     * Middle mouse button click => open menu
     * @param {MouseEvent} e The mouse event
     * @returns {false}
     */
    function middleClick(e) {
        if (e.buttons !== 4) return;
        e.preventDefault();
        menuPopup.style.display = 'block';
        menuPopup.classList.add('opened');
        menuPopup.classList.remove('closed');

        notify(
            'Wait! Read this first!',
            `Here you can set up the code you want to be executed when LEFT CLICKING the download button.
            <br><br>It requires JavaScript coding knowledge, so proceed only if you know what you are doing.
            <br><br> You have access to <b>some</b> <a target="_blank" href="https://violentmonkey.github.io/api/gm/">GM API functions</a>, described in the userscript header.
            <br><br><a target="_blank" href="https://github.com/madkarmaa/youtube-downloader/docs/PLACEHOLDERS.md">Read more</a>`
        );

        return false;
    }

    /**
     * Renderer process
     * @param {CustomEvent} event The YouTube custom navigation event
     * @returns {Promise<void>}
     */
    async function RENDERER(event) {
        logger('Checking if user is watching');
        // do nothing if the user isn't watching any media
        if (!event?.detail?.endpoint?.watchEndpoint?.videoId && !event?.detail?.endpoint?.reelWatchEndpoint?.videoId) {
            logger('User is not watching');
            return;
        }
        logger('User is watching');

        // wait for the button to copy to appear before continuing
        logger('Waiting for the button to copy to appear');
        let buttonToCopy;
        switch (YOUTUBE_SERVICE) {
            case 'YOUTUBE':
                buttonToCopy = waitForElement(
                    'div#player div.ytp-chrome-controls div.ytp-right-controls button[aria-label="Settings"]'
                );
                break;
            case 'MUSIC':
                buttonToCopy = waitForElement(
                    '[slot="player-bar"] div.middle-controls div.middle-controls-buttons #like-button-renderer #button-shape-dislike button[aria-label="Dislike"]'
                );
                break;
            case 'SHORTS':
                buttonToCopy = waitForElement(
                    'div#actions.ytd-reel-player-overlay-renderer div#comments-button button'
                );
                break;

            default:
                break;
        }

        // cancel rendering after 5 seconds of the button not appearing in the document
        buttonToCopy = await Promise.race([timeout(5), buttonToCopy]);
        logger('Button to copy is:', buttonToCopy);

        // create the download button
        const downloadButton = document.createElement('button');
        downloadButton.id = buttonId;
        downloadButton.title =
            'Click to download as video\nRight click to download as audio\nMMB to open advanced settings menu';
        downloadButton.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="24" viewBox="0 0 24 24" width="24" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;"><path d="M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z"></path></svg>';
        downloadButton.classList = buttonToCopy.classList;

        if (YOUTUBE_SERVICE === 'YOUTUBE') downloadButton.classList.add('ytp-hd-quality-badge');
        downloadButton.classList.add(YOUTUBE_SERVICE);
        logger('Download button created:', downloadButton);

        downloadButton.addEventListener('click', leftClick);
        downloadButton.addEventListener('contextmenu', rightClick);
        downloadButton.addEventListener('mousedown', middleClick);
        logger('Event listeners added to the download button');

        switch (YOUTUBE_SERVICE) {
            case 'YOUTUBE':
                logger('Waiting for the player buttons row to appear');
                const YTButtonsRow = await waitForElement('div#player div.ytp-chrome-controls div.ytp-right-controls');
                logger('Buttons row is now available');

                if (!YTButtonsRow.querySelector('#' + buttonId))
                    YTButtonsRow.insertBefore(downloadButton, YTButtonsRow.firstChild);
                logger('Download button added to the buttons row');

                break;
            case 'MUSIC':
                logger('Waiting for the player buttons row to appear');
                const YTMButtonsRow = await waitForElement(
                    '[slot="player-bar"] div.middle-controls div.middle-controls-buttons'
                );
                logger('Buttons row is now available');

                if (!YTMButtonsRow.querySelector('#' + buttonId))
                    YTMButtonsRow.insertBefore(downloadButton, YTMButtonsRow.firstChild);
                logger('Download button added to the buttons row');

                break;
            case 'SHORTS':
                // wait for the first reel to load
                logger('Waiting for the reels to load');
                await waitForElement('div#actions.ytd-reel-player-overlay-renderer div#like-button');
                logger('Reels loaded');

                document.querySelectorAll('div#actions.ytd-reel-player-overlay-renderer').forEach((buttonsCol) => {
                    if (!buttonsCol.getAttribute('data-button-added') && !buttonsCol.querySelector(buttonId)) {
                        const dlButtonCopy = downloadButton.cloneNode(true);
                        dlButtonCopy.addEventListener('click', leftClick);
                        dlButtonCopy.addEventListener('contextmenu', rightClick);
                        dlButtonCopy.addEventListener('mousedown', middleClick);

                        buttonsCol.insertBefore(dlButtonCopy, buttonsCol.querySelector('div#like-button'));
                        buttonsCol.setAttribute('data-button-added', true);
                    }
                });
                logger('Download buttons added to reels');

                break;

            default:
                break;
        }
    }

    /**
     * Replace the placeholders in a string with their values
     * @param {*} inputString The input string
     * @returns {String} The string with the parsed placeholders
     */
    function replacePlaceholders(inputString) {
        return inputString.replace(/{{\s*([^}\s]+)\s*}}/g, (match, placeholder) => VIDEO_DATA[placeholder] || match);
    }

    let VIDEO_DATA;
    document.addEventListener('yt-player-updated', (e) => {
        const temp_video_data = e.detail.getVideoData();
        VIDEO_DATA = {
            current_time: e.detail.getCurrentTime(),
            video_duration: e.detail.getDuration(),
            video_url: e.detail.getVideoUrl(),
            video_author: temp_video_data?.author,
            video_title: temp_video_data?.title,
            video_id: temp_video_data?.video_id,
        };
        logger('Video data updated', VIDEO_DATA);
    });

    let YOUTUBE_SERVICE = updateService();

    const menuPopup = document.createElement('div');
    menuPopup.id = `yt-downloader-menu-${randomNumber}`;
    menuPopup.style.display = 'none';
    menuPopup.classList.add('closed');

    const codeTextArea = document.createElement('textarea');

    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset to default';
    resetButton.addEventListener('click', () => {
        codeTextArea.value = `(async () => {\n\n${Cobalt.toString()}\n\nwindow.open(await Cobalt('{{ video_url }}'), '_blank');\n\n})();`;
        logger('Code reset');
    });

    menuPopup.append(codeTextArea, resetButton);

    codeTextArea.value =
        localStorage.getItem('yt-dl-code') ||
        `(async () => {\n\n${Cobalt.toString()}\n\nwindow.open(await Cobalt('{{ video_url }}'), '_blank');\n\n})();`;
    localStorage.setItem('yt-dl-code', codeTextArea.value);
    logger('Code retrieved and set to textarea');

    menuPopup.addEventListener('animationend', (e) => {
        if (e.animationName === 'closeMenu') e.target.style.display = 'none';
    });

    document.addEventListener('click', (e) => {
        if (menuPopup.style.display !== 'none' && e.target !== menuPopup && !menuPopup.contains(e.target)) {
            e.preventDefault();
            menuPopup.classList.add('closed');
            menuPopup.classList.remove('opened');
            logger('Menu closed');
            localStorage.setItem('yt-dl-code', codeTextArea.value);
            logger('Code saved to localStorage');
            return false;
        }
    });
    document.body.appendChild(menuPopup);
    logger('Menu created', menuPopup);

    ['yt-navigate', 'yt-navigate-finish'].forEach((evName) =>
        document.addEventListener(evName, (e) => {
            YOUTUBE_SERVICE = updateService();
            logger('Service is:', YOUTUBE_SERVICE);
            if (!YOUTUBE_SERVICE) return;
            RENDERER(e);
        })
    );
})();
