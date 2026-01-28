// ==UserScript==
// @name         Ardi
// @namespace    https://github.com/RuslanDTKZ/ardi-tampermonkey
// @version      4.9
// @description  PrimeFaces automation с UI-настройками
// @author       RD
// @match        https://ala.socium.kz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=socium.kz
// @updateURL    https://raw.githubusercontent.com/RuslanDTKZ/ardi-tampermonkey/main/ardi.user.js
// @downloadURL  https://raw.githubusercontent.com/RuslanDTKZ/ardi-tampermonkey/main/ardi.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

/* ======================
   Ardi — версия 4.9
   Автообновление через GitHub
   ====================== */

(function () {
'use strict';

/* ================= DEFAULT SETTINGS ================= */

const DEFAULT_SETTINGS = {
    EVENT_TEXT: 'B.0.13 ^поддержание условий проживания в соответствии с санитарно-гигиеническими требованиями',
    FORM_DATA: {
        date: getTodayDate(),
        number: '30',
        text: 'Поддержание условий проживания в соответствии с санитарно-гигиеническими требованиями - выполнено'
    },
    PARTICIPANTS_ENABLED: false,
    PARTICIPANTS: [
        'БАТЫРКУЛОВА КЕУКЕР ЕРЕЖЕПОВНА',
        'НУРСЕИТОВА САМАЛ ЕРЖАНОВНА'
    ]
};

function loadSettings() {
    return Object.assign({}, DEFAULT_SETTINGS, GM_getValue('settings', {}));
}

function saveSettings(s) {
    GM_setValue('settings', s);
}

function getTodayDate() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ================= STORAGE ================= */

const log = msg => unsafeWindow.console.log('[TM]', msg);

const loadLinks = () => GM_getValue('links', []);
const saveLinks = l => GM_setValue('links', l);

const getIndex = () => GM_getValue('index', 0);
const setIndex = i => GM_setValue('index', i);

const addError = msg => {
        const e = GM_getValue('errors', []);
        e.push(msg);
        GM_setValue('errors', e);
        log('ERROR: ' + msg);
        showStatus('❌ ' + msg);
    };

/* ================= UI ================= */

let statusBox;

function showStatus(t) {
    if (statusBox) statusBox.textContent = t;
}

function createUI() {
    const box = document.createElement('div');
    box.style.cssText = `
        position:fixed;
        left:20px;
        bottom:20px;
        z-index:2147483647;
        background:#263238;
        color:#fff;
        padding:10px;
        border-radius:8px;
        font-family:Arial;
        font-size:13px;
        min-width:280px;
    `;

    box.innerHTML = `
    <div id="controls" style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-bottom:8px;">
        <input type="file" id="csv" accept=".csv"><br>
        <button id="settings" style="margin-left:auto">⚙ Настройки</button><br>
        <button id="start">▶ Старт</button>
        <button id="next">➡ Следующий</button>
        <button id="saveNext">💾➡ Сохранить и далее</button>
        <div id="status" style="margin-top:8px;font-size:12px;color:#90caf9"></div>
    </div>
    `;

    document.body.appendChild(box);
    statusBox = box.querySelector('#status');

    box.querySelector('#settings').onclick = openSettingsUI;

    box.querySelector('#csv').onchange = e => {
        const r = new FileReader();
        r.onload = () => {
            const links = r.result.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
            saveLinks(links);
            setIndex(0);
            updateCsvStatus();
            showStatus(`📂 Загружено: ${links.length}`);
        };
        r.readAsText(e.target.files[0]);
    };

    box.querySelector('#start').onclick = () => {
        const links = loadLinks();
        if (!links.length) return alert('Загрузите CSV');
        location.href = links[getIndex()];
    };

    box.querySelector('#next').onclick = goNext;
    box.querySelector('#saveNext').onclick = '';
    const fileInput = box.querySelector('#csv');
    if (loadLinks().length) {
    const links = loadLinks();
    const index = getIndex();
    const left = links.length - index;

    fileInput.insertAdjacentHTML(
        'afterend',
        `<div id="csvStatus" style="color:#81c784;font-size:12px">
            📂 CSV загружен — осталось ${left} / ${links.length}
        </div>`
    );
}



}

function updateCsvStatus() {
    const el = document.getElementById('csvStatus');
    if (!el) return;

    const links = loadLinks();
    const index = getIndex();
    const left = Math.max(links.length - index, 0);

    el.textContent = `📂 CSV загружен — осталось ${left} / ${links.length}`;
}

/* ================= SETTINGS UI ================= */

function openSettingsUI() {
    const s = loadSettings();

    const p = document.createElement('div');
    p.style.cssText = `
        position:fixed;
        right:20px;
        bottom:20px;
        z-index:2147483647;
        background:#1e1e1e;
        color:#fff;
        padding:12px;
        border-radius:8px;
        width:360px;
        font-family:Arial;
        font-size:13px;
    `;

    p.innerHTML = `
        <b>⚙ Настройки</b><br><br>
        Фильтр мероприятий<br>
        <textarea id="ev" style="width:100%; height:48px;">${s.EVENT_TEXT}</textarea><br><br>

        Дата<br>
        <input id="dt" style="width:100%" value="${s.FORM_DATA.date}"><br>
        Продолжительность<br>
        <input id="nm" style="width:100%" value="${s.FORM_DATA.number}"><br>
        Примечание<br>
        <textarea id="tx" style="width:100%">${s.FORM_DATA.text}</textarea><br><br>

        <label style="color:#ffffff"><input type="checkbox" id="pe" ${s.PARTICIPANTS_ENABLED ? 'checked' : ''}> Добавлять соисполнителей</label><br><br>

        Соисполнители (по одному на строку)<br>
        <textarea id="pl" style="width:100%">${s.PARTICIPANTS.join('\n')}</textarea><br><br>

        <button id="sv">💾 Сохранить</button>
        <button id="rs">♻ Сброс</button>
        <button id="cl">✖ Закрыть</button>
    `;

    document.body.appendChild(p);

    p.querySelector('#cl').onclick = () => p.remove();
    p.querySelector('#sv').onclick = () => {
        saveSettings({
            EVENT_TEXT: p.querySelector('#ev').value.trim(),
            FORM_DATA: {
                date: p.querySelector('#dt').value.trim(),
                number: p.querySelector('#nm').value.trim(),
                text: p.querySelector('#tx').value.trim()
            },
            PARTICIPANTS_ENABLED: p.querySelector('#pe').checked,
            PARTICIPANTS: p.querySelector('#pl').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)
        });
        showStatus('⚙ Настройки сохранены');
        p.remove();
    };
    p.querySelector('#rs').onclick = () => {
    GM_setValue('settings', DEFAULT_SETTINGS);
    showStatus('♻ Настройки сброшены');

    p.querySelector('#ev').value = DEFAULT_SETTINGS.EVENT_TEXT;
    p.querySelector('#dt').value = DEFAULT_SETTINGS.FORM_DATA.date;
    p.querySelector('#nm').value = DEFAULT_SETTINGS.FORM_DATA.number;
    p.querySelector('#tx').value = DEFAULT_SETTINGS.FORM_DATA.text;
    p.querySelector('#pe').checked = DEFAULT_SETTINGS.PARTICIPANTS_ENABLED;
    p.querySelector('#pl').value = DEFAULT_SETTINGS.PARTICIPANTS.join('\n');
};

}

/* ================= EVENT ================= */

function waitForEvent() {
    const s = loadSettings();
    const t = setInterval(() => {
        document.querySelectorAll('label[id^="msuEventTable"]').forEach(l => {
            if (l.textContent.includes(s.EVENT_TEXT)) {
                const b = l.closest('tr')?.querySelector('button');
                if (b) {
                    clearInterval(t);
                    showStatus('✅ Мероприятие найдено');
                    b.click();
                }
            }
        });
    }, 500);
}

/* ================= FORM ================= */

function waitForForm() {
    const t = setInterval(() => {
        const d = document.querySelector('#j_idt30\\:j_idt49_input');
        const n = document.querySelector('#j_idt30\\:j_idt52_input');
        const x = document.querySelector('#j_idt30\\:j_idt64\\:inputTextValueId');

        if (d && n && x) {
            clearInterval(t);
            fillForm(d,n,x);
        }
    }, 200);
}

function fillForm(d,n,x) {
    lockSaveButton(true);
    const s = loadSettings();

    d.value = s.FORM_DATA.date;
    n.value = s.FORM_DATA.number;
    x.value = s.FORM_DATA.text;

    ['input','change'].forEach(e => {
        d.dispatchEvent(new Event(e,{bubbles:true}));
        n.dispatchEvent(new Event(e,{bubbles:true}));
        x.dispatchEvent(new Event(e,{bubbles:true}));
    });

    if (s.PARTICIPANTS_ENABLED) addParticipants();
    unlockSaveButton();
    showStatus('✍️ Форма заполнена');
}

    /* ================= Управление кнопкой «Сохранить» ================= */

    function getSaveButton() {
    return document.querySelector('#j_idt30\\:j_idt129');
    }

    function lockSaveButton(initial = false) {
    const btn = getSaveButton();
    if (!btn) return;

    btn.disabled = true;
    btn.style.background = '#d42c2c';
    btn.style.borderColor = '#d42c2c';
    btn.style.opacity = '0.7';

    if (initial) {
        btn.querySelector('.ui-button-text').textContent = 'Заполняется…';
    }
    }

    function unlockSaveButton() {
    const btn = getSaveButton();
    if (!btn) return;

    btn.disabled = false;
    btn.style.background = '#3cedfa';
    btn.style.borderColor = '#3cedfa';
    btn.style.opacity = '1';
    btn.querySelector('.ui-button-text').textContent = 'Сохранить';
    }

/* ================= PARTICIPANTS ================= */

async function addParticipants() {
    const s = loadSettings();
    try {
        document.getElementById('j_idt30:participantEmployeeTable:j_idt120')?.click();
        await waitEl('.ui-selectlistbox-item');
        document.querySelectorAll('.ui-selectlistbox-item').forEach(r => {
            const t = r.innerText;
            if (s.PARTICIPANTS.some(p => t.includes(p))) {
                r.querySelector('.ui-chkbox-box')?.click();
            }
        });
        document.querySelector('#j_idt146\\:j_idt154')?.click();
        showStatus('🎉 Соисполнители добавлены');
    } catch(e){}
}

function waitEl(sel) {
    return new Promise((res,rej)=>{
        const s=Date.now(),i=setInterval(()=>{
            const e=document.querySelector(sel);
            if(e){clearInterval(i);res(e);}
            if(Date.now()-s>15000){clearInterval(i);rej();}
        },300);
    });
}

/* ================= NAV ================= */

function goNext() {
    const l = loadLinks();
    const i = getIndex() + 1;
    if (i >= l.length) return alert('Готово');

    setIndex(i);
    updateCsvStatus();
    location.href = l[i];
}


/* ================= BOOT ================= */

const boot = setInterval(() => {
    if (document.body) {
        clearInterval(boot);
        createUI();
        waitForEvent();
        waitForForm();
    }
}, 300);

})();