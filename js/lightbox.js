// js/lightbox.js — Galería con lightbox en JS puro
// Se auto-inicializa al cargar la página (módulo diferido).
// Busca todos los elementos .galeria-item que contengan un <img>.
// El HTML del lightbox se inyecta en el <body> al inicializar;
// si no hay elementos de galería en la página, no hace nada.

let imagenes = [];
let indice   = 0;
let trigger  = null; // elemento que disparó la apertura, para devolver el foco

const el = {}; // referencias a nodos del lightbox

function init() {
  const items = document.querySelectorAll('.galeria-item');
  if (!items.length) return;

  // Recopilar datos de cada imagen de la galería
  imagenes = Array.from(items).map(item => {
    const img = item.querySelector('img');
    return { src: img.src, alt: img.alt };
  });

  // Inyectar el HTML del lightbox una sola vez en el body
  document.body.insertAdjacentHTML('beforeend', `
    <div class="lightbox" id="lightbox"
         role="dialog" aria-modal="true"
         aria-label="Galería de imágenes"
         aria-hidden="true">
      <button class="lightbox-cerrar" aria-label="Cerrar galería">&times;</button>
      <button class="lightbox-prev"   aria-label="Imagen anterior">&#8249;</button>
      <figure class="lightbox-figura">
        <img class="lightbox-img" src="" alt="">
        <figcaption class="lightbox-caption"></figcaption>
      </figure>
      <button class="lightbox-next"   aria-label="Imagen siguiente">&#8250;</button>
    </div>
  `);

  el.lb      = document.getElementById('lightbox');
  el.img     = el.lb.querySelector('.lightbox-img');
  el.caption = el.lb.querySelector('.lightbox-caption');
  el.cerrar  = el.lb.querySelector('.lightbox-cerrar');
  el.prev    = el.lb.querySelector('.lightbox-prev');
  el.next    = el.lb.querySelector('.lightbox-next');

  // Abrir al hacer clic en cualquier elemento de la galería
  items.forEach((item, i) => {
    item.addEventListener('click', () => abrir(i, item));
  });

  el.cerrar.addEventListener('click', cerrar);
  el.prev.addEventListener('click',   () => navegar(-1));
  el.next.addEventListener('click',   () => navegar(+1));

  // Cerrar al hacer clic sobre el fondo oscuro (no sobre la imagen)
  el.lb.addEventListener('click', e => {
    if (e.target === el.lb) cerrar();
  });

  // Teclado: Escape cierra, flechas navegan
  document.addEventListener('keydown', e => {
    if (el.lb.getAttribute('aria-hidden') === 'true') return;
    if (e.key === 'Escape')     { e.preventDefault(); cerrar(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); navegar(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); navegar(+1); }
  });
}

function abrir(i, origen) {
  trigger = origen;
  indice  = i;
  renderizar();
  el.lb.classList.add('lightbox-visible');
  el.lb.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  el.cerrar.focus();
}

function cerrar() {
  el.lb.classList.remove('lightbox-visible');
  el.lb.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  trigger?.focus();
}

function navegar(delta) {
  indice = (indice + delta + imagenes.length) % imagenes.length;
  renderizar();
}

function renderizar() {
  const { src, alt } = imagenes[indice];
  el.img.src              = src;
  el.img.alt              = alt;
  el.caption.textContent  = alt;
}

init();
