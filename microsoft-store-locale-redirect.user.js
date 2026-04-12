// ==UserScript==
// @name         Microsoft Store Locale Redirect
// @namespace    https://apps.microsoft.com/
// @version      2.0.0
// @description  Automatically redirects Microsoft Store pages to your browser's language and region.
// @author       g31w0fw0rld
// @license      MIT
// @match        https://apps.microsoft.com/detail/*
// @downloadURL  https://github.com/g31w0fw0rld/microsoft-store-locale-redirect/raw/main/microsoft-store-locale-redirect.user.js
// @updateURL    https://github.com/g31w0fw0rld/microsoft-store-locale-redirect/raw/main/microsoft-store-locale-redirect.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // =============================================
    // FUNCIONES
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
     * Comprueba si el locale de la URL difiere del locale del navegador.
     * Si es así, redirige reemplazando los parámetros 'hl' y 'gl'.
     * Usa location.replace() para no dejar entrada en el historial.
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
    // INICIALIZACIÓN
    // =============================================
    try {
        redirectIfNeeded();
    } catch (e) {
        console.error('(microsoft-store-locale-redirect): Error al redirigir:', e);
    }
})();
