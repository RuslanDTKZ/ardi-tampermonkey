// ==UserScript==
// @name         Ardi
// @namespace    https://github.com/RuslanDTKZ/ardi-tampermonkey
// @version      4.12
// @description  PrimeFaces automation с UI-настройками
// @author       RD
// @match        https://ala.socium.kz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=socium.kz
// @updateURL    https://github.com/RuslanDTKZ/ardi-tampermonkey/raw/refs/heads/main/Ardi.user.js
// @downloadURL  https://github.com/RuslanDTKZ/ardi-tampermonkey/raw/refs/heads/main/Ardi.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==


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
        AUTO_NEXT_ON_CLOSE: false,
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
        <label style="color:#ffffff">
    <input type="checkbox" id="an" ${s.AUTO_NEXT_ON_CLOSE ? 'checked' : ''}>
    Автопереход при закрытии формы
</label><br><br>


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
                AUTO_NEXT_ON_CLOSE: p.querySelector('#an').checked,
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
            p.querySelector('#an').checked = DEFAULT_SETTINGS.AUTO_NEXT_ON_CLOSE;
        };

    }

    /* ================= EVENT ================= */

    function waitForEvent() {
        const s = loadSettings();
        if (!s.EVENT_TEXT || !s.EVENT_TEXT.trim()) {
            showStatus('⚠️ Укажите фильтр мероприятий');
            return;
        }
        const start = Date.now();

        const t = setInterval(() => {
            if (Date.now() - start > 60000) {
                clearInterval(t);
                showStatus('❌ Мероприятие не найдено');
                return;
            }

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

    function byLabel(text) {
        const labels = [...document.querySelectorAll('label')];
        const lbl = labels.find(l => l.textContent.trim() === text);
        if (!lbl) return null;

        const wrap = lbl.closest('div');
        return wrap?.querySelector('input, textarea') || null;
    }

    function byIdEnd(suffix) {
        return document.querySelector(`[id$="${suffix}"]`);
    }

    function buttonByText(text) {
        return [...document.querySelectorAll('button, a')]
            .find(b => b.textContent.trim() === text);
    }

    function getDateInput() {
        return (
            byLabel('Дата выполнения') ||
            document.querySelector('.ui-calendar input') ||
            byIdEnd('_input')
        );
    }

    function getDurationInput() {
        return (
            document.querySelector('.ui-inputnumber input[type="text"]') ||
            byLabel('Продолжительность (в минутах)') ||
            byIdEnd('_hinput')?.previousElementSibling
        );
    }

    function getNoteTextarea() {
        return (
            byIdEnd('inputTextValueId') ||
            document.querySelector('textarea.ui-inputtextarea')
        );
    }

    function getSaveButton() {
        return buttonByText('Сохранить')
        || buttonByText('Заполняется…');
    }


    function getAddParticipantButton() {
        return (
            buttonByText('Добавить') ||
            document.querySelector('[id*="participantEmployeeTable"]')
        );
    }

    function getParticipantDialog() {
        return document.getElementById('participantEmployeeDialog');
    }

    function getParticipantRows() {
        return [
            ...document.querySelectorAll(
                '#participantEmployeeDialog .ui-selectlistbox-item'
            )
        ];
    }

    function waitForForm() {
        const t = setInterval(() => {
            const d = getDateInput();
            const n = getDurationInput();
            const x = getNoteTextarea();

            if (d && n && x) {
                clearInterval(t);
                fillForm(d, n, x);
            }
        }, 300);
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

        showStatus('✍️ Форма заполнена');
        unlockSaveButton();
    }

    /* ================= Управление кнопкой «Сохранить» ================= */

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

    function normalizeName(str) {
        return str
            .toLowerCase()
            .replace(/ё/g, 'е')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function normalize(str) {
        return str
            .toLowerCase()
            .replace(/ё/g, 'е')
            .replace(/[^а-яa-z\s]/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function parseName(str) {
        const parts = normalize(str).split(' ');
        return {
            last: parts[0] || '',
            firstInitial: parts[1]?.[0] || ''
        };
    }

    async function addParticipants() {
        const s = loadSettings();

        try {
            document.getElementById('j_idt30:participantEmployeeTable:j_idt120')?.click();
            await waitEl('.ui-selectlistbox-item');

            const rows = [...document.querySelectorAll('.ui-selectlistbox-item')];

            // разбираем всех сотрудников из списка
            const employees = rows.map(r => ({
                el: r,
                name: parseName(r.innerText)
            }));

            // считаем однофамильцев
            const lastNameCount = {};
            employees.forEach(e => {
                lastNameCount[e.name.last] = (lastNameCount[e.name.last] || 0) + 1;
            });

            rows.forEach((r, idx) => {
                const emp = employees[idx];

                const matched = s.PARTICIPANTS.some(p => {
                    const q = parseName(p);

                    // фамилия обязана совпасть
                    if (emp.name.last !== q.last) return false;

                    // если указана первая буква имени — сверяем
                    if (q.firstInitial) {
                        return emp.name.firstInitial === q.firstInitial;
                    }

                    // иначе разрешаем только если фамилия уникальна
                    return lastNameCount[emp.name.last] === 1;
                });

                if (matched) {
                    r.querySelector('.ui-chkbox-box')?.click();
                }
            });

            document.querySelector('#j_idt146\\:j_idt154')?.click();
            showStatus('🎉 Соисполнители добавлены');
        } catch (e) {}
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

    function watchDialogHide() {
        const obs = new MutationObserver(mutations => {
            const s = loadSettings();
            if (!s.AUTO_NEXT_ON_CLOSE) return;

            mutations.forEach(m => {
                const el = m.target;
                if (
                    el.classList?.contains('ui-dialog') &&
                    el.id?.includes('msuEventTable') &&
                    el.style.display === 'none'
                ) {
                    showStatus('➡ Форма закрыта — автопереход');
                    setTimeout(goNext, 500);
                }
            });
        });

        obs.observe(document.body, {
            attributes: true,
            subtree: true,
            attributeFilter: ['style', 'class']
        });
    }



    /* ================= BOOT ================= */

    function waitForPrimeFaces(cb) {
        const t = setInterval(() => {
            if (unsafeWindow.PrimeFaces) {
                clearInterval(t);
                cb();
            }
        }, 300);
    }

    const boot = setInterval(() => {
        if (document.body) {
            clearInterval(boot);
            createUI();
            waitForPrimeFaces(() => {
                waitForEvent();
                waitForForm();
            });
            watchDialogHide()
        }
    }, 300);

})();
