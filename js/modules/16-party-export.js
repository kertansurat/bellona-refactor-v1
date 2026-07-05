/* BELLONA ROOC Web v2.5.3 Production - Party Export Module
   Scope locked: screenshot/export module only.
   This version builds a clean export DOM instead of cloning the live party DOM,
   so old index CSS (.party-slot/.party-player-name/.capture-export-mode) cannot affect PNG layout. */
(function () {
    'use strict';

    const EXPORT_WIDTH = 2000;
    const EXPORT_SCALE = 2;
    const PARTY_COUNT = 8;
    const SLOT_COUNT = 5;

    function $(id) { return document.getElementById(id); }
    function pad2(n) { return String(n).padStart(2, '0'); }
    function todayString() {
        const d = new Date();
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }
    function safeText(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim(); }
    function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    function nextFrame() { return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }
    function titleCaseKind(kind) { return kind === 'sub' ? 'SUB PARTY' : 'MAIN PARTY'; }
    function partyPrefix(kind) { return kind === 'sub' ? 'subparty' : 'party'; }
    function partyTitlePrefix(kind) { return kind === 'sub' ? 'SUB PARTY' : 'PARTY'; }

    const JOB_BY_SRC = [
        ['lordknight', 'Lord Knight'],
        ['paladin', 'Paladin'],
        ['highpriest', 'High Priest'],
        ['wizard', 'High Wizard'],
        ['sniper', 'Sniper'],
        ['assasin', 'Assassin Cross'],
        ['assassin', 'Assassin Cross'],
        ['champion', 'Champion'],
        ['sage', 'Sage'],
        ['stalker', 'Stalker'],
        ['dance', 'Gypsy'],
        ['blacksmith', 'Mastersmith'],
        ['bio', 'Biochemist'],
        ['gunslinger', 'Gunslinger'],
        ['summoner', 'Summoner']
    ];

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async function waitForImages(root) {
        const imgs = Array.from(root.querySelectorAll('img'));
        await Promise.all(imgs.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        }));
    }

    function setButtonBusy(isBusy) {
        document.querySelectorAll('[data-bellona-export-btn]').forEach(btn => {
            btn.classList.toggle('is-exporting', isBusy);
            btn.disabled = !!isBusy;
        });
    }

    function getSlotElement(kind, partyIndex, slotIndex) {
        return $(`slot-${partyPrefix(kind)}-${partyIndex}-${slotIndex}-content`);
    }

    function inferJobFromIcon(img) {
        if (!img) return '';
        const alt = safeText(img.getAttribute('alt'));
        const title = safeText(img.getAttribute('title'));
        if (alt) return alt;
        if (title) return title;
        const src = safeText(img.getAttribute('src')).toLowerCase();
        const found = JOB_BY_SRC.find(([key]) => src.includes(key));
        return found ? found[1] : '';
    }

    function iconHtmlFromSlot(slot) {
        const img = slot && slot.querySelector('.party-player-info img');
        if (img && img.getAttribute('src')) {
            return `<img class="bp-player-icon" src="${escapeHtml(img.getAttribute('src'))}" crossorigin="anonymous" alt="">`;
        }
        const fallback = slot && slot.querySelector('.party-player-info > div');
        const txt = safeText(fallback && fallback.textContent) || '✦';
        return `<div class="bp-player-icon bp-player-icon-fallback">${escapeHtml(txt)}</div>`;
    }

    function getPlayerFromSlot(slot) {
        if (!slot) return null;
        const nameNode = slot.querySelector('.party-player-name');
        const name = safeText(nameNode && nameNode.textContent);
        if (!name) return null;
        const img = slot.querySelector('.party-player-info img');
        return {
            name,
            job: inferJobFromIcon(img),
            iconHtml: iconHtmlFromSlot(slot)
        };
    }

    function readSummaryText(id, fallback) {
        const el = $(id);
        return safeText(el && el.textContent) || fallback;
    }

    function buildSlotHtml(player) {
        if (!player) {
            return `<div class="bp-party-slot"><div class="bp-empty-slot">ว่างเปล่า</div></div>`;
        }
        return `
            <div class="bp-party-slot">
                <div class="bp-player-row">
                    ${player.iconHtml}
                    <div class="bp-player-text">
                        <span class="bp-player-name">${escapeHtml(player.name)}</span>
                        <span class="bp-player-job">${escapeHtml(player.job || ' ')}</span>
                    </div>
                </div>
            </div>`;
    }

    function buildPartyCard(kind, partyIndex) {
        const id = `${partyPrefix(kind)}-${partyIndex}`;
        const count = readSummaryText(`${id}-counter`, '0/5').replace(/^.*?(\d+\s*\/\s*5).*$/i, '$1');
        const powerRaw = readSummaryText(`${id}-power`, '-');
        const power = powerRaw.replace(/^.*?(\d+(?:\.\d+)?\s*[KMB]?|-).*$/i, '$1');

        let slots = '';
        for (let s = 0; s < SLOT_COUNT; s++) {
            slots += buildSlotHtml(getPlayerFromSlot(getSlotElement(kind, partyIndex, s)));
        }

        return `
            <div class="bp-party-card">
                <div class="bp-party-head">
                    <div class="bp-party-title">${partyTitlePrefix(kind)} ${partyIndex}</div>
                    <div class="bp-party-summary">
                        <span class="bp-count">👥 ${escapeHtml(count || '0/5')}</span>
                        <span class="bp-power">⚡ ${escapeHtml(power || '-')}</span>
                    </div>
                </div>
                <div class="bp-party-body">${slots}</div>
            </div>`;
    }

    function countPlayers(kind) {
        let total = 0;
        for (let i = 1; i <= PARTY_COUNT; i++) {
            const id = `${partyPrefix(kind)}-${i}`;
            const text = readSummaryText(`${id}-counter`, '0/5');
            const m = text.match(/(\d+)\s*\/\s*5/);
            if (m) total += Number(m[1]);
        }
        return total;
    }

    function buildExportSheet(kind) {
        if (typeof window.renderParties === 'function') {
            try { window.renderParties(); } catch (e) { console.warn('[party-export] renderParties skipped:', e); }
        }

        const date = todayString();
        const kindTitle = titleCaseKind(kind);
        const sheet = document.createElement('div');
        sheet.className = `bp-export-sheet bp-export-${kind}`;

        let cards = '';
        for (let i = 1; i <= PARTY_COUNT; i++) cards += buildPartyCard(kind, i);

        sheet.innerHTML = `
            <div class="bp-export-inner">
                <div class="bp-export-header">
                    <div class="bp-export-brand">
                        <img class="bp-export-logo" src="./assets/logo-bellona.png" alt="BELLONA" crossorigin="anonymous">
                        <div>
                            <h1 class="bp-export-title">BELLONA GVG</h1>
                            <div class="bp-export-subtitle">${kind === 'sub' ? '🛡️ SUB PARTY 1 - 8' : '👑 MAIN PARTY 1 - 8'} · ${date}</div>
                        </div>
                    </div>
                    <div class="bp-export-meta">
                        <div class="bp-export-meta-type">${kindTitle}</div>
                        <div class="bp-export-meta-line"><span>👥 ${countPlayers(kind)} Players</span><span>⚡ ${kind === 'sub' ? 'SUB' : 'MAIN'}</span></div>
                    </div>
                </div>
                <div class="bp-export-grid">${cards}</div>
                <div class="bp-export-footer">
                    <div>Generated by <b>BELLONA GVG Suite</b></div>
                    <div class="bp-export-footer-right">${kindTitle} Export · ${date}</div>
                </div>
            </div>`;
        return sheet;
    }

    function downloadCanvas(canvas, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    async function renderSheetToCanvas(sheet) {
        if (!window.html2canvas) throw new Error('ไม่พบ html2canvas');

        let stage = document.querySelector('.bp-export-stage');
        if (!stage) {
            stage = document.createElement('div');
            stage.className = 'bp-export-stage';
            document.body.appendChild(stage);
        }

        stage.innerHTML = '';
        stage.appendChild(sheet);
        await waitForImages(sheet);

        if (document.fonts && document.fonts.ready) {
            try { await document.fonts.ready; } catch (_) {}
        }

        await nextFrame();
        await wait(120);

        const rect = sheet.getBoundingClientRect();
        const height = Math.ceil(rect.height);
        const canvas = await html2canvas(sheet, {
            backgroundColor: null,
            scale: EXPORT_SCALE,
            useCORS: true,
            allowTaint: true,
            logging: false,
            scrollX: 0,
            scrollY: 0,
            width: EXPORT_WIDTH,
            height,
            windowWidth: EXPORT_WIDTH,
            windowHeight: height
        });

        stage.innerHTML = '';
        return canvas;
    }

    async function exportParty(kind) {
        const normalizedKind = kind === 'sub' ? 'sub' : 'main';
        setButtonBusy(true);
        try {
            const sheet = buildExportSheet(normalizedKind);
            const canvas = await renderSheetToCanvas(sheet);
            const filename = normalizedKind === 'sub'
                ? `BELLONA_SubParty_${todayString()}.png`
                : `BELLONA_MainParty_${todayString()}.png`;
            downloadCanvas(canvas, filename);
            return true;
        } catch (err) {
            console.error('[party-export] export failed:', err);
            alert(`Export ${normalizedKind === 'sub' ? 'Sub' : 'Main'} PNG ไม่สำเร็จ: ${err.message || err}`);
            return false;
        } finally {
            setButtonBusy(false);
        }
    }

    async function exportAll() {
        setButtonBusy(true);
        try {
            const mainCanvas = await renderSheetToCanvas(buildExportSheet('main'));
            downloadCanvas(mainCanvas, `BELLONA_MainParty_${todayString()}.png`);
            await wait(450);
            const subCanvas = await renderSheetToCanvas(buildExportSheet('sub'));
            downloadCanvas(subCanvas, `BELLONA_SubParty_${todayString()}.png`);
        } catch (err) {
            console.error('[party-export] export all failed:', err);
            alert(`Export All ไม่สำเร็จ: ${err.message || err}`);
        } finally {
            setButtonBusy(false);
        }
    }

    function injectExportButtons() {
        const tab = $('tab-content-party');
        if (!tab || tab.dataset.partyExportInjected === '1') return;

        const cameraBtn = tab.querySelector('button[onclick*="captureParties"]');
        if (!cameraBtn) return;

        const wrap = document.createElement('div');
        wrap.className = 'flex gap-2.5 flex-wrap';
        wrap.innerHTML = `
            <button type="button" data-bellona-export-btn class="bellona-export-btn" onclick="BellonaPartyExport.exportMain()">
                <i class="fa-solid fa-camera"></i> Main PNG
            </button>
            <button type="button" data-bellona-export-btn class="bellona-export-btn" onclick="BellonaPartyExport.exportSub()">
                <i class="fa-solid fa-camera"></i> Sub PNG
            </button>
            <button type="button" data-bellona-export-btn class="bellona-export-btn primary" onclick="BellonaPartyExport.exportAll()">
                <i class="fa-solid fa-download"></i> Export All
            </button>`;

        cameraBtn.replaceWith(wrap);
        tab.dataset.partyExportInjected = '1';
    }

    window.BellonaPartyExport = {
        exportMain: () => exportParty('main'),
        exportSub: () => exportParty('sub'),
        exportAll,
        captureParties: exportAll
    };

    window.captureParties = exportAll;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectExportButtons);
    } else {
        injectExportButtons();
    }
    window.addEventListener('load', injectExportButtons);
})();
