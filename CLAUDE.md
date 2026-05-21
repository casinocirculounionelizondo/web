# Casino Círculo de la Unión de Elizondo — Contexto del proyecto

## Identidad

- **Nombre oficial**: Casino Círculo de la Unión de Elizondo / Casino Circulo de la Union Elkartea
- **Fundación**: 1861. La sociedad más antigua del Valle de Baztán.
- **Dirección**: Jaime Urrutia 10, 31700 Elizondo – Baztán, Navarra
- **Edificio actual**: inaugurado el 7 de mayo de 1882, rehabilitado íntegramente en 2011
- **Patrón**: San Antón (comida anual en enero)

## Stack técnico — NO negociable

- HTML/CSS/JS puro. Sin frameworks (ni React, Vue, Bootstrap, Tailwind, jQuery).
- Módulos ES6 (import/export) donde sea posible.
- Si una función se llama desde HTML cargado dinámicamente, usar script clásico (no módulo).
- Base de datos: Supabase (PostgreSQL), cliente JS oficial vía CDN.
- Toda la lógica corre en el navegador. Sin servidor propio.
- Hosting: GitHub Pages — rama `main`, repositorio `casinocirculounionelizondo/web`.
- Rutas siempre RELATIVAS, nunca absolutas.
- CSS en archivos separados por sección/propósito. Nunca estilos inline salvo `display:none` puntuales.
- JS siempre en archivos externos. Nunca inline.
- Base de datos: todo en `snake_case`. Foreign keys siempre. La BD es fuente de verdad.

## Credenciales (config.js) — NO modificar

```js
// config.js
const SOCIOS_USER = "socios";
const SOCIOS_PASS = "casino1861"; // provisional — CAMBIAR antes del lanzamiento

const SUPABASE_URL = "https://hethyjqyplvhihchskvj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_94KTBecU6ouKl77QnE_mFg_65_2tKf5";
```

## Dirección estética

- **Estilo**: clásico refinado con notas modernas. Papelería de hotel histórico europeo renovado.
- **Tipografía**: Cormorant Garant (serif, títulos) + DM Sans (sans-serif, cuerpo). NUNCA Inter, Roboto, Arial ni system fonts.
- **Paleta**: fondos cálidos apagados (marfil, lino, piedra). Texto casi negro. Acento único: **burdeos oscuro `#6B2737`**.
- **Layout**: generoso en espacio blanco. Sin elementos que compitan. Navegación discreta.
- **Animaciones**: solo una entrada suave (fade + translateY) en el hero. Nada más.
- No un casino de juego. No una sociedad gastronómica de pueblo. Una institución histórica.

## Sistema de estilos

- `style.css`: sistema de diseño global con variables CSS (alturas, tipografías, colores, anchos).
- Roles tipográficos como clases semánticas: `.text-heading`, `.text-body`, `.text-caption`, `.text-label`, etc.
- Variante `.on-dark` en contenedores oscuros para invertir automáticamente todos los roles tipográficos.
- CSS adicional por sección en archivos separados bajo `css/`.

## Estructura de archivos

```
/
├── index.html
├── historia.html
├── el-casino.html
├── reservas.html
├── socios.html
├── socios-privado.html
├── config.js
├── style.css
├── css/
│   ├── nav.css
│   ├── footer.css
│   ├── historia.css
│   ├── el-casino.css
│   ├── reservas.css
│   └── socios.css
├── js/
│   ├── nav.js
│   ├── socios-auth.js
│   ├── anuncios.js
│   ├── actas.js
│   ├── directorio.js
│   ├── eventos.js
│   └── lightbox.js
├── docs/
│   ├── estatutos.pdf
│   └── actas/
├── img/
│   └── placeholder/
└── supabase/
    └── schema.sql
```

## Páginas

| Archivo | Sección |
|---|---|
| `index.html` | Inicio — hero, presentación, 3 tarjetas de acceso rápido |
| `historia.html` | Historia — 4 bloques narrativos en prosa |
| `el-casino.html` | El Casino — edificio, mapa, instalaciones, galería con lightbox |
| `reservas.html` | Reservas — instrucciones + enlace a Elkargest |
| `socios.html` | Login de socios (credenciales de `config.js`, localStorage) |
| `socios-privado.html` | Zona privada — tablón, estatutos, actas, directorio, eventos |

## Nav y Footer

- Nav fijo, nombre corto a la izquierda, enlaces a la derecha. Enlace activo marcado visualmente.
- Enlace "Socios" diferenciado (acceso privado).
- Hamburger en móvil.
- Footer con fondo oscuro (color de acento `#6B2737`). Nombre completo, dirección, año fundación.
- Nav y footer se replican en cada HTML. Dejar comentario en cada archivo indicando el bloque.

## Zona de socios

- Login 100% en cliente: comparación de strings desde `config.js`.
- Sesión: `localStorage` con clave `casino_socios_session = "active"`.
- `js/socios-auth.js` exporta `checkSession()` y `logout()`.
- Zona privada carga datos desde Supabase (tablas: `anuncios`, `actas`, `socios_directorio`, `eventos`).

## Tablas Supabase

- `anuncios`: id, titulo, cuerpo, fecha_publicacion, activo
- `actas`: id, titulo, fecha, descripcion_breve, url_pdf
- `socios_directorio`: id, nombre_completo, telefono, mostrar_telefono
- `eventos`: id, titulo, fecha, hora, descripcion, activo

RLS habilitado. Policy de select público para anon en todas las tablas.

## Convenciones de código

- Sin comentarios que expliquen el "qué" (los nombres ya lo hacen).
- Solo comentarios cuando el "por qué" no es obvio.
- Sin código duplicado: si algo se repite, a función o archivo compartido.
- Internacionalización: textos en JS como constantes en objeto de traducciones (no hardcodeados en DOM), preparado para añadir euskera en el futuro. No implementar selector todavía.

## Orden de implementación

1. `config.js` + `style.css`
2. Nav (`css/nav.css` + `js/nav.js`) y Footer (`css/footer.css`)
3. `index.html`
4. `historia.html`
5. `el-casino.html` + `js/lightbox.js`
6. `reservas.html`
7. `socios.html` + `js/socios-auth.js`
8. `socios-privado.html` + `js/anuncios.js` + `js/actas.js` + `js/directorio.js` + `js/eventos.js`
9. `supabase/schema.sql`
10. Revisión de responsividad móvil
11. Instrucciones GitHub Pages

## GitHub Pages

- Settings → Pages → Source: Deploy from branch → Branch: `main` / `(root)`
- URL: `https://casinocirculounionelizondo.github.io/web/`

## Mantenedor

Desarrollador no profesional: entiende el código pero necesita arquitectura limpia, sin magia, mantenible sin frameworks. Priorizar claridad sobre brevedad.
