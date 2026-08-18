// ==UserScript==
// @name         Microsoft Store Locale Redirect
// @namespace    https://apps.microsoft.com/
// @version      2.7.0
// @description  Sends Microsoft Store pages to the language and country you pick from 21 curated locales — a path segment on microsoft.com, hl/gl on apps.microsoft.com — keeping the choice in a cookie so both subdomains share it, redirecting without adding history entries, and clearing an invalid value instead of looping on it. On your wishlist it adds sort and filters with remembered settings, a shareable link and a 'Learn more' panel. On game pages it adds GG.deals and PCGamingWiki buttons.
// @author       g31w0fw0rld
// @license      MIT
// @match        https://apps.microsoft.com/*
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
    // El @match cubre TODO apps.microsoft.com, además de la lista de deseos, que
    // vive en www.microsoft.com. La redirección de locale se aplica en toda la
    // tienda; la interfaz, solo en la lista de deseos y en las fichas. Ver route().
    //
    // Cargar en toda la tienda es lo que hace que los botones aparezcan sin
    // recargar, igual que en el gemelo de Xbox: el gestor de userscripts inyecta al
    // cargar el documento, y esta tienda es una SPA, así que llegando a una ficha
    // desde una página no cubierta —una búsqueda, el home, una colección— no había
    // carga que disparara la inyección y el script no llegaba a existir. Con él ya
    // dentro, el hook de history de watchSpaNav() está puesto cuando ocurre esa
    // navegación y la ficha se atiende al vuelo.
    function isWishlist() {
        return location.hostname === 'www.microsoft.com' && /\/store\/wishlist/i.test(location.pathname);
    }

    // =============================================
    // IDIOMA
    // =============================================
    // Los 13 idiomas de la lista curada de LOCALES (más abajo): son las lenguas
    // a las que este script puede llevarte, así que son las que tiene sentido
    // hablar. Las claves son códigos BCP-47 en minúsculas.
    //
    // Lo importante aquí es que el script habla el idioma que TÚ elegiste en su
    // propio selector de redirección: si mandas la tienda a ja-JP, el panel se
    // pone en japonés en vez de quedarse en inglés contradiciendo a la página.
    const I18N = {
        en: {
            sortLabel: 'Sort:', added: 'Added', name: 'Name', price: 'Price', discount: 'Discount',
            onlyDiscount: 'Only discounted', remember: 'Remember',
            copy: '🔗 Copy link', copied: '✔ Copied', copyPrompt: 'Copy this link:',
            about: 'ℹ️ Learn more', close: 'Close',
            regionLabel: 'Redirect:', autoLocale: 'Auto (no redirect)',
            applyLabel: '✔ Apply', applyTip: 'Saves the chosen locale and applies the redirect now (reloads this page, wishlist included, in that language/country). With "Auto" it does not redirect.',
            sortTip: 'Sorts your wishlist by date added, name, price or discount percentage.',
            dirTip: 'Toggles ascending (↑) and descending (↓) order.',
            onlyDiscountTip: 'Hides items that are not on sale; shows only discounted ones.',
            rememberTip: 'Saves your sort and filters and reapplies them when you return to the wishlist.',
            copyTip: 'Copies a link that reproduces your current sort and filters when opened.',
            regionTip: 'Choose the language/country (locale) to redirect Microsoft Store pages to, including this wishlist. With "Auto" it does not redirect. Click "Apply" to save and redirect now.',
            ggTip: 'Searches the title on GG.deals with the Microsoft Store DRM filter. Being a title search, it may not hit the exact game.',
            pcgwTip: 'Searches PCGamingWiki (compatibility and fixes) for the game itself: without the edition suffix, and for DLC and packs, by their base game. Being a name search, it may not hit the exact article.',
            aboutTip: 'See everything this script does.',
            aboutTitle: 'What does this script do?',
            aboutName: 'Name:',
            aboutVersion: 'Version:',
            aboutAuthor: 'Author:',
            aboutBody: [
                'This script improves Microsoft Store in three ways:',
                '• Region redirect: takes Microsoft Store pages —apps.microsoft.com and your wishlist— to the language/country (locale) you pick in the selector. With "Auto" it does not redirect.',
                '– The selector offers 21 curated locales, only combinations the store actually supports.',
                '– It redirects two different ways depending on the site: on microsoft.com the locale is a path segment (/en-us/) and on apps.microsoft.com it is a query (hl and gl).',
                '– It uses a replace rather than a new navigation, so it leaves no extra history entry and the Back button behaves normally.',
                '– An invalid saved locale is cleared instead of used, so a bad value cannot cause a redirect loop.',
                '– "Apply" saves your choice and redirects right away, wishlist included.',
                '– The script itself also speaks the language of the locale you pick, so the toolbar does not contradict the page around it.',
                '• Wishlist tools:',
                '– Sort: by date added, name, price or discount, with an ↑/↓ button for ascending or descending.',
                '– Only discounted: shows only items on sale.',
                '– Remember: saves your sort and filters and reapplies them on return.',
                '– Copy link: builds a URL that reproduces your sort and filters. If the browser blocks clipboard access, it shows the URL in a dialog so you can copy it by hand.',
                '• On product pages it adds buttons to GG.deals (prices/deals) and PCGamingWiki (compatibility and fixes).',
                '– Games only: the product kind is asked of Microsoft\'s public catalog, so apps and subscriptions get no buttons.',
                '– The name is requested from Microsoft\'s public catalog and kept in localStorage to avoid repeating the call. It is needed because the search uses the English name, not the title you see: the page is translated, the URL included, and both sites are indexed in English. If the catalog does not answer, no buttons are added.',
                '– GG.deals opens already filtered to the Microsoft Store DRM, the same way the Steam, GOG and Epic scripts do with theirs, and without the default minimum store rating that hides part of the deals.',
                '– GG.deals gets the full title, edition included (and without accents, since it transliterates its index); PCGamingWiki gets the game itself: without packaging suffixes (Standard, Deluxe, Premium…) and, on a DLC or an edition, by its base game, which Microsoft publishes as the product group shared by every SKU of one game. That group is only used when it really appears inside the title: sometimes it is an internal name ("Boost" for Devil May Cry 5 Special Edition) and searching for it would be worse than doing nothing. Genuinely separate releases (Definitive, Anniversary, Special, Remastered) are left alone.',
                'The country/language preference is stored in a microsoft.com cookie, because the wishlist and the app pages sit on different subdomains that do not share localStorage; the rest does go in localStorage. No data is sent to any server.'
            ]
        },
        es: {
            sortLabel: 'Ordenar:', added: 'Agregado', name: 'Nombre', price: 'Precio', discount: 'Descuento',
            onlyDiscount: 'Solo con descuento', remember: 'Recordar',
            copy: '🔗 Copiar enlace', copied: '✔ Copiado', copyPrompt: 'Copia este enlace:',
            about: 'ℹ️ Saber más', close: 'Cerrar',
            regionLabel: 'Redirección:', autoLocale: 'Auto (no redirigir)',
            applyLabel: '✔ Aplicar', applyTip: 'Guarda el locale elegido y aplica la redirección ahora (recarga esta página, incluida la lista de deseos, en ese idioma/país). Con "Auto" no redirige.',
            sortTip: 'Ordena tu lista de deseos por fecha de agregado, nombre, precio o porcentaje de descuento.',
            dirTip: 'Alterna entre orden ascendente (↑) y descendente (↓).',
            onlyDiscountTip: 'Oculta los juegos que no están en oferta; muestra solo los que tienen descuento.',
            rememberTip: 'Guarda tu orden y filtros y los reaplica al volver a la lista de deseos.',
            copyTip: 'Copia un enlace que reproduce tu orden y filtros actuales al abrirlo.',
            regionTip: 'Elige el idioma/país (locale) al que redirigir las páginas de Microsoft Store, incluida esta lista de deseos. Con "Auto" no redirige. Pulsa "Aplicar" para guardar y redirigir ahora.',
            ggTip: 'Busca el título en GG.deals con el filtro de DRM de Microsoft Store. Al buscar por nombre, puede no dar con el juego exacto.',
            pcgwTip: 'Busca en PCGamingWiki (compatibilidad y arreglos) el juego en sí: sin el sufijo de edición y, en DLC y paquetes, por su juego base. Al buscar por nombre, puede no dar con el artículo exacto.',
            aboutTip: 'Ver qué hace este script en su totalidad.',
            aboutTitle: '¿Qué hace este script?',
            aboutName: 'Nombre:',
            aboutVersion: 'Versión:',
            aboutAuthor: 'Autor:',
            aboutBody: [
                'Este script mejora Microsoft Store en tres frentes:',
                '• Redirección de región: lleva las páginas de Microsoft Store —apps.microsoft.com y tu lista de deseos— al idioma/país (locale) que elijas en el selector. Con "Auto" no redirige.',
                '– El selector ofrece 21 locales curados, solo combinaciones que la tienda soporta de verdad.',
                '– Redirige de dos formas según el sitio: en microsoft.com el locale es un segmento de la ruta (/es-mx/) y en apps.microsoft.com es una query (hl y gl).',
                '– Usa un reemplazo en vez de una navegación nueva, así que no deja entrada extra en el historial y el botón Atrás se comporta con normalidad.',
                '– Un locale guardado inválido se borra en vez de usarse, para no entrar en bucles de redirección.',
                '– "Aplicar" guarda tu elección y redirige al momento, lista de deseos incluida.',
                '– El propio script habla también el idioma del locale que elijas, para que la barra no contradiga a la página que la rodea.',
                '• Herramientas en tu lista de deseos:',
                '– Ordenar: por fecha de agregado, nombre, precio o descuento, con un botón ↑/↓ para ascendente o descendente.',
                '– Solo con descuento: muestra únicamente las apps/juegos en oferta.',
                '– Recordar: guarda tu orden y filtros y los reaplica al volver.',
                '– Copiar enlace: genera una URL que reproduce tu orden y filtros. Si el navegador bloquea el portapapeles, la muestra en un diálogo para copiarla a mano.',
                '• En las fichas de producto añade botones a GG.deals (precios/ofertas) y PCGamingWiki (compatibilidad y arreglos).',
                '– Solo en juegos: el tipo de producto se pregunta al catálogo público de Microsoft, así que las apps y las suscripciones no reciben botones.',
                '– El nombre se pide al catálogo público de Microsoft y se guarda en localStorage para no repetir la consulta. Hace falta porque se busca por el nombre en inglés, no por el título que ves: la ficha va traducida, hasta la URL, y las dos webs están indexadas en inglés. Si el catálogo no responde, no se ponen los botones.',
                '– GG.deals se abre ya filtrado por el DRM de Microsoft Store, igual que los scripts de Steam, GOG y Epic hacen con el suyo, y sin el mínimo de valoración que trae por defecto y que esconde parte de las ofertas.',
                '– GG.deals recibe el título completo, con su edición (y sin acentos, porque translitera su índice); PCGamingWiki recibe el juego en sí: sin sufijos de empaquetado (Standard, Deluxe, Premium…) y, en un DLC o una edición, por su juego base, que Microsoft publica como el grupo de producto que comparten todos los SKU de un mismo juego. Ese grupo solo se usa si de verdad aparece dentro del título: a veces es un nombre interno ("Boost" en Devil May Cry 5 Special Edition) y buscar eso sería peor que no tocar nada. Los que sí son lanzamientos aparte (Definitive, Anniversary, Special, Remastered) se dejan tal cual.',
                'La preferencia de país/idioma se guarda en una cookie de microsoft.com, porque la lista de deseos y las fichas de app están en subdominios distintos que no comparten localStorage; el resto sí va en localStorage. No se envían datos a ningún servidor.'
            ]
        },
        de: {
            sortLabel: 'Sortieren:', added: 'Hinzugefügt', name: 'Name', price: 'Preis', discount: 'Rabatt',
            onlyDiscount: 'Nur reduzierte', remember: 'Merken',
            copy: '🔗 Link kopieren', copied: '✔ Kopiert', copyPrompt: 'Diesen Link kopieren:',
            about: 'ℹ️ Mehr erfahren', close: 'Schließen',
            regionLabel: 'Weiterleitung:', autoLocale: 'Automatisch (keine Weiterleitung)',
            applyLabel: '✔ Anwenden', applyTip: 'Speichert das gewählte Gebietsschema und wendet die Weiterleitung sofort an (lädt diese Seite, Wunschliste inbegriffen, in dieser Sprache bzw. diesem Land neu). Mit „Automatisch“ wird nicht weitergeleitet.',
            sortTip: 'Sortiert deine Wunschliste nach Hinzufügedatum, Name, Preis oder Rabatt in Prozent.',
            dirTip: 'Wechselt zwischen aufsteigender (↑) und absteigender (↓) Reihenfolge.',
            onlyDiscountTip: 'Blendet Einträge aus, die nicht im Angebot sind; zeigt nur reduzierte.',
            rememberTip: 'Speichert Sortierung und Filter und wendet sie bei der Rückkehr zur Wunschliste wieder an.',
            copyTip: 'Kopiert einen Link, der beim Öffnen deine aktuelle Sortierung und Filter wiederherstellt.',
            regionTip: 'Wähle Sprache und Land (Gebietsschema), wohin Seiten des Microsoft Store weitergeleitet werden sollen, diese Wunschliste eingeschlossen. Mit „Automatisch“ wird nicht weitergeleitet. Klicke auf „Anwenden“, um zu speichern und sofort weiterzuleiten.',
            ggTip: 'Sucht den Titel auf GG.deals mit dem DRM-Filter des Microsoft Store. Da es eine Titelsuche ist, wird nicht immer das exakte Spiel getroffen.',
            pcgwTip: 'Sucht auf PCGamingWiki (Kompatibilität und Fixes) nach dem Spiel selbst: ohne Editions-Zusatz und bei DLC und Paketen nach dem Hauptspiel. Da nach dem Namen gesucht wird, trifft es nicht immer den genauen Artikel.',
            aboutTip: 'Alles ansehen, was dieses Skript macht.',
            aboutTitle: 'Was macht dieses Skript?',
            aboutName: 'Name:',
            aboutVersion: 'Version:',
            aboutAuthor: 'Autor:',
            aboutBody: [
                'Dieses Skript verbessert den Microsoft Store an drei Stellen:',
                '• Regionsweiterleitung: bringt Seiten des Microsoft Store – apps.microsoft.com und deine Wunschliste – in die Sprache bzw. das Land (Gebietsschema), das du im Auswahlmenü wählst. Mit „Automatisch“ wird nicht weitergeleitet.',
                '– Das Auswahlmenü bietet 21 kuratierte Gebietsschemata, nur Kombinationen, die der Store wirklich unterstützt.',
                '– Es leitet je nach Website auf zwei Arten weiter: auf microsoft.com ist das Gebietsschema ein Pfadsegment (/de-de/), auf apps.microsoft.com eine Abfrage (hl und gl).',
                '– Es ersetzt den Eintrag, statt neu zu navigieren, hinterlässt also keinen zusätzlichen Verlaufseintrag, und die Zurück-Schaltfläche verhält sich normal.',
                '– Ein ungültig gespeichertes Gebietsschema wird gelöscht statt verwendet, damit ein falscher Wert keine Weiterleitungsschleife auslösen kann.',
                '– „Anwenden“ speichert deine Wahl und leitet sofort weiter, Wunschliste eingeschlossen.',
                '– Das Skript selbst spricht ebenfalls die Sprache des gewählten Gebietsschemas, damit die Leiste nicht der Seite drumherum widerspricht.',
                '• Werkzeuge auf der Wunschliste:',
                '– Sortieren: nach Hinzufügedatum, Name, Preis oder Rabatt, mit einer ↑/↓-Schaltfläche für auf- oder absteigend.',
                '– Nur reduzierte: zeigt nur Einträge im Angebot.',
                '– Merken: speichert Sortierung und Filter und wendet sie bei der Rückkehr wieder an.',
                '– Link kopieren: baut eine URL, die deine Sortierung und Filter wiederherstellt. Blockiert der Browser die Zwischenablage, wird die URL in einem Dialog zum Abschreiben angezeigt.',
                '• Auf Produktseiten kommen Schaltflächen zu GG.deals (Preise/Angebote) und PCGamingWiki (Kompatibilität und Fixes) dazu.',
                '– Nur bei Spielen: Die Produktart wird beim öffentlichen Katalog von Microsoft erfragt, deshalb bekommen Apps und Abos keine Schaltflächen.',
                '– Der Name wird beim öffentlichen Katalog von Microsoft angefragt und im localStorage behalten, um die Abfrage nicht zu wiederholen. Nötig ist das, weil nach dem englischen Namen gesucht wird und nicht nach dem Titel, den du siehst: die Seite ist übersetzt, die URL eingeschlossen, und beide Zielsites sind auf Englisch indexiert. Antwortet der Katalog nicht, werden keine Schaltflächen gesetzt.',
                '– GG.deals öffnet sich bereits auf das DRM des Microsoft Store gefiltert, genauso wie es die Skripte für Steam, GOG und Epic mit ihrem tun, und ohne die standardmäßige Mindestbewertung, die einen Teil der Angebote verbirgt.',
                '– GG.deals bekommt den vollen Titel samt Edition (und ohne Akzente, da der Index transliteriert wird); PCGamingWiki bekommt das Spiel selbst: ohne Verpackungs-Zusätze (Standard, Deluxe, Premium…) und bei einem DLC oder einer Edition den Namen des Hauptspiels, den Microsoft als Produktgruppe aller SKUs eines Spiels veröffentlicht. Diese Gruppe wird nur verwendet, wenn sie wirklich im Titel vorkommt: manchmal ist es ein interner Name ("Boost" bei Devil May Cry 5 Special Edition), und danach zu suchen wäre schlechter als gar nichts. Echte eigenständige Veröffentlichungen (Definitive, Anniversary, Special, Remastered) bleiben unangetastet.',
                'Die Länder-/Sprachwahl wird in einem Cookie von microsoft.com gespeichert, weil Wunschliste und App-Seiten auf verschiedenen Subdomains liegen, die sich localStorage nicht teilen; der Rest landet sehr wohl im localStorage. Es werden keine Daten an einen Server gesendet.'
            ]
        },
        fr: {
            sortLabel: 'Trier :', added: 'Ajout', name: 'Nom', price: 'Prix', discount: 'Remise',
            onlyDiscount: 'Uniquement en promo', remember: 'Mémoriser',
            copy: '🔗 Copier le lien', copied: '✔ Copié', copyPrompt: 'Copiez ce lien :',
            about: 'ℹ️ En savoir plus', close: 'Fermer',
            regionLabel: 'Redirection :', autoLocale: 'Auto (pas de redirection)',
            applyLabel: '✔ Appliquer', applyTip: 'Enregistre les paramètres régionaux choisis et applique la redirection maintenant (recharge cette page, liste de souhaits comprise, dans cette langue et ce pays). Avec « Auto », aucune redirection.',
            sortTip: 'Trie votre liste de souhaits par date d’ajout, nom, prix ou pourcentage de remise.',
            dirTip: 'Bascule entre l’ordre croissant (↑) et décroissant (↓).',
            onlyDiscountTip: 'Masque les articles qui ne sont pas en promotion ; n’affiche que ceux en remise.',
            rememberTip: 'Enregistre votre tri et vos filtres et les réapplique à votre retour sur la liste de souhaits.',
            copyTip: 'Copie un lien qui reproduit votre tri et vos filtres actuels à l’ouverture.',
            regionTip: 'Choisissez la langue et le pays (paramètres régionaux) vers lesquels rediriger les pages du Microsoft Store, y compris cette liste de souhaits. Avec « Auto », aucune redirection. Cliquez sur « Appliquer » pour enregistrer et rediriger tout de suite.',
            ggTip: 'Recherche le titre sur GG.deals avec le filtre DRM du Microsoft Store. S’agissant d’une recherche par titre, le jeu exact peut ne pas être trouvé.',
            pcgwTip: 'Recherche sur PCGamingWiki (compatibilité et correctifs) le jeu lui-même : sans le suffixe d\'édition et, pour les DLC et les packs, par leur jeu de base. S\'agissant d\'une recherche par nom, elle peut ne pas tomber sur l\'article exact.',
            aboutTip: 'Voir tout ce que fait ce script.',
            aboutTitle: 'Que fait ce script ?',
            aboutName: 'Nom :',
            aboutVersion: 'Version :',
            aboutAuthor: 'Auteur :',
            aboutBody: [
                'Ce script améliore le Microsoft Store sur trois fronts :',
                '• Redirection de région : emmène les pages du Microsoft Store — apps.microsoft.com et votre liste de souhaits — vers la langue et le pays (paramètres régionaux) choisis dans le sélecteur. Avec « Auto », aucune redirection.',
                '– Le sélecteur propose 21 paramètres régionaux sélectionnés, uniquement des combinaisons réellement prises en charge par la boutique.',
                '– Il redirige de deux façons selon le site : sur microsoft.com les paramètres régionaux sont un segment de chemin (/fr-fr/) et sur apps.microsoft.com un paramètre de requête (hl et gl).',
                '– Il utilise un remplacement plutôt qu’une nouvelle navigation : aucune entrée supplémentaire dans l’historique et le bouton Retour se comporte normalement.',
                '– Une valeur enregistrée invalide est effacée au lieu d’être utilisée, pour éviter les boucles de redirection.',
                '– « Appliquer » enregistre votre choix et redirige immédiatement, liste de souhaits comprise.',
                '– Le script lui-même parle aussi la langue des paramètres régionaux choisis, pour que la barre ne contredise pas la page qui l’entoure.',
                '• Outils sur votre liste de souhaits :',
                '– Trier : par date d’ajout, nom, prix ou remise, avec un bouton ↑/↓ pour l’ordre croissant ou décroissant.',
                '– Uniquement en promo : n’affiche que les articles en solde.',
                '– Mémoriser : enregistre votre tri et vos filtres et les réapplique au retour.',
                '– Copier le lien : construit une URL qui reproduit votre tri et vos filtres. Si le navigateur bloque le presse-papiers, l’URL s’affiche dans une boîte de dialogue pour la copier à la main.',
                '• Sur les fiches produit, il ajoute des boutons vers GG.deals (prix/promotions) et PCGamingWiki (compatibilité et correctifs).',
                '– Uniquement pour les jeux : le type de produit est demandé au catalogue public de Microsoft, donc les applications et les abonnements n’ont pas de boutons.',
                '– Le nom est demandé au catalogue public de Microsoft et conservé dans localStorage pour ne pas répéter l’appel. C’est nécessaire parce que la recherche se fait sur le nom anglais et non sur le titre que vous voyez : la fiche est traduite, URL comprise, et les deux sites sont indexés en anglais. Si le catalogue ne répond pas, aucun bouton n’est ajouté.',
                '– GG.deals s’ouvre déjà filtré sur le DRM du Microsoft Store, comme le font les scripts Steam, GOG et Epic avec le leur, et sans la note minimale de boutique appliquée par défaut qui masque une partie des offres.',
                '– GG.deals reçoit le titre complet, édition comprise (et sans accents, puisqu\'il translittère son index) ; PCGamingWiki reçoit le jeu lui-même : sans suffixe d\'édition (Standard, Deluxe, Premium…) et, pour un DLC ou une édition, par son jeu de base, que Microsoft publie comme le groupe de produit partagé par tous les SKU d\'un même jeu. Ce groupe n\'est utilisé que s\'il figure réellement dans le titre : c\'est parfois un nom interne ("Boost" pour Devil May Cry 5 Special Edition) et le chercher serait pire que de ne rien faire. Les vraies sorties distinctes (Definitive, Anniversary, Special, Remastered) sont laissées telles quelles.',
                'La préférence de pays et de langue est stockée dans un cookie de microsoft.com, car la liste de souhaits et les fiches d’application se trouvent sur des sous-domaines différents qui ne partagent pas localStorage ; le reste passe bien par localStorage. Aucune donnée n’est envoyée à un serveur.'
            ]
        },
        it: {
            sortLabel: 'Ordina:', added: 'Aggiunta', name: 'Nome', price: 'Prezzo', discount: 'Sconto',
            onlyDiscount: 'Solo scontati', remember: 'Ricorda',
            copy: '🔗 Copia link', copied: '✔ Copiato', copyPrompt: 'Copia questo link:',
            about: 'ℹ️ Scopri di più', close: 'Chiudi',
            regionLabel: 'Reindirizzamento:', autoLocale: 'Auto (nessun reindirizzamento)',
            applyLabel: '✔ Applica', applyTip: 'Salva le impostazioni internazionali scelte e applica subito il reindirizzamento (ricarica questa pagina, lista dei desideri inclusa, in quella lingua e paese). Con «Auto» non reindirizza.',
            sortTip: 'Ordina la tua lista dei desideri per data di aggiunta, nome, prezzo o percentuale di sconto.',
            dirTip: 'Alterna tra ordine crescente (↑) e decrescente (↓).',
            onlyDiscountTip: 'Nasconde gli elementi non in offerta; mostra solo quelli scontati.',
            rememberTip: 'Salva ordinamento e filtri e li riapplica quando torni alla lista dei desideri.',
            copyTip: 'Copia un link che all’apertura riproduce l’ordinamento e i filtri attuali.',
            regionTip: 'Scegli la lingua e il paese (impostazioni internazionali) verso cui reindirizzare le pagine del Microsoft Store, questa lista dei desideri inclusa. Con «Auto» non reindirizza. Premi «Applica» per salvare e reindirizzare subito.',
            ggTip: 'Cerca il titolo su GG.deals con il filtro DRM del Microsoft Store. Trattandosi di una ricerca per titolo, potrebbe non trovare il gioco esatto.',
            pcgwTip: 'Cerca su PCGamingWiki (compatibilità e correzioni) il gioco vero e proprio: senza il suffisso di edizione e, per DLC e pacchetti, tramite il gioco base. Trattandosi di una ricerca per nome, potrebbe non trovare l\'articolo esatto.',
            aboutTip: 'Vedi tutto quello che fa questo script.',
            aboutTitle: 'Che cosa fa questo script?',
            aboutName: 'Nome:',
            aboutVersion: 'Versione:',
            aboutAuthor: 'Autore:',
            aboutBody: [
                'Questo script migliora il Microsoft Store su tre fronti:',
                '• Reindirizzamento di regione: porta le pagine del Microsoft Store — apps.microsoft.com e la tua lista dei desideri — alla lingua e al paese (impostazioni internazionali) che scegli nel selettore. Con «Auto» non reindirizza.',
                '– Il selettore offre 21 impostazioni internazionali selezionate, solo combinazioni davvero supportate dal negozio.',
                '– Reindirizza in due modi a seconda del sito: su microsoft.com le impostazioni internazionali sono un segmento del percorso (/it-it/) e su apps.microsoft.com sono una query (hl e gl).',
                '– Usa una sostituzione anziché una nuova navigazione, quindi non lascia voci extra nella cronologia e il pulsante Indietro si comporta normalmente.',
                '– Un valore salvato non valido viene cancellato anziché usato, per non entrare in cicli di reindirizzamento.',
                '– «Applica» salva la tua scelta e reindirizza subito, lista dei desideri inclusa.',
                '– Anche lo script stesso parla la lingua delle impostazioni internazionali scelte, così la barra non contraddice la pagina che la circonda.',
                '• Strumenti nella lista dei desideri:',
                '– Ordina: per data di aggiunta, nome, prezzo o sconto, con un pulsante ↑/↓ per crescente o decrescente.',
                '– Solo scontati: mostra unicamente gli elementi in offerta.',
                '– Ricorda: salva ordinamento e filtri e li riapplica al ritorno.',
                '– Copia link: genera un URL che riproduce ordinamento e filtri. Se il browser blocca gli appunti, l’URL viene mostrato in una finestra per copiarlo a mano.',
                '• Nelle schede di prodotto aggiunge pulsanti verso GG.deals (prezzi/offerte) e PCGamingWiki (compatibilità e correzioni).',
                '– Solo per i giochi: il tipo di prodotto viene chiesto al catalogo pubblico di Microsoft, quindi app e abbonamenti non ricevono pulsanti.',
                '– Il nome viene chiesto al catalogo pubblico di Microsoft e conservato in localStorage per non ripetere la chiamata. Serve perché la ricerca usa il nome inglese e non il titolo che vedi: la scheda è tradotta, URL compreso, ed entrambi i siti sono indicizzati in inglese. Se il catalogo non risponde, i pulsanti non vengono messi.',
                '– GG.deals si apre già filtrato sul DRM del Microsoft Store, come fanno gli script di Steam, GOG ed Epic con il proprio, e senza la valutazione minima applicata per impostazione predefinita che nasconde parte delle offerte.',
                '– GG.deals riceve il titolo completo, edizione inclusa (e senza accenti, perché traslittera il suo indice); PCGamingWiki riceve il gioco vero e proprio: senza suffissi di edizione (Standard, Deluxe, Premium…) e, per un DLC o un\'edizione, tramite il gioco base, che Microsoft pubblica come gruppo di prodotto condiviso da tutti gli SKU di uno stesso gioco. Quel gruppo si usa solo se compare davvero nel titolo: a volte è un nome interno ("Boost" per Devil May Cry 5 Special Edition) e cercarlo sarebbe peggio che non fare nulla. Le uscite realmente separate (Definitive, Anniversary, Special, Remastered) restano intatte.',
                'La preferenza di paese e lingua è salvata in un cookie di microsoft.com, perché la lista dei desideri e le schede delle app stanno su sottodomini diversi che non condividono localStorage; il resto passa invece da localStorage. Non viene inviato alcun dato a nessun server.'
            ]
        },
        nl: {
            sortLabel: 'Sorteren:', added: 'Toegevoegd', name: 'Naam', price: 'Prijs', discount: 'Korting',
            onlyDiscount: 'Alleen afgeprijsd', remember: 'Onthouden',
            copy: '🔗 Link kopiëren', copied: '✔ Gekopieerd', copyPrompt: 'Kopieer deze link:',
            about: 'ℹ️ Meer informatie', close: 'Sluiten',
            regionLabel: 'Omleiding:', autoLocale: 'Auto (niet omleiden)',
            applyLabel: '✔ Toepassen', applyTip: 'Slaat de gekozen landinstelling op en past de omleiding nu toe (laadt deze pagina, verlanglijst inbegrepen, opnieuw in die taal en dat land). Met "Auto" wordt er niet omgeleid.',
            sortTip: 'Sorteert je verlanglijst op datum van toevoegen, naam, prijs of kortingspercentage.',
            dirTip: 'Wisselt tussen oplopende (↑) en aflopende (↓) volgorde.',
            onlyDiscountTip: 'Verbergt items die niet in de aanbieding zijn; toont alleen afgeprijsde.',
            rememberTip: 'Slaat je sortering en filters op en past ze opnieuw toe als je terugkeert naar de verlanglijst.',
            copyTip: 'Kopieert een link die bij openen je huidige sortering en filters herstelt.',
            regionTip: 'Kies de taal en het land (landinstelling) waarnaar Microsoft Store-pagina’s worden omgeleid, deze verlanglijst inbegrepen. Met "Auto" wordt er niet omgeleid. Klik op "Toepassen" om op te slaan en meteen om te leiden.',
            ggTip: 'Zoekt de titel op GG.deals met het DRM-filter van de Microsoft Store. Omdat het een titelzoekopdracht is, wordt niet altijd het exacte spel gevonden.',
            pcgwTip: 'Zoekt op PCGamingWiki (compatibiliteit en fixes) naar het spel zelf: zonder het editiesuffix en, bij DLC en pakketten, op het basisspel. Omdat het op naam zoekt, vindt het niet altijd het juiste artikel.',
            aboutTip: 'Bekijk alles wat dit script doet.',
            aboutTitle: 'Wat doet dit script?',
            aboutName: 'Naam:',
            aboutVersion: 'Versie:',
            aboutAuthor: 'Auteur:',
            aboutBody: [
                'Dit script verbetert de Microsoft Store op drie vlakken:',
                '• Regio-omleiding: brengt Microsoft Store-pagina’s — apps.microsoft.com en je verlanglijst — naar de taal en het land (landinstelling) die je in de keuzelijst kiest. Met "Auto" wordt er niet omgeleid.',
                '– De keuzelijst biedt 21 zorgvuldig gekozen landinstellingen, alleen combinaties die de winkel echt ondersteunt.',
                '– Het omleiden gebeurt op twee manieren, afhankelijk van de site: op microsoft.com is de landinstelling een padsegment (/nl-nl/) en op apps.microsoft.com een query (hl en gl).',
                '– Het gebruikt een vervanging in plaats van een nieuwe navigatie, dus er komt geen extra item in de geschiedenis en de Terug-knop gedraagt zich normaal.',
                '– Een ongeldig opgeslagen landinstelling wordt gewist in plaats van gebruikt, zodat een verkeerde waarde geen omleidingslus kan veroorzaken.',
                '– "Toepassen" slaat je keuze op en leidt meteen om, verlanglijst inbegrepen.',
                '– Het script zelf spreekt ook de taal van de gekozen landinstelling, zodat de balk de pagina eromheen niet tegenspreekt.',
                '• Hulpmiddelen op je verlanglijst:',
                '– Sorteren: op datum van toevoegen, naam, prijs of korting, met een ↑/↓-knop voor oplopend of aflopend.',
                '– Alleen afgeprijsd: toont alleen items in de aanbieding.',
                '– Onthouden: slaat je sortering en filters op en past ze bij terugkomst opnieuw toe.',
                '– Link kopiëren: maakt een URL die je sortering en filters herstelt. Blokkeert de browser het klembord, dan wordt de URL in een dialoogvenster getoond om hem met de hand te kopiëren.',
                '• Op productpagina’s voegt het knoppen toe naar GG.deals (prijzen/aanbiedingen) en PCGamingWiki (compatibiliteit en fixes).',
                '– Alleen bij games: het producttype wordt opgevraagd bij de openbare catalogus van Microsoft, dus apps en abonnementen krijgen geen knoppen.',
                '– De naam wordt opgevraagd bij de openbare catalogus van Microsoft en in localStorage bewaard om de aanroep niet te herhalen. Dat is nodig omdat er op de Engelse naam wordt gezocht en niet op de titel die je ziet: de pagina is vertaald, de URL inbegrepen, en beide sites zijn in het Engels geïndexeerd. Antwoordt de catalogus niet, dan worden er geen knoppen geplaatst.',
                '– GG.deals opent al gefilterd op het DRM van de Microsoft Store, net zoals de scripts voor Steam, GOG en Epic dat met het hunne doen, en zonder de standaard minimale winkelbeoordeling die een deel van de aanbiedingen verbergt.',
                '– GG.deals krijgt de volledige titel, editie inbegrepen (en zonder accenten, omdat het zijn index translitereert); PCGamingWiki krijgt het spel zelf: zonder verpakkingssuffixen (Standard, Deluxe, Premium…) en, bij een DLC of editie, via het basisspel, dat Microsoft publiceert als de productgroep die alle SKU\'s van één spel delen. Die groep wordt alleen gebruikt als hij echt in de titel voorkomt: soms is het een interne naam ("Boost" bij Devil May Cry 5 Special Edition) en daarop zoeken zou slechter zijn dan niets doen. Echt losse uitgaven (Definitive, Anniversary, Special, Remastered) blijven ongemoeid.',
                'De land-/taalvoorkeur wordt bewaard in een cookie van microsoft.com, omdat de verlanglijst en de app-pagina’s op verschillende subdomeinen staan die localStorage niet delen; de rest gaat wel naar localStorage. Er worden geen gegevens naar een server gestuurd.'
            ]
        },
        pt: {
            sortLabel: 'Ordenar:', added: 'Adicionado', name: 'Nome', price: 'Preço', discount: 'Desconto',
            onlyDiscount: 'Apenas com desconto', remember: 'Memorizar',
            copy: '🔗 Copiar ligação', copied: '✔ Copiado', copyPrompt: 'Copie esta ligação:',
            about: 'ℹ️ Saber mais', close: 'Fechar',
            regionLabel: 'Redirecionamento:', autoLocale: 'Automático (não redirecionar)',
            applyLabel: '✔ Aplicar', applyTip: 'Guarda a região escolhida e aplica o redirecionamento agora (recarrega esta página, incluindo a lista de desejos, nesse idioma e país). Com "Automático" não redireciona.',
            sortTip: 'Ordena a sua lista de desejos por data de adição, nome, preço ou percentagem de desconto.',
            dirTip: 'Alterna entre ordem ascendente (↑) e descendente (↓).',
            onlyDiscountTip: 'Oculta os itens que não estão em promoção; mostra apenas os que têm desconto.',
            rememberTip: 'Guarda a sua ordenação e filtros e volta a aplicá-los quando regressar à lista de desejos.',
            copyTip: 'Copia uma ligação que reproduz a sua ordenação e filtros atuais ao ser aberta.',
            regionTip: 'Escolha o idioma e o país (região) para onde redirecionar as páginas da Microsoft Store, incluindo esta lista de desejos. Com "Automático" não redireciona. Prima "Aplicar" para guardar e redirecionar já.',
            ggTip: 'Procura o título no GG.deals com o filtro de DRM da Microsoft Store. Sendo uma pesquisa por título, pode não encontrar o jogo exato.',
            pcgwTip: 'Procura no PCGamingWiki (compatibilidade e correções) o próprio jogo: sem o sufixo de edição e, em DLC e pacotes, pelo jogo base. Sendo uma pesquisa por nome, pode não encontrar o artigo exato.',
            aboutTip: 'Ver tudo o que este script faz.',
            aboutTitle: 'O que faz este script?',
            aboutName: 'Nome:',
            aboutVersion: 'Versão:',
            aboutAuthor: 'Autor:',
            aboutBody: [
                'Este script melhora a Microsoft Store em três frentes:',
                '• Redirecionamento de região: leva as páginas da Microsoft Store — apps.microsoft.com e a sua lista de desejos — para o idioma e país (região) que escolher no seletor. Com "Automático" não redireciona.',
                '– O seletor oferece 21 regiões escolhidas a dedo, apenas combinações que a loja suporta mesmo.',
                '– Redireciona de duas formas conforme o site: em microsoft.com a região é um segmento do caminho (/pt-pt/) e em apps.microsoft.com é uma consulta (hl e gl).',
                '– Usa uma substituição em vez de uma navegação nova, por isso não deixa entradas extra no histórico e o botão Retroceder comporta-se normalmente.',
                '– Uma região guardada inválida é apagada em vez de usada, para não entrar em ciclos de redirecionamento.',
                '– "Aplicar" guarda a sua escolha e redireciona de imediato, lista de desejos incluída.',
                '– O próprio script fala também o idioma da região que escolher, para que a barra não contradiga a página que a rodeia.',
                '• Ferramentas na sua lista de desejos:',
                '– Ordenar: por data de adição, nome, preço ou desconto, com um botão ↑/↓ para ascendente ou descendente.',
                '– Apenas com desconto: mostra só os itens em promoção.',
                '– Memorizar: guarda a sua ordenação e filtros e volta a aplicá-los ao regressar.',
                '– Copiar ligação: gera um URL que reproduz a sua ordenação e filtros. Se o navegador bloquear a área de transferência, mostra o URL numa caixa de diálogo para o copiar à mão.',
                '• Nas fichas de produto acrescenta botões para o GG.deals (preços/promoções) e o PCGamingWiki (compatibilidade e correções).',
                '– Apenas em jogos: o tipo de produto é pedido ao catálogo público da Microsoft, por isso as apps e as subscrições não recebem botões.',
                '– O nome é pedido ao catálogo público da Microsoft e guardado em localStorage para não repetir a consulta. É necessário porque a pesquisa usa o nome em inglês e não o título que vê: a ficha está traduzida, incluindo o URL, e ambos os sites estão indexados em inglês. Se o catálogo não responder, não são colocados botões.',
                '– O GG.deals abre já filtrado pelo DRM da Microsoft Store, tal como os scripts da Steam, GOG e Epic fazem com o seu, e sem a classificação mínima aplicada por omissão que esconde parte das ofertas.',
                '– O GG.deals recebe o título completo, com a edição (e sem acentos, porque translitera o seu índice); o PCGamingWiki recebe o próprio jogo: sem sufixos de embalagem (Standard, Deluxe, Premium…) e, num DLC ou numa edição, pelo jogo base, que a Microsoft publica como o grupo de produto partilhado por todos os SKU de um mesmo jogo. Esse grupo só é usado se realmente aparecer dentro do título: às vezes é um nome interno ("Boost" em Devil May Cry 5 Special Edition) e procurar isso seria pior do que não mexer em nada. Os que são mesmo lançamentos à parte (Definitive, Anniversary, Special, Remastered) ficam como estão.',
                'A preferência de país e idioma é guardada num cookie de microsoft.com, porque a lista de desejos e as fichas de aplicação estão em subdomínios diferentes que não partilham localStorage; o resto vai mesmo para localStorage. Não são enviados dados para nenhum servidor.'
            ]
        },
        pl: {
            sortLabel: 'Sortuj:', added: 'Dodano', name: 'Nazwa', price: 'Cena', discount: 'Zniżka',
            onlyDiscount: 'Tylko przecenione', remember: 'Zapamiętaj',
            copy: '🔗 Kopiuj link', copied: '✔ Skopiowano', copyPrompt: 'Skopiuj ten link:',
            about: 'ℹ️ Dowiedz się więcej', close: 'Zamknij',
            regionLabel: 'Przekierowanie:', autoLocale: 'Auto (bez przekierowania)',
            applyLabel: '✔ Zastosuj', applyTip: 'Zapisuje wybrane ustawienia regionalne i stosuje przekierowanie od razu (przeładowuje tę stronę, wraz z listą życzeń, w tym języku i kraju). Przy „Auto” nie przekierowuje.',
            sortTip: 'Sortuje twoją listę życzeń według daty dodania, nazwy, ceny lub procentu zniżki.',
            dirTip: 'Przełącza między porządkiem rosnącym (↑) a malejącym (↓).',
            onlyDiscountTip: 'Ukrywa pozycje, które nie są w promocji; pokazuje tylko przecenione.',
            rememberTip: 'Zapisuje twoje sortowanie i filtry i stosuje je po powrocie na listę życzeń.',
            copyTip: 'Kopiuje link, który po otwarciu odtwarza bieżące sortowanie i filtry.',
            regionTip: 'Wybierz język i kraj (ustawienia regionalne), do których mają być przekierowywane strony Microsoft Store, wraz z tą listą życzeń. Przy „Auto” nie przekierowuje. Kliknij „Zastosuj”, aby zapisać i przekierować od razu.',
            ggTip: 'Wyszukuje tytuł w GG.deals z filtrem DRM Microsoft Store. Ponieważ to wyszukiwanie po tytule, może nie trafić w dokładną grę.',
            pcgwTip: 'Szuka w PCGamingWiki (zgodność i poprawki) samej gry: bez dopisku edycji, a w przypadku DLC i pakietów — po grze podstawowej. Ponieważ to wyszukiwanie po nazwie, może nie trafić w dokładny artykuł.',
            aboutTip: 'Zobacz wszystko, co robi ten skrypt.',
            aboutTitle: 'Co robi ten skrypt?',
            aboutName: 'Nazwa:',
            aboutVersion: 'Wersja:',
            aboutAuthor: 'Autor:',
            aboutBody: [
                'Ten skrypt ulepsza Microsoft Store na trzy sposoby:',
                '• Przekierowanie regionu: przenosi strony Microsoft Store — apps.microsoft.com i twoją listę życzeń — do języka i kraju (ustawień regionalnych) wybranych w liście. Przy „Auto” nie przekierowuje.',
                '– Lista oferuje 21 wyselekcjonowanych ustawień regionalnych, wyłącznie kombinacje, które sklep naprawdę obsługuje.',
                '– Przekierowuje na dwa sposoby zależnie od witryny: na microsoft.com ustawienia regionalne to segment ścieżki (/pl-pl/), a na apps.microsoft.com parametr zapytania (hl i gl).',
                '– Używa zamiany zamiast nowej nawigacji, więc nie zostawia dodatkowego wpisu w historii, a przycisk Wstecz działa normalnie.',
                '– Nieprawidłowa zapisana wartość jest kasowana zamiast używana, żeby zły wpis nie wywołał pętli przekierowań.',
                '– „Zastosuj” zapisuje twój wybór i przekierowuje natychmiast, wraz z listą życzeń.',
                '– Sam skrypt również mówi w języku wybranych ustawień regionalnych, żeby pasek nie zaprzeczał otaczającej go stronie.',
                '• Narzędzia na liście życzeń:',
                '– Sortuj: według daty dodania, nazwy, ceny lub zniżki, z przyciskiem ↑/↓ dla porządku rosnącego lub malejącego.',
                '– Tylko przecenione: pokazuje wyłącznie pozycje w promocji.',
                '– Zapamiętaj: zapisuje twoje sortowanie i filtry i stosuje je po powrocie.',
                '– Kopiuj link: tworzy adres URL odtwarzający twoje sortowanie i filtry. Jeśli przeglądarka zablokuje schowek, adres pojawi się w oknie dialogowym do ręcznego skopiowania.',
                '• Na stronach produktów dodaje przyciski do GG.deals (ceny/promocje) i PCGamingWiki (zgodność i poprawki).',
                '– Tylko przy grach: rodzaj produktu jest sprawdzany w publicznym katalogu Microsoftu, więc aplikacje i subskrypcje nie dostają przycisków.',
                '– Nazwa jest pobierana z publicznego katalogu Microsoftu i przechowywana w localStorage, żeby nie powtarzać zapytania. Jest potrzebna, bo szuka się po nazwie angielskiej, a nie po tytule, który widzisz: strona jest przetłumaczona, łącznie z adresem, a oba serwisy są zindeksowane po angielsku. Jeśli katalog nie odpowie, przyciski nie zostaną dodane.',
                '– GG.deals otwiera się już przefiltrowany po DRM Microsoft Store, tak samo jak skrypty Steam, GOG i Epic robią ze swoim, i bez domyślnego progu ocen sklepów, który ukrywa część ofert.',
                '– GG.deals dostaje pełny tytuł wraz z edycją (i bez znaków diakrytycznych, bo transliteruje swój indeks); PCGamingWiki dostaje samą grę: bez dopisków edycji (Standard, Deluxe, Premium…), a przy DLC lub edycji — nazwę gry podstawowej, którą Microsoft publikuje jako grupę produktu wspólną dla wszystkich SKU jednej gry. Ta grupa jest używana tylko wtedy, gdy naprawdę występuje w tytule: bywa nazwą wewnętrzną ("Boost" przy Devil May Cry 5 Special Edition), a szukanie jej byłoby gorsze niż nierobienie niczego. Naprawdę osobne wydania (Definitive, Anniversary, Special, Remastered) zostają nietknięte.',
                'Preferencja kraju i języka jest zapisywana w ciasteczku microsoft.com, ponieważ lista życzeń i strony aplikacji leżą w różnych subdomenach, które nie współdzielą localStorage; reszta trafia właśnie do localStorage. Żadne dane nie są wysyłane na serwer.'
            ]
        },
        ru: {
            sortLabel: 'Сортировка:', added: 'Добавлено', name: 'Название', price: 'Цена', discount: 'Скидка',
            onlyDiscount: 'Только со скидкой', remember: 'Запоминать',
            copy: '🔗 Скопировать ссылку', copied: '✔ Скопировано', copyPrompt: 'Скопируйте эту ссылку:',
            about: 'ℹ️ Подробнее', close: 'Закрыть',
            regionLabel: 'Перенаправление:', autoLocale: 'Авто (не перенаправлять)',
            applyLabel: '✔ Применить', applyTip: 'Сохраняет выбранную языковую версию и применяет перенаправление сейчас (перезагружает эту страницу, включая список желаемого, на этом языке и для этой страны). При «Авто» перенаправления нет.',
            sortTip: 'Сортирует список желаемого по дате добавления, названию, цене или проценту скидки.',
            dirTip: 'Переключает порядок по возрастанию (↑) и по убыванию (↓).',
            onlyDiscountTip: 'Скрывает позиции, которых нет в распродаже; показывает только со скидкой.',
            rememberTip: 'Сохраняет сортировку и фильтры и применяет их при возвращении в список желаемого.',
            copyTip: 'Копирует ссылку, которая при открытии воспроизводит текущие сортировку и фильтры.',
            regionTip: 'Выберите язык и страну, на которые перенаправлять страницы Microsoft Store, включая этот список желаемого. При «Авто» перенаправления нет. Нажмите «Применить», чтобы сохранить и перенаправить сразу.',
            ggTip: 'Ищет название на GG.deals с фильтром DRM Microsoft Store. Это поиск по названию, поэтому нужная игра может не найтись.',
            pcgwTip: 'Ищет в PCGamingWiki (совместимость и исправления) саму игру: без суффикса издания, а для DLC и наборов — по базовой игре. Это поиск по названию, поэтому он может не попасть в нужную статью.',
            aboutTip: 'Посмотреть всё, что делает этот скрипт.',
            aboutTitle: 'Что делает этот скрипт?',
            aboutName: 'Название:',
            aboutVersion: 'Версия:',
            aboutAuthor: 'Автор:',
            aboutBody: [
                'Этот скрипт улучшает Microsoft Store по трём направлениям:',
                '• Перенаправление региона: переводит страницы Microsoft Store — apps.microsoft.com и ваш список желаемого — на язык и страну, выбранные в списке. При «Авто» перенаправления нет.',
                '– В списке 21 отобранная языковая версия — только те сочетания, которые магазин действительно поддерживает.',
                '– Перенаправление работает двумя способами в зависимости от сайта: на microsoft.com язык и страна — это сегмент пути (/ru-ru/), а на apps.microsoft.com — параметры запроса (hl и gl).',
                '– Используется замена, а не новый переход, поэтому лишней записи в истории не остаётся и кнопка «Назад» работает как обычно.',
                '– Некорректное сохранённое значение удаляется, а не используется, чтобы неверная запись не вызвала цикл перенаправлений.',
                '– «Применить» сохраняет ваш выбор и перенаправляет сразу же, вместе со списком желаемого.',
                '– Сам скрипт тоже говорит на языке выбранной версии, чтобы панель не противоречила окружающей странице.',
                '• Инструменты в списке желаемого:',
                '– Сортировка: по дате добавления, названию, цене или скидке, с кнопкой ↑/↓ для возрастания или убывания.',
                '– Только со скидкой: показывает лишь позиции в распродаже.',
                '– Запоминать: сохраняет сортировку и фильтры и применяет их при возвращении.',
                '– Скопировать ссылку: формирует адрес, воспроизводящий вашу сортировку и фильтры. Если браузер блокирует буфер обмена, адрес показывается в диалоге для копирования вручную.',
                '• На страницах товара добавляются кнопки на GG.deals (цены и скидки) и PCGamingWiki (совместимость и исправления).',
                '– Только для игр: тип продукта запрашивается в публичном каталоге Microsoft, поэтому у приложений и подписок кнопок нет.',
                '– Название запрашивается у публичного каталога Microsoft и сохраняется в localStorage, чтобы не повторять запрос. Это нужно потому, что поиск идёт по английскому названию, а не по тому заголовку, который вы видите: страница переведена, включая адрес, а оба сайта проиндексированы на английском. Если каталог не отвечает, кнопки не ставятся.',
                '– GG.deals открывается уже отфильтрованным по DRM Microsoft Store, так же как скрипты для Steam, GOG и Epic делают со своим, и без минимального рейтинга магазинов по умолчанию, который скрывает часть предложений.',
                '– GG.deals получает полное название вместе с изданием (и без диакритики, потому что его индекс транслитерирует); PCGamingWiki получает саму игру: без суффиксов издания (Standard, Deluxe, Premium…), а для DLC или издания — название базовой игры, которое Microsoft публикует как группу продукта, общую для всех SKU одной игры. Эта группа берётся, только если она действительно встречается в названии: иногда это внутреннее имя ("Boost" у Devil May Cry 5 Special Edition), и искать его было бы хуже, чем не трогать ничего. Действительно отдельные издания (Definitive, Anniversary, Special, Remastered) остаются как есть.',
                'Выбор страны и языка хранится в cookie домена microsoft.com, потому что список желаемого и страницы приложений находятся на разных поддоменах, не разделяющих localStorage; всё остальное действительно хранится в localStorage. Никакие данные на сервер не отправляются.'
            ]
        },
        tr: {
            sortLabel: 'Sırala:', added: 'Eklenme', name: 'Ad', price: 'Fiyat', discount: 'İndirim',
            onlyDiscount: 'Yalnızca indirimliler', remember: 'Hatırla',
            copy: '🔗 Bağlantıyı kopyala', copied: '✔ Kopyalandı', copyPrompt: 'Bu bağlantıyı kopyalayın:',
            about: 'ℹ️ Daha fazla bilgi', close: 'Kapat',
            regionLabel: 'Yönlendirme:', autoLocale: 'Otomatik (yönlendirme yok)',
            applyLabel: '✔ Uygula', applyTip: 'Seçilen yerel ayarı kaydeder ve yönlendirmeyi şimdi uygular (istek listesi dâhil bu sayfayı o dil ve ülkede yeniden yükler). "Otomatik" seçiliyken yönlendirme yapmaz.',
            sortTip: 'İstek listenizi eklenme tarihine, ada, fiyata veya indirim yüzdesine göre sıralar.',
            dirTip: 'Artan (↑) ve azalan (↓) sıralama arasında geçiş yapar.',
            onlyDiscountTip: 'İndirimde olmayan öğeleri gizler; yalnızca indirimlileri gösterir.',
            rememberTip: 'Sıralamanızı ve filtrelerinizi kaydeder ve istek listesine döndüğünüzde yeniden uygular.',
            copyTip: 'Açıldığında mevcut sıralamanızı ve filtrelerinizi geri getiren bir bağlantı kopyalar.',
            regionTip: 'Microsoft Store sayfalarının — bu istek listesi dâhil — yönlendirileceği dil ve ülkeyi (yerel ayar) seçin. "Otomatik" seçiliyken yönlendirme yapmaz. Kaydedip hemen yönlendirmek için "Uygula"ya tıklayın.',
            ggTip: 'Başlığı GG.deals üzerinde Microsoft Store DRM filtresiyle arar. Başlığa göre arama olduğu için tam olarak aradığınız oyunu bulamayabilir.',
            pcgwTip: 'PCGamingWiki\'de (uyumluluk ve düzeltmeler) oyunun kendisini arar: sürüm ekini kullanmadan, DLC ve paketlerde ise ana oyunun adıyla. Ada göre arama olduğu için tam makaleyi bulamayabilir.',
            aboutTip: 'Bu betiğin yaptığı her şeyi görün.',
            aboutTitle: 'Bu betik ne yapar?',
            aboutName: 'Ad:',
            aboutVersion: 'Sürüm:',
            aboutAuthor: 'Yazar:',
            aboutBody: [
                'Bu betik Microsoft Store’u üç noktada iyileştirir:',
                '• Bölge yönlendirmesi: Microsoft Store sayfalarını — apps.microsoft.com ve istek listenizi — seçicide seçtiğiniz dil ve ülkeye (yerel ayar) götürür. "Otomatik" seçiliyken yönlendirme yapmaz.',
                '– Seçici, mağazanın gerçekten desteklediği kombinasyonlardan oluşan 21 seçilmiş yerel ayar sunar.',
                '– Siteye göre iki farklı şekilde yönlendirir: microsoft.com’da yerel ayar bir yol parçasıdır (/tr-tr/), apps.microsoft.com’da ise bir sorgudur (hl ve gl).',
                '– Yeni bir gezinme yerine değiştirme kullanır; böylece geçmişte fazladan kayıt bırakmaz ve Geri düğmesi normal davranır.',
                '– Geçersiz kaydedilmiş bir yerel ayar kullanılmak yerine silinir, böylece hatalı bir değer yönlendirme döngüsüne yol açamaz.',
                '– "Uygula" seçiminizi kaydeder ve istek listesi dâhil hemen yönlendirir.',
                '– Betiğin kendisi de seçtiğiniz yerel ayarın dilini konuşur, böylece çubuk çevresindeki sayfayla çelişmez.',
                '• İstek listesi araçları:',
                '– Sırala: eklenme tarihine, ada, fiyata veya indirime göre; artan ya da azalan için ↑/↓ düğmesiyle.',
                '– Yalnızca indirimliler: sadece indirimdeki öğeleri gösterir.',
                '– Hatırla: sıralamanızı ve filtrelerinizi kaydeder ve döndüğünüzde yeniden uygular.',
                '– Bağlantıyı kopyala: sıralamanızı ve filtrelerinizi geri getiren bir adres oluşturur. Tarayıcı panoyu engellerse adresi elle kopyalayabilmeniz için bir iletişim kutusunda gösterir.',
                '• Ürün sayfalarında GG.deals (fiyatlar/fırsatlar) ve PCGamingWiki (uyumluluk ve düzeltmeler) düğmeleri ekler.',
                '– Yalnızca oyunlarda: ürün türü Microsoft’un genel kataloğuna sorulur, bu yüzden uygulamalar ve abonelikler düğme almaz.',
                '– Ad, Microsoft’un genel kataloğundan istenir ve isteği tekrarlamamak için localStorage’da tutulur. Buna gerek vardır çünkü arama gördüğünüz başlıkla değil, İngilizce adla yapılır: sayfa çevrilmiştir, adres dâhil, ve iki site de İngilizce dizinlenmiştir. Katalog yanıt vermezse düğmeler eklenmez.',
                '– GG.deals, Steam, GOG ve Epic betiklerinin kendi DRM’leriyle yaptığı gibi, Microsoft Store DRM’ine göre süzülmüş olarak açılır ve fırsatların bir kısmını gizleyen varsayılan asgari mağaza puanı olmadan gelir.',
                '– GG.deals tam başlığı, sürümüyle birlikte alır (ve aksansız, çünkü dizinini harf çevirisiyle tutar); PCGamingWiki oyunun kendisini alır: paketleme ekleri olmadan (Standard, Deluxe, Premium…) ve bir DLC ya da sürüm söz konusuysa ana oyunun adıyla — Microsoft bunu, aynı oyunun tüm SKU\'larının paylaştığı ürün grubu olarak yayımlar. Bu grup yalnızca gerçekten başlığın içinde geçiyorsa kullanılır: bazen dahili bir addır (Devil May Cry 5 Special Edition için "Boost") ve onu aramak hiçbir şey yapmamaktan kötü olurdu. Gerçekten ayrı çıkışlar (Definitive, Anniversary, Special, Remastered) olduğu gibi bırakılır.',
                'Ülke/dil tercihi bir microsoft.com çerezinde saklanır; çünkü istek listesi ile uygulama sayfaları localStorage’ı paylaşmayan farklı alt alan adlarında bulunur. Gerisi localStorage’a yazılır. Hiçbir sunucuya veri gönderilmez.'
            ]
        },
        ja: {
            sortLabel: '並び替え:', added: '追加日', name: '名前', price: '価格', discount: '割引',
            onlyDiscount: 'セール中のみ', remember: '記憶する',
            copy: '🔗 リンクをコピー', copied: '✔ コピーしました', copyPrompt: 'このリンクをコピーしてください:',
            about: 'ℹ️ 詳細', close: '閉じる',
            regionLabel: 'リダイレクト:', autoLocale: '自動（リダイレクトしない）',
            applyLabel: '✔ 適用', applyTip: '選んだロケールを保存し、リダイレクトをすぐに適用します（ウィッシュリストを含むこのページを、その言語・国で再読み込みします）。「自動」ではリダイレクトしません。',
            sortTip: 'ウィッシュリストを追加日・名前・価格・割引率で並べ替えます。',
            dirTip: '昇順（↑）と降順（↓）を切り替えます。',
            onlyDiscountTip: 'セール中でない項目を隠し、割引中のものだけを表示します。',
            rememberTip: '並び順とフィルターを保存し、ウィッシュリストに戻ったときに再適用します。',
            copyTip: '開くと現在の並び順とフィルターを再現するリンクをコピーします。',
            regionTip: 'Microsoft Store のページ（このウィッシュリストを含む）をリダイレクトする言語・国（ロケール）を選びます。「自動」ではリダイレクトしません。「適用」を押すと保存してすぐにリダイレクトします。',
            ggTip: 'GG.deals で Microsoft Store の DRM フィルターを使ってタイトルを検索します。タイトル検索のため、目的のゲームに正確に一致しない場合があります。',
            pcgwTip: 'PCGamingWiki（互換性と修正）でゲーム本体を検索します。エディション表記は外し、DLC やパックはベースゲーム名で検索します。名前による検索のため、正確な記事に届かないことがあります。',
            aboutTip: 'このスクリプトの機能をすべて見る。',
            aboutTitle: 'このスクリプトは何をしますか？',
            aboutName: '名前:',
            aboutVersion: 'バージョン:',
            aboutAuthor: '作者:',
            aboutBody: [
                'このスクリプトは Microsoft Store を3つの面で改善します:',
                '• 地域リダイレクト: Microsoft Store のページ（apps.microsoft.com とウィッシュリスト）を、選択した言語・国（ロケール）へ移動させます。「自動」ではリダイレクトしません。',
                '– 選択肢はストアが実際に対応している組み合わせだけを厳選した21のロケールです。',
                '– サイトによって2通りの方法でリダイレクトします。microsoft.com ではロケールがパスの一部（/ja-jp/）、apps.microsoft.com ではクエリ（hl と gl）です。',
                '– 新規の遷移ではなく置換を使うため、履歴に余分な項目を残さず、戻るボタンも通常どおり動きます。',
                '– 保存された値が無効な場合は使わずに削除します。誤った値がリダイレクトのループを起こさないためです。',
                '– 「適用」は選択を保存し、ウィッシュリストも含めて直ちにリダイレクトします。',
                '– スクリプト自体も選んだロケールの言語で表示されるので、ツールバーが周囲のページと食い違いません。',
                '• ウィッシュリストのツール:',
                '– 並び替え: 追加日・名前・価格・割引で並べ替え。昇順／降順の ↑/↓ ボタン付き。',
                '– セール中のみ: セール中の項目だけを表示します。',
                '– 記憶する: 並び順とフィルターを保存し、戻ったときに再適用します。',
                '– リンクをコピー: 並び順とフィルターを再現する URL を作ります。ブラウザーがクリップボードを拒否した場合は、手動でコピーできるようダイアログに URL を表示します。',
                '• 製品ページには GG.deals（価格・セール）と PCGamingWiki（互換性と修正）へのボタンを追加します。',
                '– ゲームのみ: 製品の種類は Microsoft の公開カタログに問い合わせるため、アプリやサブスクリプションにはボタンを付けません。',
                '– 名前は Microsoft の公開カタログに問い合わせ、同じ問い合わせを繰り返さないよう localStorage に保存します。表示されているタイトルではなく英語名で検索するため必要です。ページは URL を含めて翻訳されており、リンク先の2サイトはどちらも英語で索引されています。カタログが応答しない場合、ボタンは付けません。',
                '– GG.deals は Microsoft Store の DRM で絞り込んだ状態で開きます。Steam、GOG、Epic 向けのスクリプトがそれぞれの DRM で行っているのと同じで、セールの一部を隠してしまう既定のストア評価の下限も外してあります。',
                '– GG.deals にはエディション込みの完全なタイトルを渡します（索引が翻字されるためアクセント記号は外します）。PCGamingWiki にはゲーム本体を渡します。パッケージ表記（Standard、Deluxe、Premium…）を外し、DLC やエディションの場合はベースゲーム名で検索します。これは Microsoft が同一ゲームの全 SKU で共有する製品グループとして公開している値です。ただしその値がタイトルの中に実際に含まれている場合しか使いません。内部名のことがあり（Devil May Cry 5 Special Edition では「Boost」）、それで検索するのは何もしないより悪いからです。実際に別個の作品（Definitive、Anniversary、Special、Remastered）はそのままにします。',
                '国・言語の設定は microsoft.com の Cookie に保存されます。ウィッシュリストとアプリのページは localStorage を共有しない別のサブドメインにあるためです。それ以外は localStorage に保存されます。サーバーにデータは送信されません。'
            ]
        },
        ko: {
            sortLabel: '정렬:', added: '추가일', name: '이름', price: '가격', discount: '할인',
            onlyDiscount: '할인 중인 항목만', remember: '기억하기',
            copy: '🔗 링크 복사', copied: '✔ 복사됨', copyPrompt: '이 링크를 복사하세요:',
            about: 'ℹ️ 자세히 알아보기', close: '닫기',
            regionLabel: '리디렉션:', autoLocale: '자동(리디렉션 안 함)',
            applyLabel: '✔ 적용', applyTip: '선택한 로캘을 저장하고 지금 리디렉션을 적용합니다(위시리스트를 포함한 이 페이지를 해당 언어와 국가로 다시 불러옵니다). "자동"에서는 리디렉션하지 않습니다.',
            sortTip: '위시리스트를 추가일, 이름, 가격 또는 할인율로 정렬합니다.',
            dirTip: '오름차순(↑)과 내림차순(↓)을 전환합니다.',
            onlyDiscountTip: '할인 중이 아닌 항목을 숨기고 할인 중인 항목만 표시합니다.',
            rememberTip: '정렬과 필터를 저장하고 위시리스트로 돌아올 때 다시 적용합니다.',
            copyTip: '열면 현재 정렬과 필터를 그대로 재현하는 링크를 복사합니다.',
            regionTip: 'Microsoft Store 페이지(이 위시리스트 포함)를 리디렉션할 언어와 국가(로캘)를 고르세요. "자동"에서는 리디렉션하지 않습니다. "적용"을 누르면 저장하고 바로 리디렉션합니다.',
            ggTip: 'GG.deals에서 Microsoft Store DRM 필터로 제목을 검색합니다. 제목 검색이므로 정확한 게임을 찾지 못할 수 있습니다.',
            pcgwTip: 'PCGamingWiki(호환성 및 수정)에서 게임 자체를 검색합니다. 에디션 접미사는 빼고, DLC와 패키지는 기본 게임 이름으로 검색합니다. 이름 검색이라 정확한 문서를 찾지 못할 수 있습니다.',
            aboutTip: '이 스크립트가 하는 모든 것을 확인하세요.',
            aboutTitle: '이 스크립트는 무엇을 하나요?',
            aboutName: '이름:',
            aboutVersion: '버전:',
            aboutAuthor: '작성자:',
            aboutBody: [
                '이 스크립트는 Microsoft Store를 세 가지 방향에서 개선합니다:',
                '• 지역 리디렉션: Microsoft Store 페이지(apps.microsoft.com과 위시리스트)를 선택기에서 고른 언어와 국가(로캘)로 보냅니다. "자동"에서는 리디렉션하지 않습니다.',
                '– 선택기에는 상점이 실제로 지원하는 조합만 골라 담은 21개 로캘이 있습니다.',
                '– 사이트에 따라 두 가지 방식으로 리디렉션합니다. microsoft.com에서는 로캘이 경로의 한 부분(/ko-kr/)이고, apps.microsoft.com에서는 쿼리(hl과 gl)입니다.',
                '– 새 이동 대신 치환을 사용하므로 기록에 항목이 더 남지 않고 뒤로 가기 버튼도 평소처럼 동작합니다.',
                '– 저장된 값이 유효하지 않으면 사용하지 않고 지웁니다. 잘못된 값이 리디렉션 반복을 일으키지 않도록 하기 위해서입니다.',
                '– "적용"은 선택을 저장하고 위시리스트를 포함해 즉시 리디렉션합니다.',
                '– 스크립트 자체도 선택한 로캘의 언어로 표시되므로, 도구 모음이 주변 페이지와 어긋나지 않습니다.',
                '• 위시리스트 도구:',
                '– 정렬: 추가일, 이름, 가격 또는 할인 기준으로 정렬하며 오름차순·내림차순 ↑/↓ 버튼이 있습니다.',
                '– 할인 중인 항목만: 할인 중인 항목만 보여줍니다.',
                '– 기억하기: 정렬과 필터를 저장하고 돌아왔을 때 다시 적용합니다.',
                '– 링크 복사: 정렬과 필터를 재현하는 URL을 만듭니다. 브라우저가 클립보드를 막으면 직접 복사할 수 있도록 대화 상자에 URL을 표시합니다.',
                '• 제품 페이지에는 GG.deals(가격·할인)와 PCGamingWiki(호환성 및 수정) 버튼을 추가합니다.',
                '– 게임에만: 제품 종류를 Microsoft 공개 카탈로그에 확인하므로 앱과 구독에는 버튼이 붙지 않습니다.',
                '– 이름은 Microsoft 공개 카탈로그에 요청하고 같은 요청을 반복하지 않도록 localStorage에 보관합니다. 보이는 제목이 아니라 영어 이름으로 검색하기 때문에 필요합니다. 페이지는 주소까지 번역되어 있고, 두 사이트 모두 영어로 색인되어 있습니다. 카탈로그가 응답하지 않으면 버튼을 넣지 않습니다.',
                '– GG.deals는 Microsoft Store DRM으로 이미 필터링된 상태로 열립니다. Steam, GOG, Epic용 스크립트가 각자의 DRM으로 하는 것과 같으며, 할인 일부를 가리는 기본 최소 상점 평점도 빼두었습니다.',
                '– GG.deals에는 에디션을 포함한 전체 제목을 넘깁니다(색인을 음역하므로 발음 부호는 제거). PCGamingWiki에는 게임 자체를 넘깁니다. 패키지 접미사(Standard, Deluxe, Premium…)를 빼고, DLC나 에디션이면 기본 게임 이름으로 검색합니다. 이 이름은 Microsoft가 같은 게임의 모든 SKU가 공유하는 제품 그룹으로 공개하는 값입니다. 다만 그 값이 제목 안에 실제로 들어 있을 때만 씁니다. 내부 이름일 때가 있어서(Devil May Cry 5 Special Edition은 "Boost") 그걸로 검색하면 아무것도 안 하느니만 못하기 때문입니다. 정말 별개의 출시작(Definitive, Anniversary, Special, Remastered)은 그대로 둡니다.',
                '국가·언어 설정은 microsoft.com 쿠키에 저장됩니다. 위시리스트와 앱 페이지가 localStorage를 공유하지 않는 서로 다른 하위 도메인에 있기 때문입니다. 나머지는 localStorage에 저장됩니다. 어떤 서버로도 데이터를 보내지 않습니다.'
            ]
        },
        zh: {
            sortLabel: '排序：', added: '加入时间', name: '名称', price: '价格', discount: '折扣',
            onlyDiscount: '仅显示打折', remember: '记住设置',
            copy: '🔗 复制链接', copied: '✔ 已复制', copyPrompt: '复制此链接：',
            about: 'ℹ️ 了解更多', close: '关闭',
            regionLabel: '重定向：', autoLocale: '自动（不重定向）',
            applyLabel: '✔ 应用', applyTip: '保存所选的区域设置并立即应用重定向（用该语言和国家/地区重新加载本页，包括愿望单）。选择“自动”则不重定向。',
            sortTip: '按加入时间、名称、价格或折扣百分比对愿望单排序。',
            dirTip: '在升序（↑）与降序（↓）之间切换。',
            onlyDiscountTip: '隐藏未打折的项目，仅显示有折扣的。',
            rememberTip: '保存你的排序和筛选条件，回到愿望单时重新应用。',
            copyTip: '复制一个链接，打开后即可还原你当前的排序和筛选条件。',
            regionTip: '选择要将 Microsoft Store 页面（含本愿望单）重定向到的语言和国家/地区（区域设置）。选择“自动”则不重定向。点击“应用”即可保存并立即重定向。',
            ggTip: '在 GG.deals 上按 Microsoft Store DRM 筛选搜索该标题。由于是按标题搜索，可能无法精确匹配到该游戏。',
            pcgwTip: '在 PCGamingWiki（兼容性与修复）上搜索游戏本体：去掉版本后缀，DLC 和捆绑包则按其本体游戏搜索。由于是按名称搜索，可能无法精确对应到该条目。',
            aboutTip: '查看此脚本的全部功能。',
            aboutTitle: '这个脚本有什么用？',
            aboutName: '名称：',
            aboutVersion: '版本：',
            aboutAuthor: '作者：',
            aboutBody: [
                '本脚本从三个方面改进 Microsoft Store：',
                '• 区域重定向：把 Microsoft Store 的页面（apps.microsoft.com 和你的愿望单）带到你在选择器中选定的语言和国家/地区（区域设置）。选择“自动”则不重定向。',
                '– 选择器提供 21 个精选区域设置，都是商店确实支持的组合。',
                '– 会根据站点用两种方式重定向：在 microsoft.com 上区域设置是路径的一段（/zh-cn/），在 apps.microsoft.com 上则是查询参数（hl 和 gl）。',
                '– 采用替换而不是新的跳转，因此不会在历史记录中多留一条，后退按钮行为也正常。',
                '– 保存的区域设置若无效会被清除而不是使用，以免错误的值导致重定向死循环。',
                '– “应用”会保存你的选择并立即重定向，愿望单也一并生效。',
                '– 脚本本身也会使用你所选区域设置的语言，这样工具栏就不会与周围的页面相互矛盾。',
                '• 愿望单工具：',
                '– 排序：按加入时间、名称、价格或折扣排序，并有 ↑/↓ 按钮切换升序或降序。',
                '– 仅显示打折：只显示正在促销的项目。',
                '– 记住设置：保存你的排序和筛选条件，返回时重新应用。',
                '– 复制链接：生成一个可还原排序和筛选条件的网址。如果浏览器阻止访问剪贴板，会用对话框显示网址供手动复制。',
                '• 在商品页面添加通往 GG.deals（价格与优惠）和 PCGamingWiki（兼容性与修复）的按钮。',
                '– 仅限游戏：产品类型会向 Microsoft 的公开目录查询，因此应用和订阅不会添加按钮。',
                '– 名称向 Microsoft 的公开目录查询，并保存在 localStorage 中以免重复请求。之所以需要，是因为搜索用的是英文名而不是你看到的标题：页面（连同网址）都是翻译过的，而这两个网站都以英文建立索引。如果目录没有响应，就不添加按钮。',
                '– GG.deals 打开时已按 Microsoft Store 的 DRM 筛选，与 Steam、GOG 和 Epic 脚本对各自 DRM 的做法一致，并且去掉了默认的商店评分下限——那个下限会藏起一部分优惠。',
                '– GG.deals 收到含版本在内的完整标题（并去掉重音符号，因为它的索引会转写）；PCGamingWiki 收到游戏本体：去掉打包后缀（Standard、Deluxe、Premium…），若是 DLC 或版本则按其本体游戏搜索——这个名称由 Microsoft 作为同一款游戏所有 SKU 共享的产品分组发布。只有当该名称确实出现在标题里时才使用：它有时是内部代号（Devil May Cry 5 Special Edition 是 "Boost"），拿它去搜比什么都不做还糟。真正独立发行的版本（Definitive、Anniversary、Special、Remastered）保持原样。',
                '国家/语言的偏好保存在 microsoft.com 的 Cookie 中，因为愿望单和应用详情页位于不共享 localStorage 的不同子域；其余设置则保存在 localStorage。不会向任何服务器发送数据。'
            ]
        }
    };

    // Familias donde la variante cambia el texto. Lo no previsto se reduce a la
    // base ('fr-CA' -> 'fr', 'es-MX' -> 'es'), que es justo lo que hace falta:
    // la lista de LOCALES tiene 21 combinaciones idioma-país sobre 13 idiomas.
    const LANG_ALIASES = {
        'zh-hans': 'zh', 'zh-cn': 'zh', 'zh-sg': 'zh', 'zh-chs': 'zh',
        'zh-hant': 'zh', 'zh-tw': 'zh', 'zh-hk': 'zh', 'zh-cht': 'zh'
    };

    // Reduce un código BCP-47 a una clave de I18N, de más específico a menos.
    // '' si no hay nada, para que la cascada pase al siguiente paso.
    function normalizeLang(raw) {
        const code = (raw || '').trim().toLowerCase().replace(/_/g, '-');
        if (!code) return '';
        const parts = code.split('-');
        for (let n = parts.length; n >= 1; n--) {
            const candidate = parts.slice(0, n).join('-');
            if (LANG_ALIASES[candidate]) return LANG_ALIASES[candidate];
            if (I18N[candidate]) return candidate;
        }
        return '';
    }

    // Lee la cookie de preferencia de locale SIN validarla. La versión validada
    // (readLocalePref) vive más abajo, junto a LOCALES, pero el idioma hay que
    // resolverlo antes que nada, así que aquí se lee en crudo para no depender
    // del orden de definición. Si cambia LOCALE_COOKIE, cambiar también este
    // literal (hay un recordatorio en su declaración).
    function savedLocaleRaw() {
        try {
            const m = document.cookie.match(/(?:^|;\s*)mswl-locale=([^;]+)/);
            return m ? decodeURIComponent(m[1]) : '';
        } catch (e) { return ''; }
    }

    // Cascada, de la señal más fiel a la menos:
    //   1) el locale guardado en el selector del propio script: es una elección
    //      explícita y deliberada del usuario, por encima de todo lo demás.
    //   2) <html lang>: lo que Microsoft sirvió realmente. Verificado que sigue
    //      al locale (apps.microsoft.com?hl=de-de -> "de-DE", /ja-jp/ -> "ja").
    //   3) el segmento de locale de la ruta, por si el lang faltara.
    //   4) navigator.languages.
    //   5) inglés.
    function detectLang() {
        const fromPref = normalizeLang(savedLocaleRaw());
        if (fromPref) return fromPref;
        const fromDoc = normalizeLang(document.documentElement.getAttribute('lang'));
        if (fromDoc) return fromDoc;
        const seg = (location.pathname.match(/\/([a-z]{2}-[a-z]{2})\//i) || [])[1];
        const fromPath = normalizeLang(seg);
        if (fromPath) return fromPath;
        for (const l of [navigator.language, ...(navigator.languages || [])]) {
            const n = normalizeLang(l);
            if (n) return n;
        }
        return 'en';
    }

    // Merge sobre `en`: una clave que falte en un idioma cae al inglés en vez de
    // quedar en undefined. Así se pueden añadir idiomas incompletos sin romper nada.
    const LANG = detectLang();
    const t = { ...I18N.en, ...(I18N[LANG] || {}) };

    // Lista curada de LOCALES válidos (combinación idioma-país). Un solo selector:
    // así solo se ofrecen combinaciones que Microsoft Store realmente soporta. El
    // código vacío ('') significa "Auto": no forzar redirección.
    // Solo los códigos. La etiqueta visible ya NO se escribe a mano: antes cada
    // entrada llevaba su nombre en español y en inglés, y con 13 idiomas eso
    // habrían sido 21 × 13 = 273 cadenas escritas y mantenidas a mano, para algo
    // que el navegador ya sabe hacer. Ahora la arma localeLabel() con
    // Intl.DisplayNames, que traduce nombre de idioma y de país al idioma activo.
    // El código vacío ('') significa "Auto": no forzar redirección.
    const LOCALES = [
        '', 'es-MX', 'es-ES', 'es-AR', 'es-CO', 'es-CL',
        'en-US', 'en-GB', 'en-CA', 'en-AU',
        'pt-BR', 'fr-FR', 'fr-CA', 'de-DE', 'it-IT',
        'ja-JP', 'ko-KR', 'zh-CN', 'ru-RU', 'pl-PL', 'nl-NL', 'tr-TR'
    ];

    // "Español – México (es-MX)" en español, "Spanisch – Mexiko (es-MX)" en
    // alemán, "スペイン語 – メキシコ (es-MX)" en japonés… todo desde el propio
    // navegador. Intl.DisplayNames existe en todos los navegadores donde corre
    // Tampermonkey hoy, pero si faltara o fallara para un código concreto, el
    // catch deja el código crudo, que sigue siendo elegible y legible.
    function localeLabel(code) {
        if (!code) return t.autoLocale;
        try {
            const [lg, rg] = code.split('-');
            const langName = new Intl.DisplayNames([LANG], { type: 'language' }).of(lg);
            const regionName = new Intl.DisplayNames([LANG], { type: 'region' }).of(rg);
            // Varios idiomas escriben el nombre de la lengua en minúscula
            // (español, français…); en un desplegable queda mejor capitalizado.
            const pretty = langName.charAt(0).toLocaleUpperCase(LANG) + langName.slice(1);
            return `${pretty} – ${regionName} (${code})`;
        } catch (e) {
            return code;
        }
    }

    // =============================================
    // PALETA
    // =============================================
    // El azul de acción de Microsoft Store y su tono de hover: es el color de
    // "Comprar ahora" y de "Compartir" en las fichas. Antes estos botones iban con
    // el verde de Xbox, heredado del script gemelo, que en esta tienda no pinta
    // nada: aquí el verde no aparece en ninguna parte de la interfaz.
    const MS_BLUE = '#0067b8';
    const MS_BLUE_DARK = '#005a9e';
    // Superficies claras, que es lo que usa la tienda en toda su interfaz. La caja
    // oscura del tooltip y del panel "Saber más" se veía como algo pegado encima de
    // la página, no como parte de ella.
    const MS_SURFACE = '#ffffff';
    const MS_TEXT = '#1b1b1b';
    const MS_BORDER = '#e1dfdd';   // gris de separación de Fluent

    // =============================================
    // LOCALE REDIRECT (apps.microsoft.com + wishlist en www.microsoft.com)
    // =============================================

    // Segmento de locale en la ruta de www.microsoft.com (ej. /es-mx/store/...).
    const LOCALE_PATH_REGEX = /\/([a-z]{2}-[a-z]{2})\//i;
    // Preferencia de locale. Cookie con domain=.microsoft.com para que se comparta
    // entre el wishlist (www.microsoft.com) y las páginas de app (apps.microsoft.com),
    // subdominios distintos que NO comparten localStorage. La cookie sí cruza.
    // OJO: este nombre está duplicado como literal en savedLocaleRaw(), que se
    // define arriba para resolver el idioma antes que nada. Si cambia aquí,
    // cambiarlo también allí.
    const LOCALE_COOKIE = 'mswl-locale';

    // ¿Es un locale válido de la lista curada? Evita valores viejos/parciales
    // (p. ej. "en-" guardado por versiones anteriores) que provocaban
    // redirecciones inválidas en bucle.
    function isValidLocale(code) {
        return !!code && LOCALES.some((l) => l && l.toLowerCase() === code.toLowerCase());
    }
    // Lee el locale guardado (ej. "es-MX"); '' = Auto (no redirigir). Sanea
    // valores inválidos borrándolos, para no entrar en bucles de redirección.
    function readLocalePref() {
        try {
            const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + LOCALE_COOKIE + '=([^;]+)'));
            const v = m ? decodeURIComponent(m[1]) : '';
            if (v && !isValidLocale(v)) { saveLocalePref(''); return ''; }
            return v;
        } catch (e) { return ''; }
    }
    // Guarda el locale elegido ('' = Auto). Cookie a 1 año.
    function saveLocalePref(code) {
        try {
            document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(code || '')}; domain=.microsoft.com; path=/; max-age=${60 * 60 * 24 * 365}`;
        } catch (e) { console.error('(mswl): saveLocalePref error:', e); }
    }

    // Locale destino canónico (ej. "es-MX") o '' si Auto/sin preferencia.
    function desiredLocale() { return readLocalePref(); }

    // Construye la URL destino aplicando el locale según el host:
    //  - www.microsoft.com: segmento de ruta en minúsculas (/es-mx/).
    //  - apps.microsoft.com: query hl (es-mx) + gl (MX).
    // Devuelve null si no hay que redirigir (Auto, inválido o ya correcto).
    function buildLocaleUrl(code) {
        if (!isValidLocale(code)) return null;
        const country = (code.split('-')[1] || '').toUpperCase();
        if (location.hostname === 'www.microsoft.com') {
            const cur = window.location.href;
            const m = cur.match(LOCALE_PATH_REGEX);
            if (!m) return null;
            if (m[1].toLowerCase() === code.toLowerCase()) return null;
            return cur.replace(LOCALE_PATH_REGEX, `/${code.toLowerCase()}/`);
        }
        // apps.microsoft.com (u otros): query hl/gl.
        const url = new URL(window.location.href);
        const curHl = (url.searchParams.get('hl') || '').toLowerCase();
        const curGl = (url.searchParams.get('gl') || '').toUpperCase();
        if (curHl === code.toLowerCase() && (!country || curGl === country)) return null;
        url.searchParams.set('hl', code.toLowerCase());
        if (country) url.searchParams.set('gl', country);
        return url.toString();
    }

    /**
     * Si hay preferencia explícita y el locale actual difiere, redirige (sin
     * historial). Con Auto ('') no fuerza nada. Aplica en apps.microsoft.com y en
     * la lista de deseos de www.microsoft.com.
     */
    function redirectIfNeeded() {
        const target = buildLocaleUrl(desiredLocale());
        if (target && target !== window.location.href) window.location.replace(target);
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
    const SCRIPT_VERSION = '2.7.0'; // sincronizar con @version
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
                    remember: parsed.remember !== false
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
            onlyDiscount: p.get('wldisc') === '1'
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
        const m = txt.replace(/\s/g, '').match(/[\d.]+/);
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
            #${TOOLBAR_ID} .mswl-share { background: ${MS_BLUE}; color: #fff; border: none; }
            #${TOOLBAR_ID} .mswl-share:hover, #${TOOLBAR_ID} .mswl-apply:hover { background: ${MS_BLUE_DARK}; }
            #${TOOLBAR_ID} .mswl-region { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }
            #${TOOLBAR_ID} .mswl-apply { background: ${MS_BLUE}; color: #fff; border: none; font-weight: 600; }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // --- Modal "Saber más" (autocontenido) --------------------------------------
    // Tres bandas: cabecera fija (título + ficha), cuerpo scrollable y botón fijo,
    // como el modal de información de los scripts de Twitch y Kick. Antes scrolleaba
    // la caja ENTERA, y con un cuerpo de 19 párrafos eso se llevaba el título fuera
    // de vista y dejaba el botón de cerrar al final del scroll: se abría un panel sin
    // encabezado del que no era evidente cómo salir.
    const ABOUT_ID = 'mswl-about-overlay';
    const ABOUT_NAME = 'Microsoft Store Locale Redirect';
    const ABOUT_REPO = 'g31w0fw0rld/microsoft-store-locale-redirect';

    // El separador de las etiquetas ("Nombre:" / "Nom :" / "名称：") se toma de una
    // ya traducida, para que "GitHub" y "Ko-fi" —que no se traducen— no contradigan
    // la puntuación del idioma activo.
    function aboutColon() {
        const m = String(t.aboutVersion || ':').match(/\s*[:：]\s*$/);
        return m ? m[0] : ':';
    }

    // Marca inerte el resto de la página mientras el modal está abierto, y guarda lo
    // que hubiera para devolverlo tal cual al cerrar. Sin esto el tabulador se pasea
    // por la tienda que hay detrás del overlay, que no se ve pero sigue ahí.
    function aboutSetInert(overlay, on) {
        if (on) {
            const saved = [];
            Array.from(document.body.children).forEach((el) => {
                if (el === overlay) return;
                saved.push({ el, ariaHidden: el.getAttribute('aria-hidden') });
                try { el.setAttribute('aria-hidden', 'true'); el.inert = true; } catch (e) { /* noop */ }
            });
            overlay._savedInert = saved;
        } else {
            (overlay._savedInert || []).forEach((s) => {
                try {
                    if (s.ariaHidden === null) s.el.removeAttribute('aria-hidden');
                    else s.el.setAttribute('aria-hidden', s.ariaHidden);
                    s.el.inert = false;
                } catch (e) { /* noop */ }
            });
            overlay._savedInert = null;
        }
    }

    // Una fila del cuerpo. Los marcadores del texto ('•' grupo, '–' subpunto) son
    // ESTRUCTURA, no texto: se consumen y se traducen a jerarquía visual. La sangría
    // es francesa (padding + text-indent negativo) para que al partirse la línea la
    // segunda no vuelva al margen y el marcador siga marcando columna.
    function aboutRow(raw, prevKind) {
        const text = String(raw).replace(/^\s+/, '');
        const row = document.createElement('div');
        let kind = 'plain';
        if (text.startsWith('•')) {
            kind = 'group';
            row.textContent = text.slice(1).trim();
            Object.assign(row.style, {
                color: MS_BLUE, fontWeight: '600', marginBottom: '8px',
                marginTop: prevKind ? '18px' : '0'
            });
        } else if (text.startsWith('–')) {
            kind = 'item';
            row.textContent = text;
            Object.assign(row.style, {
                paddingInlineStart: '30px', textIndent: '-16px', marginBottom: '7px', color: '#4a4a4a'
            });
        } else {
            row.textContent = text;
            row.style.marginBottom = '10px';
            // Un párrafo suelto detrás de una lista es la coda del bloque, no otro
            // punto de la lista: sin este respiro se lee pegado al último subpunto.
            if (prevKind && prevKind !== 'plain') row.style.marginTop = '16px';
        }
        return { row, kind };
    }

    function showAboutModal() {
        if (document.getElementById(ABOUT_ID)) return;
        const overlay = document.createElement('div');
        overlay.id = ABOUT_ID;
        Object.assign(overlay.style, {
            position: 'fixed', inset: '0', width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            // El padding reserva el hueco contra el que se acota la caja (maxHeight
            // al 100%), y de paso evita que quede pegada a los bordes de la ventana.
            padding: '24px', boxSizing: 'border-box',
            background: 'rgba(0,0,0,0.6)', zIndex: '2147483647',
            transition: 'opacity 180ms ease', opacity: '0'
        });
        const box = document.createElement('div');
        Object.assign(box.style, {
            // Panel claro, como el resto de la tienda: el fondo oscuro de antes se
            // leía como una ventana ajena encima de la página. Pero blanco sobre una
            // lista de deseos blanca necesita contorno propio: el gris de separación
            // de Fluent no se ve contra la página, así que borde neutro más marcado
            // y sombra más profunda.
            background: MS_SURFACE, color: MS_TEXT, borderRadius: '14px',
            padding: '26px 30px', minWidth: 'min(340px, 100%)', maxWidth: '560px',
            maxHeight: '100%', boxSizing: 'border-box',
            boxShadow: '0 12px 40px rgba(0,0,0,0.32)', border: '1px solid #c8c6c4',
            fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '14px', lineHeight: '1.55',
            // Flex en columna con overflow oculto: scrollea solo la banda del medio.
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            transform: 'translateY(8px) scale(0.98)', opacity: '0',
            transition: 'transform 180ms ease, opacity 180ms ease'
        });

        const hairline = () => {
            const hr = document.createElement('div');
            Object.assign(hr.style, {
                height: '1px', background: MS_BORDER, margin: '14px 0', flexShrink: '0'
            });
            return hr;
        };

        // --- Cabecera fija: título y ficha ---
        const head = document.createElement('div');
        head.style.flexShrink = '0';

        const title = document.createElement('div');
        title.textContent = t.aboutTitle;
        title.style.cssText = `font-weight:bold;font-size:17px;margin-bottom:12px;color:${MS_BLUE};`;
        head.appendChild(title);

        // Ficha en rejilla de dos columnas: así los cinco valores quedan alineados
        // en vez de escalonados según lo que mida cada etiqueta.
        const meta = document.createElement('div');
        Object.assign(meta.style, {
            display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)',
            columnGap: '10px', rowGap: '5px', fontSize: '13px'
        });
        const colon = aboutColon();
        [
            { label: t.aboutName, value: ABOUT_NAME },
            { label: t.aboutVersion, value: SCRIPT_VERSION },
            { label: t.aboutAuthor, value: 'g31w0fw0rld' },
            { label: 'GitHub' + colon, value: 'github.com/' + ABOUT_REPO, isLink: true },
            { label: '☕ Ko-fi' + colon, value: 'ko-fi.com/g31w0fw0rld', isLink: true }
        ].forEach((r) => {
            const label = document.createElement('div');
            label.textContent = r.label;
            Object.assign(label.style, { fontWeight: '600', color: '#5b5b5b', whiteSpace: 'nowrap' });
            meta.appendChild(label);
            const val = document.createElement('div');
            // Sin esto la URL no parte y estira la caja más allá de su maxWidth.
            Object.assign(val.style, { minWidth: '0', overflowWrap: 'anywhere' });
            if (r.isLink) {
                const a = document.createElement('a');
                a.href = 'https://' + r.value;
                a.textContent = r.value;
                a.target = '_blank'; a.rel = 'noopener noreferrer';
                a.style.color = MS_BLUE;
                a.style.textDecoration = 'underline';
                val.appendChild(a);
            } else {
                val.textContent = r.value;
            }
            meta.appendChild(val);
        });
        head.appendChild(meta);
        head.appendChild(hairline());
        box.appendChild(head);

        // --- Cuerpo scrollable ---
        const body = document.createElement('div');
        Object.assign(body.style, {
            overflowY: 'auto', minHeight: '0', paddingInlineEnd: '4px'
        });
        // `prevKind` arranca en null a propósito: marca "no hay nada encima", que es
        // lo que distingue al primer párrafo (pegado a la línea divisoria de la
        // cabecera, sin margen extra) de los demás.
        let prevKind = null;
        (t.aboutBody || []).forEach((p) => {
            const { row, kind } = aboutRow(p, prevKind);
            body.appendChild(row);
            prevKind = kind;
        });
        box.appendChild(body);
        box.appendChild(hairline());

        // --- Botón fijo ---
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = t.close;
        closeBtn.style.cssText = `flex-shrink:0;align-self:center;padding:8px 18px;background:${MS_BLUE};color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;`;
        closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = MS_BLUE_DARK; });
        closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = MS_BLUE; });
        box.appendChild(closeBtn);

        // El listener de Escape vive en document —el modal no tiene por qué tener el
        // foco dentro cuando llega la tecla—, así que hay que quitarlo SIEMPRE al
        // cerrar, también desde el botón: si no, se acumula uno por cada apertura.
        const closeIt = () => {
            document.removeEventListener('keydown', onKey);
            overlay.removeEventListener('click', onClick);
            overlay.style.opacity = '0'; box.style.opacity = '0';
            box.style.transform = 'translateY(8px) scale(0.98)';
            setTimeout(() => {
                aboutSetInert(overlay, false);
                overlay.remove();
            }, 180);
        };
        const onKey = (e) => { if (e.key === 'Escape') closeIt(); };
        // Solo el fondo: un clic dentro de la caja no debe cerrar.
        const onClick = (e) => { if (e.target === overlay) closeIt(); };
        closeBtn.addEventListener('click', closeIt);
        overlay.addEventListener('click', onClick);
        document.addEventListener('keydown', onKey);

        overlay.appendChild(box);
        document.body.appendChild(overlay);
        aboutSetInert(overlay, true);
        setTimeout(() => {
            overlay.style.opacity = '1';
            box.style.transform = 'translateY(0) scale(1)';
            box.style.opacity = '1';
        }, 10);
        // Sin esto el foco se queda en el ℹ️ de la barra, que aboutSetInert acaba de
        // marcar inert, y se cae a <body>.
        setTimeout(() => { try { closeBtn.focus(); } catch (e) { /* noop */ } }, 120);
    }

    // Construye un <select> a partir de la lista curada de códigos, con las
    // etiquetas ya traducidas al idioma activo por localeLabel().
    function buildLocaleSelect(current) {
        const sel = document.createElement('select');
        LOCALES.forEach((code) => {
            const o = document.createElement('option');
            o.value = code;
            o.textContent = localeLabel(code);
            if (code.toLowerCase() === (current || '').toLowerCase()) o.selected = true;
            sel.appendChild(o);
        });
        return sel;
    }

    // =========================================================================
    // TOOLTIP PROPIO
    // =========================================================================
    // La tienda no tiene tooltip que reutilizar: el único del HTML es el del header
    // universal de Microsoft, y su CSS vive dentro de ese header. La ficha sí trae
    // un <wa-tooltip> (el de las categorías), pero es un componente de su librería y
    // vive dentro de su shadow root, así que tampoco se puede tomar prestado desde
    // fuera —y la lista de deseos, que es donde va esta barra, no tiene ninguno—.
    // Al revés que en
    // Steam, GOG, Humble o Epic, aquí no hay nada de la tienda con lo que dibujar el
    // aviso. Pero esta barra ya es UI de este script, así que una caja propia no
    // imita a nadie: es una pieza más suya.
    //
    // Fondo oscuro fijo en vez de heredado: la tienda cambia de tema según el sistema
    // y una caja que herede colores acabaría ilegible en uno de los dos.
    const TIP_ID = 'mswl-tip';
    const TIP_STYLES_ID = 'mswl-tip-styles';
    const TIP_DELAY_MS = 250;
    const TIP_GAP = 8;      // hueco entre la caja y el control
    const TIP_MARGIN = 8;   // margen que se respeta al borde de la ventana

    let tipEl = null;
    let tipAnchor = null;
    let tipTimer = null;
    let tipWindowBound = false;

    function injectTipStyles() {
        if (document.getElementById(TIP_STYLES_ID)) return;
        const style = document.createElement('style');
        style.id = TIP_STYLES_ID;
        style.textContent = `
            #${TIP_ID} {
                position: fixed;
                /* Alto, pero por debajo del modal de "Saber más" (2147483647), que sí
                   debe taparlo. */
                z-index: 2147483000;
                max-width: 300px;
                padding: 8px 10px;
                background: ${MS_SURFACE}; color: ${MS_TEXT};
                /* Borde gris de Fluent y no azul: el azul es color de acción en esta
                   tienda (botones), y un aviso que no se puede pulsar no debe
                   vestirse como si sí. La sombra es la que lo despega del fondo. */
                border: 1px solid ${MS_BORDER};
                border-radius: 6px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.18);
                font-size: 12px; line-height: 1.35;
                /* Varios avisos pasan de cien caracteres: sin esto salen en una línea
                   infinita fuera de la pantalla. */
                white-space: normal;
                /* La caja no puede robarle el hover al control ni taparle el clic. */
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.12s ease;
            }
            #${TIP_ID}.mswl-tip-visible { opacity: 1; }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function ensureTipNode() {
        injectTipStyles();
        if (tipEl && tipEl.isConnected) return tipEl;
        tipEl = document.createElement('div');
        tipEl.id = TIP_ID;
        tipEl.setAttribute('role', 'tooltip');
        document.body.appendChild(tipEl);
        return tipEl;
    }

    /** Encima del control y centrada; debajo si arriba no cabe. */
    function positionTip(anchor) {
        const box = tipEl.getBoundingClientRect();
        const a = anchor.getBoundingClientRect();
        const vw = document.documentElement.clientWidth;
        const vh = document.documentElement.clientHeight;

        let top = a.top - box.height - TIP_GAP;
        if (top < TIP_MARGIN) top = Math.min(a.bottom + TIP_GAP, vh - box.height - TIP_MARGIN);
        let left = a.left + a.width / 2 - box.width / 2;
        left = Math.max(TIP_MARGIN, Math.min(left, vw - box.width - TIP_MARGIN));

        tipEl.style.top = `${top}px`;
        tipEl.style.left = `${left}px`;
    }

    function showTip(anchor, text) {
        if (!anchor.isConnected) return;  // la SPA se llevó el control durante la espera
        ensureTipNode();
        tipEl.textContent = text;
        // El `title` se retira mientras la caja está arriba: si no, saldrían los dos,
        // uno encima del otro. Vuelve al cerrarla, así que sigue siendo el respaldo
        // (y el nombre accesible del control) el resto del tiempo.
        anchor.removeAttribute('title');
        tipAnchor = anchor;
        positionTip(anchor);
        tipEl.classList.add('mswl-tip-visible');
    }

    function hideTip() {
        clearTimeout(tipTimer);
        tipTimer = null;
        if (tipAnchor) {
            if (!tipAnchor.title && tipAnchor.dataset.mswlTip) tipAnchor.title = tipAnchor.dataset.mswlTip;
            tipAnchor = null;
        }
        if (tipEl) tipEl.classList.remove('mswl-tip-visible');
    }

    /**
     * Cuelga el tooltip propio de un control, por hover y por foco. El foco va con
     * focusin/focusout, que burbujean: varios controles son un <label> y quien recibe
     * el foco es la casilla o el <select> de dentro, así que con focus/blur el aviso
     * no saldría nunca por teclado.
     * @param {HTMLElement} el - El control, con su `title` ya puesto.
     * @param {string} text - El mismo texto del title.
     */
    function attachTip(el, text) {
        if (!text) return;
        el.dataset.mswlTip = text;   // de dónde se devuelve el title al cerrar
        const open = () => {
            clearTimeout(tipTimer);
            tipTimer = setTimeout(() => showTip(el, text), TIP_DELAY_MS);
        };
        el.addEventListener('mouseenter', open);
        el.addEventListener('focusin', open);
        el.addEventListener('mouseleave', hideTip);
        el.addEventListener('focusout', hideTip);
        // Con la página en movimiento la caja quedaría flotando fuera de sitio. Una
        // sola vez y no por control: la barra tiene nueve.
        if (!tipWindowBound) {
            tipWindowBound = true;
            window.addEventListener('scroll', hideTip, { passive: true, capture: true });
            window.addEventListener('resize', hideTip, { passive: true });
        }
    }

    function buildToolbar() {
        injectStyles();
        const bar = document.createElement('div');
        bar.id = TOOLBAR_ID;

        const sortLabel = document.createElement('label');
        sortLabel.title = t.sortTip;
        attachTip(sortLabel, t.sortTip);
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
        dirBtn.title = t.dirTip;
        attachTip(dirBtn, t.dirTip);
        dirBtn.textContent = settings.dir === 'desc' ? '↓' : '↑';
        dirBtn.addEventListener('click', () => {
            settings.dir = settings.dir === 'desc' ? 'asc' : 'desc';
            dirBtn.textContent = settings.dir === 'desc' ? '↓' : '↑';
            persistIfRemember(); apply();
        });

        const discLabel = document.createElement('label');
        discLabel.title = t.onlyDiscountTip;
        attachTip(discLabel, t.onlyDiscountTip);
        const discChk = document.createElement('input');
        discChk.type = 'checkbox';
        discChk.checked = !!settings.onlyDiscount;
        discChk.addEventListener('change', () => { settings.onlyDiscount = discChk.checked; persistIfRemember(); apply(); });
        discLabel.appendChild(discChk);
        discLabel.appendChild(document.createTextNode(t.onlyDiscount));

        const remLabel = document.createElement('label');
        remLabel.title = t.rememberTip;
        attachTip(remLabel, t.rememberTip);
        const remChk = document.createElement('input');
        remChk.type = 'checkbox';
        remChk.checked = settings.remember !== false;
        remChk.addEventListener('change', () => { settings.remember = remChk.checked; saveSettings(); });
        remLabel.appendChild(remChk);
        remLabel.appendChild(document.createTextNode(t.remember));

        const shareBtn = document.createElement('button');
        shareBtn.type = 'button';
        shareBtn.className = 'mswl-share';
        shareBtn.title = t.copyTip;
        attachTip(shareBtn, t.copyTip);
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

        // Selector único de redirección (locale = idioma-país), guardado en cookie
        // de .microsoft.com. Cada opción explica la combinación en su label.
        const localeSel = buildLocaleSelect(readLocalePref());
        const regionText = document.createElement('span');
        regionText.textContent = t.regionLabel;
        regionText.title = t.regionTip;
        attachTip(regionText, t.regionTip);
        regionText.style.fontWeight = '600';

        const localeWrap = document.createElement('label');
        localeWrap.title = t.regionTip;
        attachTip(localeWrap, t.regionTip);
        localeWrap.appendChild(localeSel);

        // Botón "Aplicar": guarda el locale elegido y redirige la página actual
        // (incluida la lista de deseos) al instante. Con "Auto" solo recarga.
        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.className = 'mswl-apply';
        applyBtn.textContent = t.applyLabel;
        applyBtn.title = t.applyTip;
        attachTip(applyBtn, t.applyTip);
        applyBtn.addEventListener('click', () => {
            const code = localeSel.value;
            saveLocalePref(code);
            const target = buildLocaleUrl(code);
            if (target && target !== window.location.href) window.location.assign(target);
            else window.location.reload();
        });

        // Grupo de región: "Redirección: [locale ▾] [Aplicar]" viaja junto.
        const regionGroup = document.createElement('span');
        regionGroup.className = 'mswl-region';
        regionGroup.appendChild(regionText);
        regionGroup.appendChild(localeWrap);
        regionGroup.appendChild(applyBtn);

        // Botón "Saber más"
        const aboutBtn = document.createElement('button');
        aboutBtn.type = 'button';
        aboutBtn.className = 'mswl-about';
        aboutBtn.title = t.aboutTip;
        attachTip(aboutBtn, t.aboutTip);
        aboutBtn.textContent = t.about;
        aboutBtn.addEventListener('click', showAboutModal);

        bar.appendChild(sortLabel);
        bar.appendChild(dirBtn);
        bar.appendChild(discLabel);
        bar.appendChild(remLabel);
        bar.appendChild(shareBtn);
        bar.appendChild(regionGroup);
        bar.appendChild(aboutBtn);
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
    // FICHA DE APP (apps.microsoft.com/detail/*)
    // =============================================
    // Los mismos dos botones que ya llevan Steam, GOG, Epic, IndieGala y el gemelo
    // de Xbox. Todo lo que vende esta tienda es de PC, así que no hace falta el
    // filtro de plataforma que sí lleva Xbox: lo único que se comprueba es que el
    // producto sea un juego.
    //
    // La diferencia gorda con el resto de la familia es que la ficha es una app de
    // web components y monta su contenido DENTRO DE UN SHADOW ROOT. Eso cambia tres
    // cosas, y las tres están resueltas más abajo: buscar el ancla hay que hacerlo
    // entrando en los shadow roots (deepQuery), el CSS hay que inyectarlo en ese
    // mismo root —el shadow DOM no hereda estilos del <head>— y el MutationObserver
    // hay que ponerlo sobre el root, porque uno sobre el <body> no ve nada de lo que
    // ocurre ahí dentro.
    //
    // Id de producto (Big ID de 12 caracteres) del final de la ruta. Es el mismo
    // identificador que usa xbox.com, así que sirve para el catálogo de Microsoft.
    const PRODUCT_ID_REGEX = /\/detail\/([A-Za-z0-9]{12})(?:\/|$|\?)/;
    // Puntos de anclaje, en orden de preferencia. El primero es la columna del
    // botón de compra/obtener: los enlaces caen justo debajo, como en el resto de
    // la familia. Los otros dos son respaldo por si la ficha no monta esa columna.
    // Salen de los propios bundles de la tienda (product-details.styles), no de
    // adivinar: son clases suyas y no hashes de compilación.
    const LINK_ANCHOR_SELECTORS = ['.buy-box-container', 'buy-box', '.app-info-container'];
    // El botón de acción de la tienda ("Compartir", "Obtener", "Comprar"), que sirve
    // de patrón de tamaño: los enlaces se miden con él en vez de llevar un ancho
    // escrito a mano, que con 13 idiomas —y etiquetas de largos muy distintos— no
    // acertaría en ninguno. Es un <wa-button> de su librería de componentes.
    const STORE_BTN_SELECTOR = 'wa-button, button';

    // Tipos de producto que NO reciben botones: app y suscripción no son producto
    // de juego, así que ahí un botón de precios o de compatibilidad no es que falle
    // la búsqueda, es que no viene a cuento. Es lista de exclusión y no de
    // inclusión a propósito: un kind desconocido pasa, que ante la duda es mejor
    // ponerlo. DLC y ediciones sí lo reciben, como en el resto de la familia.
    const NON_GAME_KINDS = /^(?:application|pass)$/i;
    // PCGamingWiki documenta el juego, no el empaquetado: ni los DLC ni las ediciones
    // tienen artículo propio. El nombre del juego está en el mismo JSON que el
    // título, en `Properties.ProductGroupName` —el "grupo de producto" que Microsoft
    // comparte entre todos los SKU de un mismo juego—:
    //   9NMJD11KCRL0  Cyberpunk 2077: Phantom Liberty         -> Cyberpunk 2077
    //   9P9G5WX8C0VH  Cyberpunk 2077: Ultimate Edition (…)    -> Cyberpunk 2077
    //   9NKX70BBCDRN  Forza Horizon 5 Standard Edition        -> Forza Horizon 5
    //
    // PERO el campo NO siempre trae un nombre público: a veces es un nombre interno
    // del editor. Comprobado en el mismo catálogo:
    //   9MZ11KT5KLP6  Devil May Cry 5 Special Edition         -> "Boost"
    //   9NBLGGH4R2R6  Minecraft Education                     -> "Minecraft Bedrock PG"
    // Mandar eso a PCGamingWiki es peor que no tocar nada, así que solo se acepta el
    // grupo si además ESTÁ CONTENIDO en el título del producto, que es justo lo que
    // distingue "Forza Horizon 5" de "Boost". Si no pasa el filtro, se busca el
    // título propio, que es lo que se hacía antes.
    const MIN_GROUP_NAME_LENGTH = 3;

    const CATALOG_ENDPOINT = 'https://displaycatalog.mp.microsoft.com/v7.0/products';
    const CATALOG_CACHE_KEY = 'mswl-catalog-cache-v2';
    const CATALOG_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;   // 30 días
    const CATALOG_CACHE_MAX = 200;                        // entradas, para no crecer sin fin
    const CATALOG_TIMEOUT_MS = 8000;

    const LINKS_ID = 'mswl-external-links';
    const LINKS_STYLES_ID = 'mswl-external-styles';
    const LINKS_PRODUCT_ATTR = 'data-mswl-product';
    // GG.deals filtra por DRM con un bitmask numérico en la query: 1 Steam, 8 GOG,
    // 16 sin DRM, 32 otros, 128 Microsoft Store, 1024 Epic. Aquí interesa Microsoft.
    // Va a /deals/ (la lista de ofertas), que es la que acepta el filtro de DRM;
    // /games/ lo ignora. Y minRating=0 desactiva el mínimo de valoración de tienda
    // que trae por defecto, que si no esconde parte de las ofertas.
    const GGDEALS_SEARCH_URL = 'https://gg.deals/deals/';
    const GGDEALS_MICROSOFT_DRM = '128';
    const GGDEALS_MIN_RATING = '0';
    const PCGW_SEARCH_URL = 'https://pcgamingwiki.com/w/index.php?search=';
    const GGDEALS_ICON_URL = 'https://gg.deals/favicon.ico';
    const PCGW_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 827 1158" width="13" height="18" aria-hidden="true" style="vertical-align:middle;flex:0 0 auto"><path d="M0 166.2 448.9-1.1 827.4 56.1l0 1023.9 0.1 28.9L452.1 1158.9 0 1008.4z" fill="#365798"/><path d="M25.3 985.5 24.1 190.5 413 46.8 412 1107.6zM478.1 1108.6 478.3 52.3 788.1 94.3l0 975.8z" fill="#a5b6d9"/><path d="M215.5 737 41.5 727 40.3 420.5 215.9 404.1zm16.7-334.5 156.1-19.4-1.2 359.8-155.2-4.8zM39.3 399.9l0-194.4 176-57.4 1.2 232.1zm350.8-317.2 0.9 274.5-158.7 20.4 0-238zm-253 909.7 0-235.1 141.7 9.3 0 268.4zm247 80.8-17.3-6.4c3.8-22.5-18.9-31.9-19.1-5.7l-18.7-5.5c-0.9-22.1-13.9-31.7-21.2-6.8l-9.7-3-0.6-277.7 12.3 0.9c-4.3 27.5 23.5 28.2 20.3 1.7L350.4 772c-4.4 28.6 23.2 28.9 20.4 1.3l12.7 0.8zM42.8 751.1l82.2 5.9-0.5 108-81.9-11.2zm83.1 129.3-0.9 110.4-82.7-20.2 0-102.4zM494.3 70l278.6 36.6 0 950-278.3 35.1z" fill="#365798"/><path d="m279 507.5c-0.1-5.1 0-10 3.2-14.2 6 0.2 4.9 9.7 5 14.3 10.3 5.1 4.9-10.8 10.2-15.3 7.6-0.8-0.6 16 6.9 15.8 4.9-0.1 3.9-2.4 3.8-6.7-0.1-3.9 0.4-7.8 3.8-10.3 8.2 3.1 0.8 18.2 11.2 15.8 0-6.4-1-14.2 5.8-17.6 2.6 5.2-0.1 14.8 5.4 16.1 7.4 1.7 8.4 3.6 10.2 10.5 0.8 3.1-0.4 4.6 2.8 6.4 3.5 2 7.6 1.4 7.7 6.1 0.1 6.4-2.7 5.5-7.6 5.5-1.8 0-2.4 3.4-2.5 4.7-0.4 4.7 0.4 5.7 5 7 5.9 1.7 4.9 3.3 4.9 8.7 0 2.7 0.5 1.2-3.1 1.9-5.7 1.1-7 0.3-6.7 6.8 0.4 7.8 13.4 1.4 9.7 12.6-1.6 4.8-9.5 1.1-9.5 5.3 0 5.3-1.1 7.7 5.4 8.2 6.4 0.5 6 9.1 0.4 11-3.4 1.2-4.6-0.1-5.8 4-1.2 4.1-1.1 8.4-2.6 12.5-6.1 4.5-11.6-1.7-11.6 8.4 0 2.7-0.6 4.7-1.1 7.3-0.9 5-2.2 0.7-5.8 1.8-1-1.2 0-7.9 0-9.5 0-4.7-1.6-5.8-7-5.4-0.3 5.8-0.2 12-4.9 16.2-2.9-1.9-4-4.8-4.2-8.1-0.3-6.5 0.2-6.7-6.5-8.3-1.2 2.9-2 11.4-1.5 14.5-5.2 2.6-6-5.4-6-8.6 0-2.7 1.1-5.7-2.3-6.7-3.4-0.9-4.6 0.8-4.7 3.9-0.2 6.1-0.5 8.8-5.3 12.2-1.9-5.4-0.3-14.7-6.6-16.4-7-1.8-7.9-6.9-8-13.6-0.1-7.3-8.9-0.3-8.9-8.2 0-0.8-0.6-4.9 0-5.5 2.9-2.1 5.8 1.2 8.5 0.1 1.3-3.6 1.8-9-2.1-9.9-4-0.9-7.8-1.4-6.9-6 1.1-5.7 0.1-5.4 6.3-5.8 4.7-0.3 3-5.2 3.1-8.4-6.2-2.9-8.8 0.8-8.8-7.4 0-5.6-0.4-5.1 5.2-5.1 4.8 0 3.4-1.7 3.4-6.3 0-5.1-9.2-0.6-9.6-7.6-0.2-3 1-5.6 3.9-6.7 5.1-2 5.7-2.3 5.9-7.8 0.3-8 5.6-8.9 12-12.1l0 0 0 0zM88.3 368.3l24.3-92.2-15.7 7.5 21.6-79 25.5-7.3-19.1 53.1 19.2-10.3-55.7 128.3 0 0z" fill="#a5b6d9"/><path d="m278.8 317.9c1.2-3.2 2.5-6.5 3.8-9.9 13.8 5.9 26.4 10.2 40.6 1.9 13.7-8 22.8-24.3 28-38.8 10.2-28.4 10.2-66.8-8.3-91.8-22.5-30.5-54.5-14.5-69.8 13.9-4.7 8.8-11.2 31.3-12.1 45.3-0.5 6.9-0.2 14.1 0.8 21.3 1 8.1 5.2 16.5 4.2 24.7-0.3 2.5-1.8 4.1-4.6 4.6-16.7-28-7.6-72.9 4.9-100.6 12.5-27.6 47.9-55.5 75.9-29 25.7 24.2 28.2 68.1 21.3 100.3-6.2 28.8-26 71.4-61.9 68.2-6.4-0.6-19.1-3.8-22.7-10l0 0zM299.3 272c-3.2-11.6 11.5-19.5 14.8-28.4 1.9-5.2-0.1-9.6-2.2-14-4.9-2.6-9-1.1-10.8 4-3.2 8.9-6.5 14.9-12.6 22.1-3.3-13.7-1.4-29.1 6.6-40.9 4.3-6.3 12.9-9.4 19.4-6.9 20.5 7.8 14.2 42.7 5.3 56.4-4.7 7.3-12.7 7.6-20.5 7.6L299.3 272zm3.4-25.8c0.5 0.7 0.5 1.4 0.2 2-9.4 21.3-18.7 42.6-28.2 64-0.9-0.4-1.4-0.4-1.7-0.7-3.3-3.9-5.6-8.5-7.8-13.1-0.9-1.8 0.1-3.6 1.2-5.1l32.8-43.7c0.9-1.3 2-2.6 3.4-3.4l0 0z" fill="#a5b6d8"/><path d="m188.7 921.7c-6.1 11.9-4.4 25.1-6 38-9.7-2.4-16.7-21.7-18.6-30 1.7-9.9 6.9-17.2 12.9-24.9 2.8-3.6 3.7-7.2 1.9-11.4-0.7-1.6-0.6-3.6-2-4.9-8.7 1.5-13.9 8.2-19.9 14-6.7-7-5.2-33.4 0.2-41.1 8.4-1.5 15.8 1 22.6 5.8 5.3-5.2 5.6-10.3 0.9-15.7-3.6-4.1-14.7-8.9-16.7-13.1-1.6-6.3 10.2-27.5 17.3-27.2 7.8 11.5 12.4 24.5 15 38.1 2.7 1.1 5.1 2.1 8.2 1.5 1.6-15.5-1.9-30.3-6.8-44.8 0.5-0.5 0.8-0.9 1-0.9 8.6 0.6 16.8 2.3 23.4 8.6 14.9 14.2-11.5 41.7 0.4 58.4 10.7-10.3 10.5-23.1 18.6-34 8 10.3 15 31 13.7 44.1-6.9 8.3-12.4 13-28.9 14.2 0.5 3.7-1.8 7.2-0.8 11.5 8.8 9.4 18.5 7.9 30.1 7.2 1.6 8.2-6.7 33.6-12.9 39.7-12.6-5.7-19.1-17.9-26.1-29.1-2.5 1.9-4.6 3.7-6.4 6.1 1.7 12.9 18 29.3 15.9 40.7-5.5 2.6-11.4 4.3-17.7 3.4-6.2-0.9-8.7-4.3-10.2-10.9-3.3-14.7 3.2-32.8-9.2-43.3zm118.5 22.1 0-63.8 67.8 10.9 0 67.4zM307.1 804.2 375 811.3 375 878.1 307.1 868.2zm67.7 165.5 0 66.8-67.6-18.6 0-63.6zm-320.5-31.7 0-28.9 13.7 2 16.5-16.6 0.7 67.6-16.3-20.9z" fill="#a5b6d9"/><path d="m89.1 914.4c1.4-0.6 2.3-0.5 3.4-0.2 2.8 6.5 3.9 13.4 3.6 20.5-0.1 2.7-1.1 5.1-1.7 7.6-0.5 1.9-1.8 3-3.4 3.9-1.3-1.3-0.9-2.5-0.6-3.8 0.8-3.7 1.6-7.3 1.7-11.1 0.2-5.8-1.6-11.2-2.9-16.9l0 0 0 0zm7 42.4c-0.3-3.3 0.9-6.2 1.6-9.1 1-4.4 2.5-8.8 3.1-13.2 0.8-5.6-1-11-2.4-16.4-0.7-2.5-1.5-5-2.2-7.5-0.4-1.6-0.7-3.1 0.2-4.5 1.3-0.1 1.8 0.6 2.1 1.3 2.1 4.3 3.6 8.6 4.5 13.3 1 5.5 0.5 10.9 0.9 16.3 0.3 3.5-0.8 6.9-1.3 10.2-0.6 3.8-2.6 7.4-6.6 9.6l0 0zm7.6 10.4c-1.9-3.7-1.4-6.5-0.1-9.8 3.1-8.1 5.9-16.4 5.3-25.2-0.5-7.7-1.8-15.2-4.6-22.4-1.2-3-2.3-6.1-3.3-9 0.8-1.2 1.7-2 3.4-1.6 1.8 4.1 3.9 8.3 5.1 12.8 5 19 5 37.4-5.7 55.3l0 0z" fill="#a5b6d9"/><path d="m598.7 1047.1-70.3 8.4-0.2-378.8 70.5-3.8zM688.5 533.1c-11 50.3-65.8 45.6-78.3 2.8l-92.4 3.1-0.2-67.9 89.4-3.3c22.8-54 64.5-46.2 81.8 0.2l66.2 0.4 1.6 61.8zm-172.4-237.1 0-24 241.7 7.5 0.1 19.4z" fill="#a5b6d9"/><path d="m52.3 827.5 62.6 9.7-19.2-43.4-8.2 15-13.4-29.3-21.8 48.1zM116.4 788c0 4.4-3.5 7.9-7.9 7.9-4.4 0-7.9-3.5-7.9-7.9 0-4.4 3.5-7.9 7.9-7.9 4.4 0 7.9 3.5 7.9 7.9z" fill="#a5b6d9"/><ellipse cx="649.4" cy="501.8" rx="31" ry="51.8" fill="#365798"/><path d="m177.7 627.1c-1.8 3-1.6 6.7 0.4 9.3l-26.3 40 6.6-0.1 25-36.7c3.2 0.6 6.6-0.9 8.5-3.8 2.4-3.9 1.2-9-2.7-11.4-3.9-2.4-9-1.2-11.5 2.7zm-110.8 29.7-9.7 12.9 4.6 4.3 7.9-11 7.1 0.3c0.4 0.7 0.9 1.4 1.5 2 3.3 3.3 8.6 3.3 11.8 0 3.3-3.3 3.3-8.6 0-11.8-3.3-3.3-8.6-3.3-11.8 0-1 1-1.7 2.3-2.1 3.6zm20.1-68.7c-4.4 0-8 3.6-8 8 0 4.4 3.6 8 8 8 3.7 0 6.8-2.5 7.7-6l44.5 1.3 17.4 21.5c-0.2 0.8-0.4 1.6-0.4 2.4 0 4.6 3.8 8.4 8.4 8.4 4.6 0 8.4-3.8 8.4-8.4 0-4.6-3.8-8.4-8.4-8.4-1.5 0-2.9 0.4-4.1 1.1l-18.9-22.9-48-1.3c-1.4-2.2-3.9-3.7-6.8-3.7zm13.5 27c-4.6 0.1-8.3 4-8.1 8.6 0.1 4.6 4 8.3 8.6 8.1 3.3-0.1 6-2.1 7.3-4.9l22.2-0.5c1.4 2.9 4.4 4.8 7.8 4.7 4.6-0.1 8.3-4 8.1-8.6-0.1-4.6-4-8.3-8.6-8.1-3.6 0.1-6.6 2.5-7.7 5.7l-21.5 0.5c-1.2-3.3-4.4-5.7-8.1-5.6zm-26 16.7c0 4.4-3.6 8-8 8-4.4 0-8-3.6-8-8 0-4.4 3.6-8 8-8 4.4 0 8 3.6 8 8zM87.6 476.5c-3.5 0.2-6.4 2.5-7.5 5.6l-22.6 1 0.3 6.2 22.6-1c1.4 3 4.4 5 7.9 4.9 4.6-0.2 8.1-4.1 7.9-8.7-0.2-4.6-4.1-8.2-8.7-8zm56.3 20c-4.6 0.1-8.3 4-8.1 8.6 0.1 4.6 4 8.3 8.6 8.1 3.3-0.1 6-2.1 7.3-4.9l25.3-0.7c1.4 2.9 4.4 4.8 7.8 4.7 4.6-0.1 8.3-4 8.1-8.6-0.1-4.6-4-8.3-8.6-8.1-3.6 0.1-6.6 2.5-7.7 5.7l-24.6 0.7c-1.2-3.3-4.4-5.7-8.1-5.6zm-44.4-30.4-4.1 4.7 19.8 17.1 80.9-3-0.5-6.2-78.3 2.8zm-41.6 51.7-0.2-6 68.2-4 71.4 103.9-5.3 3.3-70.1-101.1zm132.6 25.4c2.3-2.6 2.6-6.3 1.1-9.3l6.6-9.5 0.4-9-11.7 14.4c-3.1-1.1-6.7-0.2-9 2.4-3 3.5-2.7 8.7 0.8 11.7 3.5 3 8.7 2.7 11.8-0.8zm-32.3 0.4c2 2.9 5.5 4.1 8.7 3.3l30.7 44.3-0.1-9.8-25.5-38c1.8-2.8 1.8-6.4-0.2-9.3-2.6-3.8-7.8-4.7-11.6-2-3.8 2.6-4.7 7.8-2.1 11.6zm-34.8-9.6c-3.5 0.2-6.4 2.5-7.5 5.6l-57.2 2.9 0.3 6.2 57.2-2.9c1.4 3 4.4 5 7.9 4.9 4.6-0.2 8.1-4.1 7.9-8.7-0.2-4.6-4.1-8.2-8.7-8zm17.5 33-81.3 2 0.2 6.3 78.7-2 17.5 22.3c-0.2 0.8-0.4 1.6-0.4 2.4 0 4.6 3.8 8.4 8.4 8.4 4.6 0 8.4-3.8 8.4-8.4 0-4.6-3.8-8.4-8.4-8.4-1.5 0-2.9 0.4-4.1 1.1zM179.2 672.5c1.2 2.6 5 0.2 5.7 3.6-1 4.1-8.9 0.5-11.6 0.9-1.4-4.3 8.4-15.3 10.9-18.8 2.8-1.4 9.4 0 12.6 0 0.3 2.8 0.5 5.3-1.5 7.8-3.4 0.1-6.7-1.4-10.1-1.7-2 2.7-4 5.5-6 8.2zM67.3 604.9l-8.1 0 0-6.7c6.2 0 9.7-1.6 13.2 3.9 6.6 10.3 12.8 20.9 19.1 31.4 3.1 5.2 6.3 10.4 9.5 15.5 4.6 7.4 5.8 8 14.6 8.6 6.3 0.4 12.7 0.4 19.1 0.4 6.6 0 6.4-5.5 12.7-4.9 5.4 5.1 5.4 11.7 0 16.8-6 0.4-5.3-5.8-9.8-5.8l-19.2 0c-9.5 0-12.4 2.1-17.3-5.6-11.2-17.9-22.4-35.7-33.6-53.6z" fill="#a5b6d9"/><path d="m339.3 257.1c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9zm14.4-13.7c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9zm23 0c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9zm-12.9 46.6c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9zm14.7-11.5c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9zm7.4-18.3c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9z" transform="matrix(0.59478444,0,0,0.93466127,95.788817,-7.8295466)" fill="#365798"/></svg>';
    const TRADEMARK_REGEX = /[™®©]/g;
    // Coletilla de plataforma que Microsoft cuelga del nombre cuando el mismo juego
    // tiene ficha de PC y de consola. No es parte del título y ninguna de las dos
    // webs de destino la lleva. Dos formas, las dos vistas en el catálogo real:
    // entre paréntesis —"Juego (PC)", que es la de xbox.com— y con guion, que es la
    // que usa esta tienda: el id 9PMF91N3LZ3M devuelve "Roblox - Windows", y buscar
    // eso tal cual en GG.deals o en PCGamingWiki no encuentra nada.
    const PLATFORM_TAG_REGEX = /\s*(?:[([](?:pc|windows(?:\s*1[01])?)[)\]]|[-–—]\s*(?:pc|windows(?:\s*1[01])?))\s*$/i;
    // Sufijos de empaquetado que PCGamingWiki no usa: documenta el juego base y no
    // tiene páginas por edición. "Definitive", "Anniversary", "Remastered" y "Game
    // of the Year" NO se tocan: ahí sí suelen ser lanzamientos con página propia.
    const SKU_EDITION_REGEX = /[\s:–—-]+(?:digital\s+)?(?:standard|deluxe|premium|ultimate|gold|platinum|complete|collector'?s|founder'?s)\s+edition\s*$/i;
    // GG.deals translitera en su índice, así que "Pokémon" se busca como "Pokemon".
    const DIACRITICS_REGEX = /[̀-ͯ]/g;
    function normalizeForGgDeals(title) {
        return title.normalize('NFD').replace(DIACRITICS_REGEX, '');
    }

    /**
     * Nombre del juego al que pertenece la ficha (DLC, edición o SKU suelto), solo
     * si es de fiar: ver el comentario de MIN_GROUP_NAME_LENGTH.
     * @param {{title: string, groupName: string}} info - Datos del catálogo.
     * @returns {string} Nombre del juego, o cadena vacía si no procede usarlo.
     */
    function usableGroupName(info) {
        const group = (info.groupName || '').trim();
        if (group.length < MIN_GROUP_NAME_LENGTH) return '';
        const fold = (s) => s.toLowerCase().replace(TRADEMARK_REGEX, '').replace(/\s+/g, ' ').trim();
        const foldedGroup = fold(group);
        const foldedTitle = fold(info.title || '');
        if (foldedGroup === foldedTitle) return '';          // el propio juego: nada que cambiar
        return foldedTitle.includes(foldedGroup) ? group : '';
    }

    function isProductPage() {
        return location.hostname === 'apps.microsoft.com' && PRODUCT_ID_REGEX.test(location.pathname);
    }
    function getProductId() {
        const m = location.pathname.match(PRODUCT_ID_REGEX);
        return m ? m[1].toUpperCase() : null;
    }

    // --- Catálogo (título en inglés + tipo de producto) -------------------------
    // El título se pide a la API y no se lee del <h1> porque la ficha va traducida
    // —el nombre incluido— y las dos webs de destino están indexadas en inglés.
    // Responde con CORS abierto y sin credenciales.
    function readCatalogCache(id) {
        try {
            const all = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || '{}');
            const hit = all[id];
            if (hit && Date.now() - hit.ts < CATALOG_CACHE_TTL) return hit;
        } catch (e) { /* caché corrupta: se ignora y se vuelve a pedir */ }
        return null;
    }
    function writeCatalogCache(id, info) {
        try {
            let all = {};
            try { all = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || '{}'); } catch (e) { all = {}; }
            all[id] = Object.assign({ ts: Date.now() }, info);
            const keys = Object.keys(all);
            if (keys.length > CATALOG_CACHE_MAX) {
                keys.sort((a, b) => (all[a].ts || 0) - (all[b].ts || 0))
                    .slice(0, keys.length - CATALOG_CACHE_MAX)
                    .forEach((k) => delete all[k]);
            }
            localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(all));
        } catch (e) { console.error('(mswl-links): writeCatalogCache error:', e); }
    }

    // Mercado del locale de la página (?gl=MX -> MX). Se consulta US primero porque
    // es el catálogo más completo, y si el producto no está ahí se reintenta con el
    // del usuario. El idioma se pide siempre en-us: es lo que indexan los destinos.
    function pageMarket() {
        const gl = new URLSearchParams(location.search).get('gl');
        if (gl && /^[A-Za-z]{2}$/.test(gl)) return gl.toUpperCase();
        // Respaldo: el locale guardado en el selector (es-MX -> MX). Se lee en
        // crudo de la cookie porque es lo que hay a mano en los dos subdominios.
        const m = /^[a-z]{2}-([a-z]{2})$/i.exec(savedLocaleRaw());
        return m ? m[1].toUpperCase() : 'US';
    }

    async function fetchWithTimeout(url, timeoutMs) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            return await fetch(url, { credentials: 'omit', signal: ctrl.signal });
        } catch (e) {
            console.warn('(mswl-links): catálogo sin respuesta:', e.name === 'AbortError' ? 'tiempo agotado' : e.message);
            return null;
        } finally { clearTimeout(timer); }
    }

    async function fetchCatalogInfo(id) {
        const cached = readCatalogCache(id);
        if (cached) return { title: cached.title, kind: cached.kind, groupName: cached.groupName || '' };

        const markets = Array.from(new Set(['US', pageMarket()]));
        for (const market of markets) {
            const url = `${CATALOG_ENDPOINT}?bigIds=${encodeURIComponent(id)}`
                + `&market=${encodeURIComponent(market)}&languages=en-us&fieldsTemplate=Details`;
            // Con corte por tiempo: una petición colgada (sin error y sin respuesta)
            // dejaría los botones sin aparecer y sin nada en consola que lo explique.
            const res = await fetchWithTimeout(url, CATALOG_TIMEOUT_MS);
            if (!res || !res.ok) continue;
            const json = await res.json();
            const p = (json.Products || [])[0];
            const title = p && p.LocalizedProperties && p.LocalizedProperties[0]
                ? p.LocalizedProperties[0].ProductTitle : '';
            if (!title) continue;
            const info = {
                title,
                kind: (p.ProductKind || p.ProductType || ''),
                groupName: (p.Properties && p.Properties.ProductGroupName) || ''
            };
            writeCatalogCache(id, info);
            return info;
        }
        return null;
    }

    // --- UI ---------------------------------------------------------------------
    /**
     * Estilos de la fila. Van al MISMO root que el ancla: si los botones acaban
     * dentro de un shadow root, una hoja del <head> no los alcanza —el shadow DOM
     * no hereda estilos de fuera— y saldrían sin pintar. Por eso recibe el root y
     * no lo da por hecho.
     * @param {Document|ShadowRoot} root - Donde vive el ancla.
     */
    function injectLinkStyles(root) {
        const target = (root && root.nodeType === Node.DOCUMENT_FRAGMENT_NODE)
            ? root
            : (document.head || document.documentElement);
        if (target.querySelector(`#${LINKS_STYLES_ID}`)) return;
        const style = document.createElement('style');
        style.id = LINKS_STYLES_ID;
        style.textContent = `
            /* Debajo del botón de la ficha y alineados con él por la izquierda: no se
               estiran a lo ancho de la columna, porque el de la tienda tampoco lo
               hace y quedaban como dos barras que no se parecían a nada de la
               página. */
            #${LINKS_ID} {
                display: flex; flex-direction: row; flex-wrap: wrap;
                justify-content: flex-start; gap: 8px; margin: 12px 0 0 0;
            }
            /* Tamaño calcado del botón de la tienda (ver matchStoreButtonSize): las
               variables las escribe el script tras medirlo, y los valores de aquí
               son el respaldo para cuando no haya podido. min-width y no width para
               que una etiqueta más larga que la suya no se recorte: en la práctica
               las dos caben y quedan del mismo tamaño. */
            #${LINKS_ID} .mswl-btn {
                display: flex; align-items: center; justify-content: center; gap: 8px;
                flex: 0 0 auto; box-sizing: border-box;
                width: max-content;
                min-width: var(--mswl-btn-w, 180px);
                height: var(--mswl-btn-h, auto);
                padding: 10px 16px;
                border-radius: 4px; font-size: 14px; font-weight: 600;
                white-space: nowrap;
                text-decoration: none; cursor: pointer; color: #fff;
                transition: background .15s ease;
            }
            #${LINKS_ID} .mswl-btn:hover { text-decoration: none; color: #fff; }
            #${LINKS_ID} .mswl-ico { width: 16px; height: 16px; object-fit: contain; flex: 0 0 auto; }
            /* Los dos van en azul, no en el verde de GG.deals ni en el gris de
               PCGamingWiki que usan los otros scripts: aquí el color de acción de la
               tienda es el azul, y un botón verde se leía como de otra página. Se
               distinguen por el tono —el de acción y el propio azul de la wiki—,
               por el icono y por la etiqueta. */
            #${LINKS_ID} .mswl-gg   { background: ${MS_BLUE}; }
            #${LINKS_ID} .mswl-gg:hover { background: ${MS_BLUE_DARK}; }
            #${LINKS_ID} .mswl-pcgw { background: #365798; }
            #${LINKS_ID} .mswl-pcgw:hover { background: #2b4578; }
        `;
        target.appendChild(style);
    }

    // opts: { iconUrl } (favicon remoto) o { iconSvg } (SVG inline), más { tooltip }:
    // los dos buscan por nombre y pueden no acertar, así que la etiqueta sola no
    // basta — carga el destino, y el tooltip carga la incertidumbre. El `title` se
    // pone siempre: es el respaldo, y attachTip() lo retira solo mientras dibuja la
    // caja propia (ver la sección TOOLTIP PROPIO).
    function makeLinkButton(cls, label, href, opts) {
        const a = document.createElement('a');
        a.className = `mswl-btn ${cls}`;
        a.href = href;
        a.target = '_blank';
        a.rel = 'nofollow noopener external';
        if (opts && opts.tooltip) {
            a.title = opts.tooltip;
            attachTip(a, opts.tooltip);
        }
        if (opts && opts.iconSvg) {
            const span = document.createElement('span');
            span.className = 'mswl-ico';
            span.style.display = 'inline-flex';
            span.innerHTML = opts.iconSvg;
            a.appendChild(span);
        } else if (opts && opts.iconUrl) {
            const img = document.createElement('img');
            img.className = 'mswl-ico';
            img.src = opts.iconUrl;
            img.alt = '';
            img.addEventListener('error', () => img.remove());
            a.appendChild(img);
        }
        a.appendChild(document.createTextNode(label));
        return a;
    }

    /**
     * querySelector que además entra en los shadow roots abiertos. Hace falta: la
     * ficha monta sus componentes dentro de uno, así que un querySelector normal
     * sobre `document` no ve el bloque de compra ni nada de lo que cuelga de él.
     * Comprobado en la página real, que es lo que lo destapó: los tres selectores
     * daban null durante los 10 s de espera mientras el DevTools —que sí muestra el
     * shadow DOM— enseñaba el elemento tan tranquilo.
     * @param {string} selector - Selector CSS.
     * @param {Document|ShadowRoot} [root] - Dónde empezar; por defecto, el documento.
     * @returns {Element|null} El primero que aparezca, o null.
     */
    function deepQuery(selector, root) {
        const scope = root || document;
        const hit = scope.querySelector(selector);
        if (hit) return hit;
        // Por niveles y no en profundidad: así gana el más cercano a la raíz, que
        // es el del producto que se está viendo.
        for (const host of scope.querySelectorAll('*')) {
            if (!host.shadowRoot) continue;
            const found = deepQuery(selector, host.shadowRoot);
            if (found) return found;
        }
        return null;
    }

    function findLinkAnchor() {
        for (const sel of LINK_ANCHOR_SELECTORS) {
            const el = deepQuery(sel);
            if (el) return el;
        }
        return null;
    }

    /**
     * Copia al contenedor de los enlaces el tamaño del botón de acción de la
     * tienda, para que los dos se vean como uno más de la ficha en vez de como dos
     * barras de ancho completo. Se mide en vez de escribirlo: la etiqueta cambia con
     * el idioma y con el tipo de producto ("Compartir" no ocupa lo que "Comprar
     * ahora"), así que un ancho fijo fallaría en cuanto se cambie de locale.
     *
     * Con ResizeObserver se mantiene al día: el botón de la tienda tarda en
     * renderizar y además cambia de tamaño al estrecharse la ventana. Sin él, la
     * primera medida podría ser la de un botón todavía sin pintar.
     * @param {HTMLElement} box - El contenedor de los dos enlaces.
     * @param {Element} anchor - El bloque de compra, donde vive el botón modelo.
     */
    function matchStoreButtonSize(box, anchor) {
        const model = deepQuery(STORE_BTN_SELECTOR, anchor);
        if (!model) return;   // sin modelo se quedan los valores de respaldo del CSS
        const apply = () => {
            const r = model.getBoundingClientRect();
            // Un botón sin renderizar mide 0: aplicarlo dejaría los enlaces
            // invisibles, así que hasta que no haya medida de verdad no se toca.
            if (r.width < 40 || r.height < 20) return;
            box.style.setProperty('--mswl-btn-w', `${Math.round(r.width)}px`);
            box.style.setProperty('--mswl-btn-h', `${Math.round(r.height)}px`);
        };
        apply();
        if (typeof ResizeObserver === 'function') new ResizeObserver(apply).observe(model);
    }

    // GG.deals sí tiene ficha por edición y por DLC, así que va el título completo.
    // PCGamingWiki documenta el juego base: va sin el sufijo de SKU y, si la ficha
    // es un DLC, con el nombre del juego al que pertenece en vez del suyo.
    function buildProductLinks(id, rawTitle, root, dlcBaseTitle) {
        injectLinkStyles(root);
        const clean = (name) => name
            .replace(TRADEMARK_REGEX, '')
            .replace(/\s+/g, ' ')
            .replace(PLATFORM_TAG_REGEX, '')
            .trim();
        const title = clean(rawTitle);
        const forPcgw = clean(dlcBaseTitle || '') || title;
        const baseTitle = forPcgw.replace(SKU_EDITION_REGEX, '').trim() || forPcgw;
        const box = document.createElement('div');
        box.id = LINKS_ID;
        box.setAttribute(LINKS_PRODUCT_ATTR, id);
        const ggParams = new URLSearchParams({
            drm: GGDEALS_MICROSOFT_DRM,
            minRating: GGDEALS_MIN_RATING,
            title: normalizeForGgDeals(title)
        });
        box.appendChild(makeLinkButton('mswl-gg', 'GG.deals',
            `${GGDEALS_SEARCH_URL}?${ggParams}`, { iconUrl: GGDEALS_ICON_URL, tooltip: t.ggTip }));
        box.appendChild(makeLinkButton('mswl-pcgw', 'PCGamingWiki',
            PCGW_SEARCH_URL + encodeURIComponent(baseTitle), { iconSvg: PCGW_ICON_SVG, tooltip: t.pcgwTip }));
        return box;
    }

    // --- Init -------------------------------------------------------------------
    // Contador de navegación: la tienda es una SPA y route() puede volver a entrar
    // mientras la pasada anterior sigue esperando al DOM o a la API. El token
    // invalida a la vieja en vez de dejar que pinte sobre el producto nuevo.
    let productNav = 0;
    let linksState = null;
    let linksObserver = null;
    let linksDebounce = null;
    // Referencia a la fila insertada. No vale getElementById: si los botones acaban
    // dentro de un shadow root, el documento no los ve y se insertarían dos veces.
    let linksNode = null;
    // Roots ya vigilados (documento y/o shadow root de la ficha). Un
    // MutationObserver sobre el <body> NO se entera de lo que pasa dentro de un
    // shadow root, así que hay que observarlo aparte o los botones no se repondrían
    // cuando el componente se repinte.
    const linksWatched = new WeakSet();

    // No basta con insertar una vez: la ficha es un componente que se vuelve a
    // renderizar (precio, disponibilidad, fin de la animación de entrada) y al
    // hacerlo se lleva por delante lo que él no creó. Por eso hay observer.
    function ensureProductLinks() {
        if (!linksState) return;
        if (linksState.id !== getProductId()) return;   // ya se navegó a otro producto
        if (linksNode && linksNode.isConnected) return;
        const anchor = findLinkAnchor();
        if (!anchor) return;
        // HERMANO del bloque de compra, no hijo suyo: así la fila queda entre ese
        // bloque y la caja de clasificación por edades (ESRB), que es su hermana
        // siguiente. Es la misma banda propia que usa el gemelo de Xbox, y además
        // mete menos mano en el árbol que el componente vuelve a renderizar.
        linksNode = buildProductLinks(linksState.id, linksState.title, anchor.getRootNode(), linksState.baseTitle);
        anchor.after(linksNode);
        matchStoreButtonSize(linksNode, anchor);
        watchLinksRoot(anchor.getRootNode());
    }

    // Al salir de una ficha se olvida el producto y se retiran los botones: el
    // observer sigue vivo el resto de la sesión y si no repondría los de un juego
    // en una página que ya no es la suya.
    function forgetProductLinks() {
        productNav++;
        linksState = null;
        linksNode?.remove();
        linksNode = null;
    }

    /**
     * Vigila un root para reponer los botones cuando el componente se repinte y se
     * los lleve por delante. Se llama con el documento y, si la ficha vive en uno,
     * con su shadow root: son árboles distintos y un observer sobre el <body> no ve
     * lo que ocurre dentro del segundo.
     * @param {Document|ShadowRoot} root
     */
    function watchLinksRoot(root) {
        if (!root || linksWatched.has(root)) return;
        linksWatched.add(root);
        if (!linksObserver) {
            linksObserver = new MutationObserver(() => {
                if (linksDebounce) return;
                linksDebounce = setTimeout(() => { linksDebounce = null; ensureProductLinks(); }, 200);
            });
        }
        const target = (root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) ? root : (document.body || document.documentElement);
        linksObserver.observe(target, { childList: true, subtree: true });
    }

    function startLinksObserver() {
        watchLinksRoot(document);
    }

    function waitForValue(probe, timeoutMs, token) {
        return new Promise((resolve) => {
            const deadline = Date.now() + timeoutMs;
            const tick = () => {
                if (token !== productNav) return resolve(null);
                let v = null;
                try { v = probe(); } catch (e) { v = null; }
                if (v !== null && v !== undefined) return resolve(v);
                if (Date.now() > deadline) return resolve(null);
                setTimeout(tick, 250);
            };
            tick();
        });
    }

    async function initProductLinks() {
        const id = getProductId();
        // Al navegar dentro de la SPA los botones del producto anterior siguen en el
        // DOM apuntando al juego equivocado: se retiran antes de nada.
        if (linksNode && linksNode.getAttribute(LINKS_PRODUCT_ATTR) !== id) {
            linksNode.remove();
            linksNode = null;
        }
        if (!linksState || linksState.id !== id) linksState = null;
        if (!id || (linksNode && linksNode.isConnected)) return;

        const token = ++productNav;

        let info = null;
        try { info = await fetchCatalogInfo(id); }
        catch (e) { console.warn('(mswl-links): catálogo no disponible:', e.message); return; }
        if (token !== productNav) return;
        // Sin datos de catálogo no se ponen botones: sin el nombre en inglés
        // buscarían con el título localizado y caerían en cero resultados.
        if (!info) { console.warn('(mswl-links): sin datos de catálogo, no se añaden botones'); return; }
        // Se dice por consola, no en silencio: "no salen los botones" tiene varias
        // causas posibles y esta es la única que además es correcta.
        if (NON_GAME_KINDS.test(info.kind)) {
            console.log(`(mswl-links): ${info.kind} y no juego, sin botones:`, info.title);
            return;
        }

        const anchor = await waitForValue(findLinkAnchor, 10000, token);
        if (token !== productNav || !anchor) {
            if (!anchor) console.warn('(mswl-links): no encontré dónde colgar los botones', LINK_ANCHOR_SELECTORS);
            return;
        }

        linksState = { id, title: info.title, baseTitle: usableGroupName(info) };
        ensureProductLinks();
        startLinksObserver();
        console.log(`(mswl-links) v${SCRIPT_VERSION}: botones puestos para`, info.title);
    }

    // =============================================
    // INICIALIZACIÓN (por ruta)
    // =============================================
    // Microsoft Store es una SPA: si se navega sin recargar, se reintenta.
    // La redirección se evalúa SIEMPRE (también en la lista de deseos); si ya
    // estamos en el locale correcto no hace nada y se cargan las herramientas.
    function route() {
        try {
            redirectIfNeeded();

            // Fuera de la ficha se suelta el producto anterior; ver forgetProductLinks.
            const product = isProductPage();
            if (!product) forgetProductLinks();

            if (product) initProductLinks();
            else if (isWishlist()) initWishlist();
        } catch (e) {
            console.error('(microsoft-store-locale-redirect): Error:', e);
        }
    }

    (function watchSpaNav() {
        const fire = () => setTimeout(route, 300);
        const p = history.pushState, r = history.replaceState;
        history.pushState = function () { p.apply(this, arguments); fire(); };
        history.replaceState = function () { r.apply(this, arguments); fire(); };
        window.addEventListener('popstate', fire);
    })();

    route();
})();
