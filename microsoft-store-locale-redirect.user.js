// ==UserScript==
// @name         Microsoft Store Locale Redirect
// @namespace    https://apps.microsoft.com/
// @version      2.2.0
// @description  Redirige las páginas de Microsoft Store (apps.microsoft.com) al idioma/región del navegador, y en la lista de deseos (microsoft.com/…/store/wishlist) agrega ordenar y filtrar (por agregado, nombre, precio y descuento; filtro "solo con descuento") con recuerdo de la elección y URL compartible.
// @author       g31w0fw0rld
// @license      MIT
// @match        https://apps.microsoft.com/detail/*
// @match        https://www.microsoft.com/*/store/wishlist*
// @downloadURL  https://github.com/g31w0fw0rld/microsoft-store-locale-redirect/raw/main/microsoft-store-locale-redirect.user.js
// @updateURL    https://github.com/g31w0fw0rld/microsoft-store-locale-redirect/raw/main/microsoft-store-locale-redirect.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // =============================================
    // DETECCIÓN DE RUTA
    // =============================================
    function isWishlist() {
        return location.hostname === 'www.microsoft.com' && /\/store\/wishlist/i.test(location.pathname);
    }

    // =============================================
    // IDIOMA (auto-detect: si la página/navegador está en español -> es, si no -> en)
    // =============================================
    // Prioriza el lang del documento (idioma con que Microsoft sirve la página) y
    // cae al del navegador. Solo distingue español vs. resto (inglés por defecto).
    function detectLang() {
        const docLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
        const navLang = (navigator.language || navigator.languages?.[0] || '').toLowerCase();
        return (docLang || navLang).startsWith('es') ? 'es' : 'en';
    }
    const LANG = detectLang();
    const I18N = {
        es: {
            sortLabel: 'Ordenar:', added: 'Agregado', name: 'Nombre', price: 'Precio', discount: 'Descuento',
            dirTitle: 'Ascendente / Descendente', onlyDiscount: 'Solo con descuento', remember: 'Recordar',
            copy: '🔗 Copiar enlace', copied: '✔ Copiado', copyPrompt: 'Copia este enlace:',
        },
        en: {
            sortLabel: 'Sort:', added: 'Added', name: 'Name', price: 'Price', discount: 'Discount',
            dirTitle: 'Ascending / Descending', onlyDiscount: 'Only discounted', remember: 'Remember',
            copy: '🔗 Copy link', copied: '✔ Copied', copyPrompt: 'Copy this link:',
        },
    };
    const t = I18N[LANG];

    // =============================================
    // LOCALE REDIRECT (solo en apps.microsoft.com/detail)
    // =============================================

    /**
     * Obtiene el locale del navegador (ej. "es-MX", "pt-BR", "en-US").
     * @returns {{ hl: string, gl: string }} Parámetros de idioma y región.
     */
    function getBrowserLocale() {
        const lang = navigator.language || navigator.languages[0] || 'en-US';
        const parts = lang.split('-');
        const hl = parts.length >= 2 ? `${parts[0]}-${parts[1].toUpperCase()}` : lang;
        const gl = parts.length >= 2 ? parts[1].toUpperCase() : '';
        return { hl, gl };
    }

    /**
     * Si el locale de la URL (query hl) difiere del del navegador, redirige
     * reemplazando 'hl' y 'gl'. Usa location.replace() (sin historial).
     */
    function redirectIfNeeded() {
        const url = new URL(window.location.href);
        const currentHl = (url.searchParams.get('hl') || '').toLowerCase();
        const { hl, gl } = getBrowserLocale();
        if (!currentHl || currentHl === hl.toLowerCase()) return;

        url.searchParams.set('hl', hl);
        if (gl) url.searchParams.set('gl', gl);
        window.location.replace(url.toString());
    }

    // =============================================
    // WISHLIST — ordenar y filtrar
    // =============================================
    // Microsoft Store renderiza el wishlist con clases estables (no hasheadas),
    // así que los selectores son directos y sobreviven a los rebuilds.
    const LIST_SELECTOR = 'ul.wishlist-list';
    const ITEM_SELECTOR = 'li.product-wishlist-item';
    const TITLE_SELECTOR = '.wishlist-item-title';
    const PRICE_BOX_SELECTOR = '[id^="wishlist-price-"]';
    const CUR_PRICE_SELECTOR = '.font-weight-semibold';   // precio vigente
    const ORIG_PRICE_SELECTOR = '.text-line-through';     // precio original (tachado)
    const DISCOUNT_BADGE_SELECTOR = '.badge.bg-yellow';   // "Ahorra $X"

    const ORD_ATTR = 'data-mswl-ord';
    const TOOLBAR_ID = 'mswl-toolbar';
    const STYLES_ID = 'mswl-styles';
    const SETTINGS_KEY = 'mswl-settings';
    const SORTS = ['added', 'name', 'price', 'discount'];
    const SORT_LABELS = { added: t.added, name: t.name, price: t.price, discount: t.discount };

    let settings = loadSettings();
    let applying = false;          // silencia el observer al reordenar
    let listObserver = null;
    let observerDebounce = null;

    // --- Persistencia -----------------------------------------------------------
    function loadSettings() {
        const def = { remember: true, sort: 'added', dir: 'asc', onlyDiscount: false };
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && typeof parsed === 'object') {
                return Object.assign(def, parsed, {
                    sort: SORTS.includes(parsed.sort) ? parsed.sort : 'added',
                    dir: parsed.dir === 'desc' ? 'desc' : 'asc',
                    onlyDiscount: !!parsed.onlyDiscount,
                    remember: parsed.remember !== false,
                });
            }
        } catch (e) { console.error('(mswl): loadSettings error:', e); }
        return def;
    }
    function saveSettings() {
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
        catch (e) { console.error('(mswl): saveSettings error:', e); }
    }
    function persistIfRemember() { if (settings.remember !== false) saveSettings(); }

    // --- URL compartible (parámetros legibles) ----------------------------------
    function readUrlView() {
        const p = new URLSearchParams(location.search);
        if (!p.has('wlsort') && !p.has('wldir') && !p.has('wldisc')) return null;
        return {
            sort: SORTS.includes(p.get('wlsort')) ? p.get('wlsort') : 'added',
            dir: p.get('wldir') === 'desc' ? 'desc' : 'asc',
            onlyDiscount: p.get('wldisc') === '1',
        };
    }
    function buildShareUrl() {
        const p = new URLSearchParams(location.search);
        // Conservar params ajenos (p. ej. ?id=... de una lista compartida).
        p.delete('wlsort'); p.delete('wldir'); p.delete('wldisc');
        if (settings.sort && settings.sort !== 'added') p.set('wlsort', settings.sort);
        if (settings.dir && settings.dir !== 'asc') p.set('wldir', settings.dir);
        if (settings.onlyDiscount) p.set('wldisc', '1');
        const qs = p.toString();
        return location.origin + location.pathname + (qs ? ('?' + qs) : '');
    }

    // --- Extracción -------------------------------------------------------------
    function parsePrice(txt) {
        if (!txt) return null;
        const m = txt.replace(/\s/g, '').match(/[\d.,]+/);
        if (!m) return null;
        let s = m[0];
        const lastDot = s.lastIndexOf('.'), lastComma = s.lastIndexOf(',');
        if (lastDot >= 0 && lastComma >= 0) {
            if (lastDot > lastComma) s = s.replace(/,/g, '');
            else s = s.replace(/\./g, '').replace(',', '.');
        } else if (lastComma >= 0) {
            s = (s.length - 1 - lastComma === 3) ? s.replace(/,/g, '') : s.replace(',', '.');
        }
        const n = parseFloat(s);
        return isNaN(n) ? null : n;
    }

    function extract(el) {
        const name = (el.querySelector(TITLE_SELECTOR)?.textContent || '').trim();
        const box = el.querySelector(PRICE_BOX_SELECTOR) || el;
        const price = parsePrice(box.querySelector(CUR_PRICE_SELECTOR)?.textContent);
        const original = parsePrice(box.querySelector(ORIG_PRICE_SELECTOR)?.textContent);
        const hasBadge = !!el.querySelector(DISCOUNT_BADGE_SELECTOR);
        const discounted = (original != null && price != null && original > price) || hasBadge;
        const disc = (discounted && original && price) ? (original - price) / original : 0;
        const ord = parseInt(el.getAttribute(ORD_ATTR), 10);
        return { name, price, original, discounted, disc, ord: isNaN(ord) ? 0 : ord };
    }

    // --- Ordenar / filtrar ------------------------------------------------------
    function getListEl() { return document.querySelector(LIST_SELECTOR); }
    function getItems(list) { return Array.from((list || document).querySelectorAll(ITEM_SELECTOR)); }

    function tagOriginalOrder(items) {
        items.forEach((el, i) => { if (el.getAttribute(ORD_ATTR) == null) el.setAttribute(ORD_ATTR, String(i)); });
    }
    function priceCmp(a, b) { const x = a == null ? Infinity : a, y = b == null ? Infinity : b; return x - y; }

    function apply() {
        const list = getListEl();
        if (!list) return;
        const items = getItems(list);
        if (!items.length) return;
        tagOriginalOrder(items);

        // Desconectar el observer mientras reordenamos: appendChild dispara
        // mutaciones de childList que, como el callback corre en microtask (tras
        // resetear el flag), reentrarían en apply() en bucle. Reconectar al final
        // descarta esas mutaciones propias y deja escuchando cambios externos.
        applying = true;
        if (listObserver) listObserver.disconnect();
        try {
            const mul = settings.dir === 'desc' ? -1 : 1;
            const rows = items.map((el) => ({ el, d: extract(el) }));
            rows.sort((a, b) => {
                let c = 0;
                if (settings.sort === 'name') c = a.d.name.localeCompare(b.d.name, undefined, { sensitivity: 'base' });
                else if (settings.sort === 'price') c = priceCmp(a.d.price, b.d.price);
                else if (settings.sort === 'discount') c = a.d.disc - b.d.disc;
                else c = a.d.ord - b.d.ord;
                if (c === 0) c = a.d.ord - b.d.ord;
                return c * mul;
            });
            rows.forEach(({ el, d }) => {
                el.style.display = (settings.onlyDiscount && !d.discounted) ? 'none' : '';
                list.appendChild(el);
            });
        } finally {
            applying = false;
            if (listObserver) listObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
        }
    }

    // --- UI ---------------------------------------------------------------------
    function injectStyles() {
        if (document.getElementById(STYLES_ID)) return;
        const style = document.createElement('style');
        style.id = STYLES_ID;
        style.textContent = `
            #${TOOLBAR_ID} {
                display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
                margin: 0 0 16px; padding: 10px 12px; border-radius: 8px;
                background: rgba(127,127,127,.12); font-size: 14px; color: inherit;
            }
            #${TOOLBAR_ID} label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
            #${TOOLBAR_ID} select, #${TOOLBAR_ID} button {
                font-size: 14px; padding: 4px 8px; border-radius: 6px;
                border: 1px solid rgba(127,127,127,.4); background: inherit; color: inherit; cursor: pointer;
            }
            #${TOOLBAR_ID} .mswl-dir { min-width: 2.2em; text-align: center; font-weight: 600; }
            #${TOOLBAR_ID} .mswl-share { background: #107c10; color: #fff; border: none; }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function buildToolbar() {
        injectStyles();
        const bar = document.createElement('div');
        bar.id = TOOLBAR_ID;

        const sortLabel = document.createElement('label');
        sortLabel.appendChild(document.createTextNode(t.sortLabel));
        const sortSel = document.createElement('select');
        SORTS.forEach((s) => {
            const o = document.createElement('option');
            o.value = s; o.textContent = SORT_LABELS[s];
            if (s === settings.sort) o.selected = true;
            sortSel.appendChild(o);
        });
        sortSel.addEventListener('change', () => {
            settings.sort = sortSel.value;
            settings.dir = (settings.sort === 'discount') ? 'desc' : 'asc';
            dirBtn.textContent = settings.dir === 'desc' ? '↓' : '↑';
            persistIfRemember(); apply();
        });
        sortLabel.appendChild(sortSel);

        const dirBtn = document.createElement('button');
        dirBtn.type = 'button';
        dirBtn.className = 'mswl-dir';
        dirBtn.title = t.dirTitle;
        dirBtn.textContent = settings.dir === 'desc' ? '↓' : '↑';
        dirBtn.addEventListener('click', () => {
            settings.dir = settings.dir === 'desc' ? 'asc' : 'desc';
            dirBtn.textContent = settings.dir === 'desc' ? '↓' : '↑';
            persistIfRemember(); apply();
        });

        const discLabel = document.createElement('label');
        const discChk = document.createElement('input');
        discChk.type = 'checkbox';
        discChk.checked = !!settings.onlyDiscount;
        discChk.addEventListener('change', () => { settings.onlyDiscount = discChk.checked; persistIfRemember(); apply(); });
        discLabel.appendChild(discChk);
        discLabel.appendChild(document.createTextNode(t.onlyDiscount));

        const remLabel = document.createElement('label');
        const remChk = document.createElement('input');
        remChk.type = 'checkbox';
        remChk.checked = settings.remember !== false;
        remChk.addEventListener('change', () => { settings.remember = remChk.checked; saveSettings(); });
        remLabel.appendChild(remChk);
        remLabel.appendChild(document.createTextNode(t.remember));

        const shareBtn = document.createElement('button');
        shareBtn.type = 'button';
        shareBtn.className = 'mswl-share';
        shareBtn.textContent = t.copy;
        shareBtn.addEventListener('click', async () => {
            const url = buildShareUrl();
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(url);
                    shareBtn.textContent = t.copied;
                    setTimeout(() => { shareBtn.textContent = t.copy; }, 2000);
                } else { window.prompt(t.copyPrompt, url); }
            } catch (e) { window.prompt(t.copyPrompt, url); }
        });

        bar.appendChild(sortLabel);
        bar.appendChild(dirBtn);
        bar.appendChild(discLabel);
        bar.appendChild(remLabel);
        bar.appendChild(shareBtn);
        return bar;
    }

    function ensureToolbar() {
        if (document.getElementById(TOOLBAR_ID)) return;
        const list = getListEl();
        if (!list) return;
        list.parentNode.insertBefore(buildToolbar(), list);
    }

    // --- Observer + init --------------------------------------------------------
    function startObserver() {
        if (listObserver) return;
        listObserver = new MutationObserver(() => {
            if (applying) return;
            if (observerDebounce) return;
            observerDebounce = setTimeout(() => {
                observerDebounce = null;
                ensureToolbar();
                apply();
            }, 250);
        });
        listObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }

    function waitForList(timeoutMs) {
        return new Promise((resolve) => {
            if (getListEl()) return resolve(getListEl());
            const deadline = Date.now() + (timeoutMs || 15000);
            const iv = setInterval(() => {
                if (getListEl()) { clearInterval(iv); resolve(getListEl()); }
                else if (Date.now() > deadline) { clearInterval(iv); resolve(null); }
            }, 200);
        });
    }

    async function initWishlist() {
        const list = await waitForList(20000);
        if (!list) return;

        const fromUrl = readUrlView();
        if (fromUrl) {
            settings.sort = fromUrl.sort;
            settings.dir = fromUrl.dir;
            settings.onlyDiscount = fromUrl.onlyDiscount;
            if (settings.remember !== false) saveSettings();
        }
        ensureToolbar();
        apply();
        startObserver();
        console.log('(mswl): Microsoft Store wishlist tools activos');
    }

    // =============================================
    // INICIALIZACIÓN (por ruta)
    // =============================================
    try {
        if (isWishlist()) initWishlist();
        else redirectIfNeeded();
    } catch (e) {
        console.error('(microsoft-store-locale-redirect): Error:', e);
    }
})();
