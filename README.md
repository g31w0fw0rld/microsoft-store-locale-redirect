# Microsoft Store Locale Redirect

Tampermonkey userscript that redirects the Microsoft Store to your country/language and adds wishlist tools. / Userscript de Tampermonkey que redirige Microsoft Store a tu país/idioma y añade herramientas a la lista de deseos.

![The toolbar the script adds above the Microsoft Store wishlist](docs/screenshot-wishlist.png)

*Wishlist: sort, direction, "only discounted", "remember", copy link, the redirect locale selector with its Apply button, and "Learn more". / Lista de deseos: orden, dirección, "solo con descuento", "recordar", copiar enlace, el selector de locale de redirección con su botón Aplicar, y "Saber más".*

## English

### What it does

**Region redirect**
- Sends Microsoft Store pages — the app pages on `apps.microsoft.com` and your wishlist on `microsoft.com` — to the **language and country you choose**, so you see prices and text for that region instead of the one Microsoft picks for you.
- The selector offers **21 curated locales** (language + country together), so you can only choose combinations the store actually supports. `Auto` means "do not redirect" and leaves the store's own behaviour alone.
- **It redirects two different ways, because the two sites work differently.** On `microsoft.com` the locale is a path segment, so the script rewrites `/en-us/` in the URL; on `apps.microsoft.com` it is a query, so the script sets `hl` and `gl` instead.
- **The preference lives in a cookie on `.microsoft.com`,** not in `localStorage`. The wishlist and the app pages sit on different subdomains and do not share `localStorage`, but they do share the cookie — that is the only way one choice can govern both.
- The redirect uses a **replace, not a new navigation**, so it leaves no extra history entry and the Back button behaves normally instead of bouncing you forward again.
- A stale or malformed saved locale is **detected and cleared** rather than used, which is what stops a bad value from redirecting in a loop.
- **Apply** saves your choice and redirects right away, wishlist included.

**Wishlist**
- **Sort** by date added, name, price or discount percentage, with an **↑ / ↓ toggle** for ascending or descending.
- **Only discounted:** hides everything that is not on sale.
- **Remember:** saves your sort and filters and reapplies them when you come back.
- **Copy link:** builds a URL that reproduces your sort and filters when opened. If the browser blocks clipboard access, it shows the URL in a dialog so you can copy it by hand.
- **"Learn more"** button with the full explanation inside the page, and a tooltip on every control.

**Language:** automatic Spanish / English detection, following the language Microsoft serves the page in. Note this is separate from the redirect locale: one is the script's own wording, the other is the store's region.

**Install:**
1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Open the installer: [microsoft-store-locale-redirect.user.js](https://github.com/g31w0fw0rld/microsoft-store-locale-redirect/raw/main/microsoft-store-locale-redirect.user.js) (also on [GreasyFork](https://greasyfork.org/es-419/users/1590477-g31w) and [OpenUserJS](https://openuserjs.org/users/g31w0fw0rldgmail.com/scripts)).

**Sites:** `apps.microsoft.com/detail/*`, `microsoft.com/…/store/wishlist`

## Español

### Qué hace

**Redirección de región**
- Lleva las páginas de Microsoft Store —las fichas de app en `apps.microsoft.com` y tu lista de deseos en `microsoft.com`— al **idioma y país que elijas**, para ver precios y textos de esa región en vez de la que Microsoft decide por ti.
- El selector ofrece **21 locales curados** (idioma y país juntos), así que solo puedes elegir combinaciones que la tienda realmente soporta. `Auto` significa "no redirigir" y deja el comportamiento propio de la tienda.
- **Redirige de dos formas distintas, porque los dos sitios funcionan distinto.** En `microsoft.com` el locale es un segmento de la ruta, así que el script reescribe el `/es-mx/` de la URL; en `apps.microsoft.com` es una query, así que en su lugar fija `hl` y `gl`.
- **La preferencia vive en una cookie de `.microsoft.com`,** no en `localStorage`. La lista de deseos y las fichas de app están en subdominios distintos y no comparten `localStorage`, pero sí comparten la cookie — es la única forma de que una sola elección gobierne las dos.
- La redirección usa un **reemplazo, no una navegación nueva**, así que no deja una entrada extra en el historial y el botón Atrás se comporta con normalidad en vez de devolverte hacia delante.
- Un locale guardado obsoleto o mal formado se **detecta y se borra** en vez de usarse, que es lo que evita que un valor malo redirija en bucle.
- **Aplicar** guarda tu elección y redirige al momento, lista de deseos incluida.

**Lista de deseos**
- **Ordenar** por fecha de agregado, nombre, precio o porcentaje de descuento, con un **botón ↑ / ↓** para ascendente o descendente.
- **Solo con descuento:** oculta todo lo que no está en oferta.
- **Recordar:** guarda tu orden y tus filtros y los reaplica al volver.
- **Copiar enlace:** genera una URL que al abrirla reproduce tu orden y tus filtros. Si el navegador bloquea el portapapeles, muestra la URL en un diálogo para copiarla a mano.
- Botón **"Saber más"** con la explicación completa dentro de la página, y un tooltip en cada control.

**Idioma:** detección automática español / inglés, siguiendo el idioma con el que Microsoft sirve la página. Ojo, es independiente del locale de redirección: uno es cómo habla el script, el otro es la región de la tienda.

**Instalación:**
1. Instala [Tampermonkey](https://www.tampermonkey.net/).
2. Abre el instalador: [microsoft-store-locale-redirect.user.js](https://github.com/g31w0fw0rld/microsoft-store-locale-redirect/raw/main/microsoft-store-locale-redirect.user.js) (también en [GreasyFork](https://greasyfork.org/es-419/users/1590477-g31w) y [OpenUserJS](https://openuserjs.org/users/g31w0fw0rldgmail.com/scripts)).

**Sitios:** `apps.microsoft.com/detail/*`, `microsoft.com/…/store/wishlist`

## Privacy / Privacidad

**EN:** the script makes no requests to external servers and declares `@grant none`, so it has no access to the userscript manager's privileged APIs. Your country/language preference is stored in its own cookie (`mswl-locale`, domain `.microsoft.com`, one year) because the wishlist and the app pages live on different subdomains that do not share `localStorage`: the cookie holds only the locale you pick, though —like any cookie on that domain— it travels with the requests your browser already makes to `microsoft.com`. The wishlist sort order and filters are stored in `localStorage`, and the redirect only changes the URL within the Microsoft Store itself. Nothing is sent to third parties or to the author.

**ES:** el script no hace ninguna petición a servidores externos y declara `@grant none`, así que no tiene acceso a las APIs privilegiadas del gestor de userscripts. Tu preferencia de país/idioma se guarda en una cookie propia (`mswl-locale`, dominio `.microsoft.com`, un año) porque la lista de deseos y las páginas de app viven en subdominios distintos que no comparten `localStorage`: la cookie contiene solo el locale que elijas, aunque —como cualquier cookie de ese dominio— viaja en las peticiones que tu navegador ya hace a `microsoft.com`. El orden y los filtros de la lista de deseos se guardan en `localStorage`, y la redirección solo cambia la URL dentro de la propia Microsoft Store. No se envía nada a terceros ni al autor.

## Support / Apoyar

This is part of something I'm building to grow. If it helps you and you'd like to support it, you can tip me on **[Ko-fi](https://ko-fi.com/g31w0fw0rld)** —only if you want—; and if a cause needs it more than I do, help that one instead.

Esto es parte de algo que estoy construyendo para crecer. Si te sirve y quieres apoyar, puedes invitarme un café en **[Ko-fi](https://ko-fi.com/g31w0fw0rld)** —solo si quieres—; y si hay una causa que lo necesite más que yo, ayúdala a ella.

---
Author / Autor: **g31w0fw0rld** · License / Licencia: **MIT**
