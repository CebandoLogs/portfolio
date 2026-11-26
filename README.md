# Cebando Logs

Portfolio y blog de seguridad defensiva. Sitio estático hecho con [Hugo](https://gohugo.io), con panel de administración en `/admin/`.

## Cómo está armado

```
content/posts/        ← posts del blog (un .md por post)
content/proyectos/    ← proyectos del portfolio
content/sobre-mi.md   ← página "Sobre mí"
data/perfil.yml       ← nombre, rol, presentación, links, "ahora estudiando"
data/apariencia.yml   ← colores de acento, tema inicial, tipografía de títulos
data/certificaciones.yml, data/stack.yml
static/admin/         ← panel de administración (Sveltia CMS)
static/_headers       ← cabeceras de seguridad (las aplica Cloudflare)
layouts/ assets/      ← diseño
assets/js/mate.js     ← el mate en ASCII de la portada (ray marching sobre un canvas)
```

Todo lo de `content/` y `data/` se edita desde el panel. No hace falta tocar archivos a mano.

## Publicar por primera vez

1. **GitHub:** creá una cuenta con el usuario de la marca, activá la verificación en dos pasos y creá un repositorio (por ejemplo `cebando-logs`). Subí esta carpeta a la rama `main`.
2. **`static/admin/config.yml`:** ya apunta a `CebandoLogs/portfolio`.
3. **Cloudflare:** en Workers & Pages, creá un proyecto conectado a ese repositorio con:
   - Build command: `bash build.sh`
   - Deploy command: `npx wrangler deploy`
   El script `build.sh` baja una versión fija de Hugo, verifica su hash y compila. `wrangler.jsonc` le dice a Cloudflare que publique la carpeta `public`.
4. **`hugo.toml`:** poné en `baseURL` la dirección que te dio Cloudflare (o tu dominio propio).

Desde ahí, cada cambio que guardes en el panel o subas con git se publica solo en 1 o 2 minutos.

## Usar el panel

Entrá a `https://TU-SITIO/admin/`.

- **Iniciar sesión con un token de acceso:** creá en GitHub un *fine-grained personal access token* limitado **solo a este repositorio**, con permiso de lectura y escritura en *Contents*, y con vencimiento. Es la opción que funciona sin configurar nada más.
- **Trabajar con un repositorio local:** en tu compu, con `hugo server` corriendo, abrí `http://localhost:1313/admin/` en Chrome o Edge y elegí esta carpeta. Editás sin conexión y después subís con git.
- El botón "Iniciar sesión con GitHub" necesita un servicio de autenticación propio (sveltia-cms-auth en Cloudflare Workers). Es opcional.

En el panel:

- **Blog** y **Proyectos:** editor con formato, imágenes y vista de borrador. Un post con "Borrador" activado no se publica.
- **Ajustes del sitio → Apariencia:** colores, tema inicial y tipografía de títulos.
- **Ajustes del sitio → Perfil y redes:** presentación, links y el cartel de disponibilidad.
- **Certificaciones** y **Con qué trabajo:** las listas de la portada.

## Seguridad

- **No hay servidor ni base de datos.** El sitio son archivos estáticos: no hay login, formularios ni código del lado del servidor que atacar.
- **El panel no guarda contraseñas.** Quien quiera publicar necesita permiso de escritura en el repositorio de GitHub. La seguridad del panel es la de tu cuenta de GitHub: usá verificación en dos pasos o passkey.
- **Content Security Policy estricta** en todas las páginas: solo se cargan archivos del propio sitio, sin scripts ni estilos en línea.
- **Integridad de archivos (SRI):** el CSS y el JS del sitio, y el script del panel, se verifican por hash. El panel usa una versión fija.
- **Cabeceras** en `static/_headers`: HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP y CORP.
- **Sin trackers, cookies ni fuentes externas** en el sitio público.
- El panel está excluido de buscadores (`robots.txt` y `noindex`).

Para actualizar el panel: cambiá la versión en `static/admin/index.html` y recalculá el hash:

```bash
curl -sL https://unpkg.com/@sveltia/cms@VERSION/dist/sveltia-cms.js | openssl dgst -sha384 -binary | openssl base64 -A
```

Cuando esté publicado, pasalo por [securityheaders.com](https://securityheaders.com) y [Mozilla Observatory](https://developer.mozilla.org/en-US/observatory). El resultado es un buen primer post.

## Antes de publicar un post

- No subas IPs públicas, nombres de host reales, tokens ni datos de tu trabajo. Revisá las capturas.
- Si publicás write-ups de labs, verificá que la plataforma lo permita.

## Trabajar en tu compu

```bash
hugo server -D
```

Abrí http://localhost:1313. `-D` muestra también los borradores.
