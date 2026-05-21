// js/nav.js — Navegación principal
// Módulo cargado como <script type="module"> en cada página.
// Se ejecuta tras el parsing del DOM (los módulos son diferidos por defecto).

const hamburger = document.getElementById('nav-hamburger');
const navLinks   = document.getElementById('nav-links');

// Marca el enlace de la página actual como activo comparando
// el nombre de archivo de la URL con el href de cada enlace.
// En la raíz del sitio (GitHub Pages con /web/) el pathname puede
// terminar en '/' o en 'index.html'; ambos casos apuntan a Inicio.
const filename = window.location.pathname.split('/').pop() || 'index.html';

document.querySelectorAll('.nav-link').forEach(link => {
  const href = link.getAttribute('href');
  if (href === filename || (filename === '' && href === 'index.html')) {
    link.classList.add('nav-link-active');
    link.setAttribute('aria-current', 'page');
  }
});

// --- Hamburger ---

hamburger.addEventListener('click', () => {
  const open = navLinks.classList.toggle('nav-open');
  hamburger.classList.toggle('nav-hamburger-open', open);
  hamburger.setAttribute('aria-expanded', String(open));
  hamburger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
});

// Cerrar con Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeMenu();
});

// Cerrar al hacer clic fuera del nav
document.addEventListener('click', e => {
  if (!e.target.closest('.site-nav') && navLinks.classList.contains('nav-open')) {
    closeMenu();
  }
});

// Cerrar al navegar (clic en enlace dentro del menú abierto)
navLinks.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', closeMenu);
});

function closeMenu() {
  navLinks.classList.remove('nav-open');
  hamburger.classList.remove('nav-hamburger-open');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.setAttribute('aria-label', 'Abrir menú');
}
