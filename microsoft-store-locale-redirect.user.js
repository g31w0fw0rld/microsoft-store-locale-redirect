// ==UserScript==
// @name         Microsoft Store Locale Redirect
// @namespace    https://apps.microsoft.com/
// @version      2.4.1
// @description  Sends Microsoft Store pages to the language and country you pick from 21 curated locales — a path segment on microsoft.com, hl/gl on apps.microsoft.com — keeping the choice in a cookie so both subdomains share it, redirecting without adding history entries, and clearing an invalid value instead of looping on it. On your wishlist it adds sort and filters with remembered settings, a shareable link and a 'Learn more' panel.
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
            aboutTip: 'See everything this script does.',
            aboutTitle: 'What does this script do?',
            aboutBody: [
                'This script improves Microsoft Store in two ways:',
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
            aboutTip: 'Ver qué hace este script en su totalidad.',
            aboutTitle: '¿Qué hace este script?',
            aboutBody: [
                'Este script mejora Microsoft Store en dos frentes:',
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
            aboutTip: 'Alles ansehen, was dieses Skript macht.',
            aboutTitle: 'Was macht dieses Skript?',
            aboutBody: [
                'Dieses Skript verbessert den Microsoft Store an zwei Stellen:',
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
            aboutTip: 'Voir tout ce que fait ce script.',
            aboutTitle: 'Que fait ce script ?',
            aboutBody: [
                'Ce script améliore le Microsoft Store sur deux fronts :',
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
            aboutTip: 'Vedi tutto quello che fa questo script.',
            aboutTitle: 'Che cosa fa questo script?',
            aboutBody: [
                'Questo script migliora il Microsoft Store su due fronti:',
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
            aboutTip: 'Bekijk alles wat dit script doet.',
            aboutTitle: 'Wat doet dit script?',
            aboutBody: [
                'Dit script verbetert de Microsoft Store op twee vlakken:',
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
            aboutTip: 'Ver tudo o que este script faz.',
            aboutTitle: 'O que faz este script?',
            aboutBody: [
                'Este script melhora a Microsoft Store em duas frentes:',
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
            aboutTip: 'Zobacz wszystko, co robi ten skrypt.',
            aboutTitle: 'Co robi ten skrypt?',
            aboutBody: [
                'Ten skrypt ulepsza Microsoft Store na dwa sposoby:',
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
            aboutTip: 'Посмотреть всё, что делает этот скрипт.',
            aboutTitle: 'Что делает этот скрипт?',
            aboutBody: [
                'Этот скрипт улучшает Microsoft Store по двум направлениям:',
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
            aboutTip: 'Bu betiğin yaptığı her şeyi görün.',
            aboutTitle: 'Bu betik ne yapar?',
            aboutBody: [
                'Bu betik Microsoft Store’u iki noktada iyileştirir:',
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
            aboutTip: 'このスクリプトの機能をすべて見る。',
            aboutTitle: 'このスクリプトは何をしますか？',
            aboutBody: [
                'このスクリプトは Microsoft Store を2つの面で改善します:',
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
            aboutTip: '이 스크립트가 하는 모든 것을 확인하세요.',
            aboutTitle: '이 스크립트는 무엇을 하나요?',
            aboutBody: [
                '이 스크립트는 Microsoft Store를 두 가지 방향에서 개선합니다:',
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
            aboutTip: '查看此脚本的全部功能。',
            aboutTitle: '这个脚本有什么用？',
            aboutBody: [
                '本脚本从两个方面改进 Microsoft Store：',
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
    const SCRIPT_VERSION = '2.4.1'; // sincronizar con @version
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
            #${TOOLBAR_ID} .mswl-share { background: #107c10; color: #fff; border: none; }
            #${TOOLBAR_ID} .mswl-region { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }
            #${TOOLBAR_ID} .mswl-apply { background: #107c10; color: #fff; border: none; font-weight: 600; }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // --- Modal "Saber más" (autocontenido) --------------------------------------
    function showAboutModal() {
        if (document.getElementById('mswl-about-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'mswl-about-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', inset: '0', width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', zIndex: '2147483647',
            transition: 'opacity 180ms ease', opacity: '0'
        });
        const box = document.createElement('div');
        Object.assign(box.style, {
            background: '#12181f', color: '#f2f5f7', borderRadius: '14px',
            padding: '26px 30px', minWidth: '320px', maxWidth: '560px',
            maxHeight: '80vh', overflowY: 'auto', boxSizing: 'border-box',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #0067b8',
            fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '14px', lineHeight: '1.5',
            transform: 'translateY(8px) scale(0.98)', opacity: '0',
            transition: 'transform 180ms ease, opacity 180ms ease'
        });
        const title = document.createElement('div');
        title.textContent = t.aboutTitle;
        title.style.cssText = 'font-weight:bold;font-size:17px;margin-bottom:14px;color:#4ca3e0;';
        box.appendChild(title);
        (t.aboutBody || []).forEach((p) => {
            const row = document.createElement('div');
            const trimmed = String(p).replace(/^\s+/, '');
            row.textContent = trimmed;
            row.style.marginBottom = '8px';
            if (trimmed.startsWith('–')) row.style.paddingLeft = '22px';
            else if (trimmed.startsWith('•')) row.style.paddingLeft = '10px';
            box.appendChild(row);
        });
        const gh = document.createElement('a');
        gh.href = 'https://github.com/g31w0fw0rld/microsoft-store-locale-redirect';
        gh.target = '_blank'; gh.rel = 'noopener';
        gh.textContent = 'github.com/g31w0fw0rld/microsoft-store-locale-redirect';
        gh.style.cssText = 'display:inline-block;margin-top:6px;color:#4ca3e0;text-decoration:underline;font-size:12px;';
        box.appendChild(gh);
        const kofi = document.createElement('a');
        kofi.href = 'https://ko-fi.com/g31w0fw0rld';
        kofi.target = '_blank'; kofi.rel = 'noopener';
        kofi.textContent = '☕ Apóyame en Ko-fi / Support me on Ko-fi';
        kofi.style.cssText = 'display:block;margin-top:8px;color:#4ca3e0;text-decoration:underline;font-size:12px;';
        box.appendChild(kofi);
        const foot = document.createElement('div');
        foot.textContent = 'v' + SCRIPT_VERSION + ' · g31w0fw0rld';
        foot.style.cssText = 'margin-top:2px;font-size:12px;opacity:0.7;';
        box.appendChild(foot);
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = t.close;
        closeBtn.style.cssText = 'display:block;margin-top:16px;padding:8px 14px;background:#0067b8;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;';
        box.appendChild(closeBtn);
        const closeIt = () => {
            overlay.style.opacity = '0'; box.style.opacity = '0';
            box.style.transform = 'translateY(8px) scale(0.98)';
            document.removeEventListener('keydown', onKey);
            setTimeout(() => overlay.remove(), 180);
        };
        const onKey = (e) => { if (e.key === 'Escape') closeIt(); };
        closeBtn.addEventListener('click', closeIt);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeIt(); });
        document.addEventListener('keydown', onKey);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        setTimeout(() => {
            overlay.style.opacity = '1';
            box.style.transform = 'translateY(0) scale(1)';
            box.style.opacity = '1';
        }, 10);
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
    // universal de Microsoft, y su CSS vive dentro de ese header; el cuerpo es React
    // sin tooltips (comprobado contra el HTML real el 2026-08-13). Al revés que en
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
                background: #1b1b1b; color: #f2f2f2;
                border: 1px solid #107c10;
                border-radius: 6px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.5);
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
    // INICIALIZACIÓN (por ruta)
    // =============================================
    // Microsoft Store es una SPA: si se navega sin recargar, se reintenta.
    // La redirección se evalúa SIEMPRE (también en la lista de deseos); si ya
    // estamos en el locale correcto no hace nada y se cargan las herramientas.
    function route() {
        try {
            redirectIfNeeded();
            if (isWishlist()) initWishlist();
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
