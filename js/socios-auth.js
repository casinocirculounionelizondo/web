// js/socios-auth.js — Gestión de sesión para la zona de socios
//
// SOCIOS_USER y SOCIOS_PASS provienen de config.js (script clásico cargado antes).
/* global SOCIOS_USER, SOCIOS_PASS */

const SESION_KEY = 'casino_socios_session';

// ============================================================
// LOGIN FORM — solo activo en socios.html
// ============================================================

const form     = document.getElementById('socios-form');
const msgError = document.getElementById('socios-error');

if (form) {
  // Si ya hay sesión activa, ir directo a la zona privada sin mostrar el formulario
  if (localStorage.getItem(SESION_KEY) === 'active') {
    window.location.replace('socios-privado.html');
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const usuario  = document.getElementById('usuario').value.trim();
    const password = document.getElementById('contrasena').value;

    if (usuario === SOCIOS_USER && password === SOCIOS_PASS) {
      localStorage.setItem(SESION_KEY, 'active');
      window.location.href = 'socios-privado.html';
    } else {
      msgError.classList.add('visible');
      document.getElementById('contrasena').value = '';
      document.getElementById('contrasena').focus();
    }
  });

  // Ocultar error en cuanto el usuario vuelve a escribir
  form.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('input', () => msgError.classList.remove('visible'));
  });
}

// ============================================================
// ZONA PRIVADA — solo activo en socios-privado.html
// ============================================================

const btnLogout = document.getElementById('btn-logout');

if (btnLogout) {
  checkSession();
  btnLogout.addEventListener('click', logout);
  initTabs();
}

// Inicializa el sistema de pestañas.
// La pestaña y el panel activos inicialmente ya están marcados en el HTML
// con las clases .activa y .panel-visible; este código solo gestiona los cambios.
function initTabs() {
  const tabs   = document.querySelectorAll('.privado-tab');
  const panels = document.querySelectorAll('.privado-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t   => t.classList.remove('activa'));
      panels.forEach(p => p.classList.remove('panel-visible'));
      tab.classList.add('activa');
      document.getElementById(tab.dataset.panel)?.classList.add('panel-visible');
    });
  });
}

// ============================================================
// FUNCIONES EXPORTADAS — usadas en socios-privado.html
// ============================================================

// Guarda de sesión: redirige a socios.html si no hay sesión activa.
// Se llama automáticamente al detectar socios-privado.html (btnLogout presente).
export function checkSession() {
  if (localStorage.getItem(SESION_KEY) !== 'active') {
    window.location.replace('socios.html');
  }
}

// Cierra la sesión y vuelve al inicio.
// Vinculada al botón "Cerrar sesión" de socios-privado.html.
export function logout() {
  localStorage.removeItem(SESION_KEY);
  window.location.href = 'index.html';
}
