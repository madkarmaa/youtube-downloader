// ==UserScript==
// @name            YouTube downloader
// @icon            https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/images/icon.png
// @namespace       aGkgdGhlcmUgOik=
// @source          https://github.com/madkarmaa/youtube-downloader
// @supportURL      https://github.com/madkarmaa/youtube-downloader
// @updateURL       https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/script.user.js
// @downloadURL     https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/script.user.js
// @version         3.1.0
// @description     A simple userscript to download YouTube videos in MAX QUALITY
// @author          mk_
// @match           *://*.youtube.com/*
// @connect         api.cobalt.tools
// @connect         raw.githubusercontent.com
// @grant           GM_info
// @grant           GM_addStyle
// @grant           GM_xmlHttpRequest
// @grant           GM_xmlhttpRequest
// @run-at          document-start
// ==/UserScript==

(async () => {
    'use strict'; // prettier-ignore

    // abort if not on youtube or youtube music
    if (!detectYoutubeService()) {
        console.log('\x1b[31m[YTDL]\x1b[0m Invalid YouTube service, aborting...');
        return;
    }

    // ===== VARIABLES =====
    let DEV_MODE = String(localStorage.getItem('ytdl-dev-mode')).toLowerCase() === 'true';
    let SHOW_NOTIFICATIONS =
        localStorage.getItem('ytdl-notif-enabled') === null
            ? true
            : String(localStorage.getItem('ytdl-notif-enabled')).toLowerCase() === 'true';

    let oldILog = console.log;
    let oldWLog = console.warn;
    let oldELog = console.error;

    let VIDEO_DATA = {
        video_duration: null,
        video_url: null,
        video_author: null,
        video_title: null,
        video_id: null,
    };

    let videoDataReady = false;
    // ===== END VARIABLES =====

    // ===== METHODS =====
    function logger(level, ...args) {
        if (DEV_MODE && level.toLowerCase() === 'info') oldILog.apply(console, ['%c[YTDL]', 'color: #f00;', ...args]);
        else if (DEV_MODE && level.toLowerCase() === 'warn')
            oldWLog.apply(console, ['%c[YTDL]', 'color: #f00;', ...args]);
        else if (level.toLowerCase() === 'error') oldELog.apply(console, ['%c[YTDL]', 'color: #f00;', ...args]);
    }

    function Cobalt(videoUrl, audioOnly = false) {
        // Use Promise because GM.xmlHttpRequest behaves differently with different userscript managers
        return new Promise((resolve, reject) => {
            // https://github.com/wukko/cobalt/blob/current/docs/api.md
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://api.cobalt.tools/api/json',
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

    function fetchNotifications() {
        // Use Promise because GM.xmlHttpRequest behaves differently with different userscript managers
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/notifications.json',
                headers: {
                    'Cache-Control': 'no-cache',
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                onload: (response) => {
                    const data = JSON.parse(response.responseText);
                    if (data?.length) resolve(data);
                    else reject(data);
                },
                onerror: (err) => reject(err),
            });
        });
    }

    class Notification {
        constructor(title, body, uuid, storeUUID = true) {
            const notification = document.createElement('div');
            notification.classList.add('ytdl-notification', 'opened', uuid);

            hideOnAnimationEnd(notification, 'closeNotif', true);

            const nTitle = document.createElement('h2');
            nTitle.textContent = title;
            notification.appendChild(nTitle);

            const nBody = document.createElement('div');
            body.split('\n').forEach((text) => {
                const paragraph = document.createElement('p');
                paragraph.textContent = text;
                nBody.appendChild(paragraph);
            });
            notification.appendChild(nBody);

            const nDismissButton = document.createElement('button');
            nDismissButton.textContent = 'Dismiss';
            nDismissButton.addEventListener('click', () => {
                if (storeUUID) {
                    const localNotificationsHashes = JSON.parse(localStorage.getItem('ytdl-notifications') ?? '[]');
                    localNotificationsHashes.push(uuid);
                    localStorage.setItem('ytdl-notifications', JSON.stringify(localNotificationsHashes));
                    logger('info', `Notification ${uuid} set as read`);
                }

                notification.classList.remove('opened');
                notification.classList.add('closed');
            });
            notification.appendChild(nDismissButton);

            document.body.appendChild(notification);
            logger('info', 'New notification displayed', notification);
        }
    }

    async function manageNotifications() {
        if (!SHOW_NOTIFICATIONS) {
            logger('info', 'Notifications disabled by the user');
            return;
        }

        const localNotificationsHashes = JSON.parse(localStorage.getItem('ytdl-notifications')) ?? [];
        logger('info', 'Local read notifications hashes\n\n', localNotificationsHashes);

        const onlineNotifications = await fetchNotifications();
        logger(
            'info',
            'Online notifications hashes\n\n',
            onlineNotifications.map((n) => n.uuid)
        );

        const unreadNotifications = onlineNotifications.filter((n) => !localNotificationsHashes.includes(n.uuid));
        logger(
            'info',
            'Unread notifications hashes\n\n',
            unreadNotifications.map((n) => n.uuid)
        );

        unreadNotifications.reverse().forEach((n) => {
            new Notification(n.title, n.body, n.uuid);
        });
    }

    async function updateVideoData(e) {
        videoDataReady = false;

        const temp_video_data = e.detail?.getVideoData();
        VIDEO_DATA.video_duration = e.detail?.getDuration();
        VIDEO_DATA.video_url = e.detail?.getVideoUrl();
        VIDEO_DATA.video_author = temp_video_data?.author;
        VIDEO_DATA.video_title = temp_video_data?.title;
        VIDEO_DATA.video_id = temp_video_data?.video_id;

        videoDataReady = true;
        logger('info', 'Video data updated\n\n', VIDEO_DATA);
    }

    async function hookPlayerEvent(...fns) {
        document.addEventListener('yt-player-updated', (e) => {
            for (let i = 0; i < fns.length; i++) fns[i](e);
        });
        logger(
            'info',
            'Video player event hooked. Callbacks:\n\n',
            fns.map((f) => f.name)
        );
    }

    async function hookNavigationEvents(...fns) {
        ['yt-navigate', 'yt-navigate-finish', 'yt-navigate-finish', 'yt-page-data-updated'].forEach((evName) => {
            document.addEventListener(evName, (e) => {
                for (let i = 0; i < fns.length; i++) fns[i](e);
            });
        });
        logger(
            'info',
            'Navigation events hooked. Callbacks:\n\n',
            fns.map((f) => f.name)
        );
    }

    function hideOnAnimationEnd(target, animationName, alsoRemove = false) {
        target.addEventListener('animationend', (e) => {
            if (e.animationName === animationName) {
                if (alsoRemove) e.target.remove();
                else e.target.style.display = 'none';
            }
        });
    }

    // https://stackoverflow.com/a/10344293
    function isTyping() {
        const el = document.activeElement;
        return (
            el &&
            ((el.tagName.toLowerCase() === 'input' && el.type === 'text') ||
                el.tagName.toLowerCase() === 'textarea' ||
                String(el.getAttribute('contenteditable')).toLowerCase() === 'true')
        );
    }

    async function appendSideMenu() {
        const sideMenu = document.createElement('div');
        sideMenu.id = 'ytdl-sideMenu';
        sideMenu.classList.add('closed');
        sideMenu.style.display = 'none';

        hideOnAnimationEnd(sideMenu, 'closeMenu');

        const sideMenuHeader = document.createElement('h2');
        sideMenuHeader.textContent = 'Youtube downloader settings';
        sideMenuHeader.classList.add('header');
        sideMenu.appendChild(sideMenuHeader);

        // ===== templates, don't use, just clone the node =====
        const sideMenuSettingContainer = document.createElement('div');
        sideMenuSettingContainer.classList.add('setting-row');
        const sideMenuSettingLabel = document.createElement('h3');
        sideMenuSettingLabel.classList.add('setting-label');
        const sideMenuSettingDescription = document.createElement('p');
        sideMenuSettingDescription.classList.add('setting-description');
        sideMenuSettingContainer.append(sideMenuSettingLabel, sideMenuSettingDescription);

        const switchContainer = document.createElement('span');
        switchContainer.classList.add('ytdl-switch');
        const switchCheckbox = document.createElement('input');
        switchCheckbox.type = 'checkbox';
        const switchLabel = document.createElement('label');
        switchContainer.append(switchCheckbox, switchLabel);
        // ===== end templates =====

        const notifContainer = sideMenuSettingContainer.cloneNode(true);
        notifContainer.querySelector('.setting-label').textContent = 'Notifications';
        notifContainer.querySelector('.setting-description').textContent =
            "Disable if you don't want to receive notifications from the developer.";
        const notifSwitch = switchContainer.cloneNode(true);
        notifSwitch.querySelector('input').checked = SHOW_NOTIFICATIONS;
        notifSwitch.querySelector('input').id = 'ytdl-notif-switch';
        notifSwitch.querySelector('label').setAttribute('for', 'ytdl-notif-switch');
        notifSwitch.querySelector('input').addEventListener('change', (e) => {
            SHOW_NOTIFICATIONS = e.target.checked;
            localStorage.setItem('ytdl-notif-enabled', SHOW_NOTIFICATIONS);
            logger('info', `Notifications ${SHOW_NOTIFICATIONS ? 'enabled' : 'disabled'}`);
        });
        notifContainer.appendChild(notifSwitch);
        sideMenu.appendChild(notifContainer);

        const devModeContainer = sideMenuSettingContainer.cloneNode(true);
        devModeContainer.querySelector('.setting-label').textContent = 'Developer mode';
        devModeContainer.querySelector('.setting-description').textContent =
            "Show a detailed output of what's happening under the hood in the console.";
        const devModeSwitch = switchContainer.cloneNode(true);
        devModeSwitch.querySelector('input').checked = DEV_MODE;
        devModeSwitch.querySelector('input').id = 'ytdl-dev-mode-switch';
        devModeSwitch.querySelector('label').setAttribute('for', 'ytdl-dev-mode-switch');
        devModeSwitch.querySelector('input').addEventListener('change', (e) => {
            DEV_MODE = e.target.checked;
            localStorage.setItem('ytdl-dev-mode', DEV_MODE);
            // always use console.log here to show output
            console.log(`\x1b[31m[YTDL]\x1b[0m Developer mode ${DEV_MODE ? 'enabled' : 'disabled'}`);
        });
        devModeContainer.appendChild(devModeSwitch);
        sideMenu.appendChild(devModeContainer);

        document.addEventListener('mousedown', (e) => {
            if (sideMenu.style.display !== 'none' && !sideMenu.contains(e.target)) {
                sideMenu.classList.remove('opened');
                sideMenu.classList.add('closed');

                logger('info', 'Side menu closed');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'p') return;
            if (isTyping()) return;

            if (sideMenu.style.display === 'none') {
                sideMenu.style.top = window.scrollY + 'px';
                sideMenu.style.display = 'flex';
                sideMenu.classList.remove('closed');
                sideMenu.classList.add('opened');

                logger('info', 'Side menu opened');
            } else {
                sideMenu.classList.remove('opened');
                sideMenu.classList.add('closed');

                logger('info', 'Side menu closed');
            }
        });

        window.addEventListener('scroll', () => {
            if (sideMenu.classList.contains('closed')) return;

            sideMenu.classList.remove('opened');
            sideMenu.classList.add('closed');

            logger('info', 'Side menu closed');
        });

        document.body.appendChild(sideMenu);
        logger('info', 'Side menu created\n\n', sideMenu);
    }

    function detectYoutubeService() {
        if (window.location.hostname === 'www.youtube.com' && window.location.pathname.startsWith('/shorts'))
            return 'SHORTS';
        if (window.location.hostname === 'www.youtube.com' && window.location.pathname.startsWith('/watch'))
            return 'WATCH';
        else if (window.location.hostname === 'music.youtube.com') return 'MUSIC';
        else if (window.location.hostname === 'www.youtube.com') return 'YOUTUBE';
        else return null;
    }

    function elementInContainer(container, element) {
        return container.contains(element);
    }

    async function leftClick() {
        const isYtMusic = detectYoutubeService() === 'MUSIC';

        if (!isYtMusic && !videoDataReady) {
            logger('warn', 'Video data not ready');
            new Notification('Wait!', 'The video data is not ready yet, try again in a few seconds.', 'popup', false);
            return;
        } else if (isYtMusic && !window.location.pathname.startsWith('/watch')) {
            logger('warn', 'Video URL not avaiable');
            new Notification(
                'Wait!',
                'Open the music player so the song link is visible, then try again.',
                'popup',
                false
            );
            return;
        }

        try {
            logger('info', 'Download started');
            window.open(
                await Cobalt(
                    isYtMusic
                        ? window.location.href.replace('music.youtube.com', 'www.youtube.com')
                        : VIDEO_DATA.video_url
                ),
                '_blank'
            );
            logger('info', 'Download completed');
        } catch (err) {
            logger('error', JSON.parse(JSON.stringify(err)));
            new Notification('Error', JSON.stringify(err), 'error', false);
        }
    }

    async function rightClick(e) {
        const isYtMusic = detectYoutubeService() === 'MUSIC';

        e.preventDefault();

        if (!isYtMusic && !videoDataReady) {
            logger('warn', 'Video data not ready');
            new Notification('Wait!', 'The video data is not ready yet, try again in a few seconds.', 'popup', false);
            return false;
        } else if (isYtMusic && !window.location.pathname.startsWith('/watch')) {
            logger('warn', 'Video URL not avaiable');
            new Notification(
                'Wait!',
                'Open the music player so the song link is visible, then try again.',
                'popup',
                false
            );
            return;
        }

        try {
            logger('info', 'Download started');
            window.open(
                await Cobalt(
                    isYtMusic
                        ? window.location.href.replace('music.youtube.com', 'www.youtube.com')
                        : VIDEO_DATA.video_url,
                    true
                ),
                '_blank'
            );
            logger('info', 'Download completed');
        } catch (err) {
            logger('error', JSON.parse(JSON.stringify(err)));
            new Notification('Error', JSON.stringify(err), 'error', false);
        }

        return false;
    }

    // https://www.30secondsofcode.org/js/s/element-is-visible-in-viewport/
    function elementIsVisibleInViewport(el, partiallyVisible = false) {
        const { top, left, bottom, right } = el.getBoundingClientRect();
        const { innerHeight, innerWidth } = window;
        return partiallyVisible
            ? ((top > 0 && top < innerHeight) || (bottom > 0 && bottom < innerHeight)) &&
                  ((left > 0 && left < innerWidth) || (right > 0 && right < innerWidth))
            : top >= 0 && left >= 0 && bottom <= innerHeight && right <= innerWidth;
    }

    async function appendDownloadButton(e) {
        const ytContainerSelector =
            '#movie_player > div.ytp-chrome-bottom > div.ytp-chrome-controls > div.ytp-right-controls';
        const ytmContainerSelector =
            '#layout > ytmusic-player-bar > div.middle-controls.style-scope.ytmusic-player-bar > div.middle-controls-buttons.style-scope.ytmusic-player-bar';
        const ytsContainerSelector = '#actions.style-scope.ytd-reel-player-overlay-renderer';

        // ===== templates, don't use, just clone the node =====
        const downloadIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        downloadIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        downloadIcon.setAttribute('fill', 'currentColor');
        downloadIcon.setAttribute('height', '24');
        downloadIcon.setAttribute('viewBox', '0 0 24 24');
        downloadIcon.setAttribute('width', '24');
        downloadIcon.setAttribute('focusable', 'false');
        downloadIcon.style.pointerEvents = 'none';
        downloadIcon.style.display = 'block';
        downloadIcon.style.width = '100%';
        downloadIcon.style.height = '100%';
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z');
        downloadIcon.appendChild(path);

        const downloadButton = document.createElement('button');
        downloadButton.id = 'ytdl-download-button';
        downloadButton.classList.add('ytp-button');
        downloadButton.title = 'Left click to download as video, right click as audio only';
        downloadButton.appendChild(downloadIcon);
        // ===== end templates =====

        switch (detectYoutubeService()) {
            case 'WATCH':
                const ytCont = await waitForElement(ytContainerSelector);
                logger('info', 'Download button container found\n\n', ytCont);

                if (elementInContainer(ytCont, ytCont.querySelector('#ytdl-download-button'))) {
                    logger('warn', 'Download button already in container');
                    break;
                }

                const ytDlBtnClone = downloadButton.cloneNode(true);
                ytDlBtnClone.classList.add('YT');
                ytDlBtnClone.addEventListener('click', leftClick);
                ytDlBtnClone.addEventListener('contextmenu', rightClick);
                logger('info', 'Download button created\n\n', ytDlBtnClone);

                ytCont.insertBefore(ytDlBtnClone, ytCont.firstChild);
                logger('info', 'Download button inserted in container');

                break;

            case 'MUSIC':
                const ytmCont = await waitForElement(ytmContainerSelector);
                logger('info', 'Download button container found\n\n', ytmCont);

                if (elementInContainer(ytmCont, ytmCont.querySelector('#ytdl-download-button'))) {
                    logger('warn', 'Download button already in container');
                    break;
                }

                const ytmDlBtnClone = downloadButton.cloneNode(true);
                ytmDlBtnClone.classList.add('YTM');
                ytmDlBtnClone.addEventListener('click', leftClick);
                ytmDlBtnClone.addEventListener('contextmenu', rightClick);
                logger('info', 'Download button created\n\n', ytmDlBtnClone);

                ytmCont.insertBefore(ytmDlBtnClone, ytmCont.firstChild);
                logger('info', 'Download button inserted in container');

                break;

            case 'SHORTS':
                if (e.type !== 'yt-navigate-finish') return;

                await waitForElement(ytsContainerSelector); // wait for the UI to finish loading

                const visibleYtsConts = Array.from(document.querySelectorAll(ytsContainerSelector)).filter((el) =>
                    elementIsVisibleInViewport(el)
                );
                logger('info', 'Download button containers found\n\n', visibleYtsConts);

                visibleYtsConts.forEach((ytsCont) => {
                    if (elementInContainer(ytsCont, ytsCont.querySelector('#ytdl-download-button'))) {
                        logger('warn', 'Download button already in container');
                        return;
                    }

                    const ytsDlBtnClone = downloadButton.cloneNode(true);
                    ytsDlBtnClone.classList.add(
                        'YTS',
                        'yt-spec-button-shape-next',
                        'yt-spec-button-shape-next--tonal',
                        'yt-spec-button-shape-next--mono',
                        'yt-spec-button-shape-next--size-l',
                        'yt-spec-button-shape-next--icon-button'
                    );
                    ytsDlBtnClone.addEventListener('click', leftClick);
                    ytsDlBtnClone.addEventListener('contextmenu', rightClick);
                    logger('info', 'Download button created\n\n', ytsDlBtnClone);

                    ytsCont.insertBefore(ytsDlBtnClone, ytsCont.firstChild);
                    logger('info', 'Download button inserted in container');
                });

                break;

            default:
                return;
        }
    }

    async function devStuff() {
        if (!DEV_MODE) return;

        logger('info', 'Current service is: ' + detectYoutubeService());
    }
    // ===== END METHODS =====

    GM_addStyle(`
#ytdl-sideMenu {
    min-height: 100vh;
    z-index: 9998;
    position: absolute;
    top: 0;
    left: -100vw;
    width: 50vw;
    background-color: var(--yt-spec-base-background);
    border-right: 2px solid var(--yt-spec-static-grey);
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2rem 2.5rem;
    font-family: "Roboto", "Arial", sans-serif;
}

#ytdl-sideMenu.opened {
    animation: openMenu .3s linear forwards;
}

#ytdl-sideMenu.closed {
    animation: closeMenu .3s linear forwards;
}

#ytdl-sideMenu .header {
    text-align: center;
    font-size: 2.5rem;
    color: var(--yt-brand-youtube-red);
}

#ytdl-sideMenu .setting-row {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

#ytdl-sideMenu .setting-label {
    font-size: 1.8rem;
    color: var(--yt-brand-youtube-red);
}

#ytdl-sideMenu .setting-description {
    font-size: 1.4rem;
    color: var(--yt-spec-text-primary);
}

.ytdl-switch {
    display: inline-block;
}

.ytdl-switch input {
    display: none;
}

.ytdl-switch label {
    display: block;
    width: 50px;
    height: 19.5px;
    padding: 3px;
    border-radius: 15px;
    border: 2px solid var(--yt-brand-medium-red);
    cursor: pointer;
    transition: 0.3s;
}

.ytdl-switch label::after {
    content: "";
    display: inherit;
    width: 20px;
    height: 20px;
    border-radius: 12px;
    background: var(--yt-brand-medium-red);
    transition: 0.3s;
}

.ytdl-switch input:checked ~ label {
    border-color: var(--yt-spec-light-green);
}

.ytdl-switch input:checked ~ label::after {
    translate: 30px 0;
    background: var(--yt-spec-light-green);
}

.ytdl-switch input:disabled ~ label {
    opacity: 0.5;
    cursor: not-allowed;
}

.ytdl-notification {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    position: fixed;
    top: 50vh;
    left: 50vw;
    transform: translate(-50%, -50%);
    background-color: var(--yt-spec-base-background);
    border: 2px solid var(--yt-spec-static-grey);
    border-radius: 8px;
    color: var(--yt-spec-text-primary);
    z-index: 9999;
    padding: 1.5rem 1.6rem;
    font-family: "Roboto", "Arial", sans-serif;
    font-size: 1.4rem;
    width: fit-content;
    height: fit-content;
    max-width: 40vw;
    max-height: 50vh;
    word-wrap: break-word;
    line-height: var(--yt-caption-line-height);
}

.ytdl-notification.opened {
    animation: openNotif .3s linear forwards;
}

.ytdl-notification.closed {
    animation: closeNotif .3s linear forwards;
}

.ytdl-notification h2 {
    color: var(--yt-brand-youtube-red);
}

.ytdl-notification > div {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.ytdl-notification > button {
    transition: all 0.2s ease-in-out;
    cursor: pointer;
    border: 2px solid var(--yt-spec-static-grey);
    border-radius: 8px;
    background-color: var(--yt-brand-medium-red);
    padding: 0.7rem 0.8rem;
    color: #fff;
    font-weight: 600;
}

.ytdl-notification button:hover {
    background-color: var(--yt-spec-red-70);
}

#ytdl-download-button {
    background: none;
    border: none;
    outline: none;
    color: var(--yt-spec-text-primary);
    cursor: pointer;
    transition: color 0.2s ease-in-out;
    display: inline-flex;
    justify-content: center;
    align-items: center;
}

#ytdl-download-button:hover {
    color: var(--yt-brand-youtube-red);
}

#ytdl-download-button.YTM {
    transform: scale(1.5);
    margin: 0 1rem;
}

#ytdl-download-button > svg {
    transform: translateX(3.35%);
}

@keyframes openMenu {
    0% {
        left: -100vw;
    }

    100% {
        left: 0;
    }
}

@keyframes closeMenu {
    0% {
        left: 0;
    }

    100% {
        left: -100vw;
    }
}

@keyframes openNotif {
    0% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}

@keyframes closeNotif {
    0% {
        opacity: 1;
    }

    100% {
        opacity: 0;
    }
}
`);
    logger('info', 'Custom styles added');

    hookPlayerEvent(updateVideoData);
    hookNavigationEvents(appendDownloadButton, devStuff);

    // functions that require the DOM to exist
    window.addEventListener('DOMContentLoaded', () => {
        appendSideMenu();
        appendDownloadButton();
        manageNotifications();
    });
})();
