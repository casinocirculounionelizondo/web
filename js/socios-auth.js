// js/socios-auth.js — Gestión de sesión para la zona de socios
//
// SOCIOS_USER y SOCIOS_PASS provienen de config.js (script clásico cargado antes).
/* global SOCIOS_USER, SOCIOS_PASS */

import { supabase } from './supabase-client.js';

const SESION_KEY  = 'casino_socios_session';
const ADMIN_KEY   = 'casino_admin_role';

// ============================================================
// LOGIN FORM — solo activo en socios.html
// ============================================================

const form     = document.getElementById('socios-form');
const msgError = document.getElementById('socios-error');

if (form) {
  // Si ya hay sesión de socio activa, ir directo a la zona privada
  if (localStorage.getItem(SESION_KEY) === 'active') {
    window.location.replace('socios-privado.html');
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const usuario  = document.getElementById('usuario').value.trim();
    const password = document.getElementById('contrasena').value;

    if (usuario.includes('@')) {
      // Rama admin: autenticación con Supabase Auth
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;

      const { error } = await supabase.auth.signInWithPassword({ email: usuario, password });

      btn.disabled = false;
      if (error) {
        msgError.classList.add('visible');
        document.getElementById('contrasena').value = '';
        document.getElementById('contrasena').focus();
      } else {
        // Admin también necesita la sesión de socio para ver el contenido privado
        localStorage.setItem(SESION_KEY, 'active');
        sessionStorage.setItem(ADMIN_KEY, 'active');
        window.location.href = 'socios-privado.html';
      }
    } else {
      // Rama socios: comparación de strings hardcodeada
      if (usuario === SOCIOS_USER && password === SOCIOS_PASS) {
        localStorage.setItem(SESION_KEY, 'active');
        window.location.href = 'socios-privado.html';
      } else {
        msgError.classList.add('visible');
        document.getElementById('contrasena').value = '';
        document.getElementById('contrasena').focus();
      }
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

  // Si hay sesión de Supabase Auth activa, mostrar enlace al panel admin.
  // El enlace NO se renderiza si no hay sesión (no está en el DOM, no solo oculto).
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) return;
    const cabecera = document.querySelector('.privado-cabecera');
    const enlace   = document.createElement('a');
    enlace.href      = 'admin/index.html';
    enlace.className = 'btn btn-secondary btn-sm';
    enlace.textContent = 'Panel de administración';
    cabecera.insertBefore(enlace, btnLogout);
  });
}

// Inicializa el sistema de pestañas.
// La pestaña y el panel activos inicialmente ya están marcados en el HTML
// con las clases .activa y .panel-visible; este código solo gestiona los cambios.
function initTabs() {
  const tabs   = document.querySelectorAll('.privado-tab');
  const panels = document.querySelectorAll('.privado-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t  => { t.classList.remove('activa'); t.setAttribute('aria-selected', 'false'); });
      panels.forEach(p => p.classList.remove('panel-visible'));
      tab.classList.add('activa');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById(tab.dataset.panel)?.classList.add('panel-visible');
    });
  });
}

// ============================================================
// FUNCIONES EXPORTADAS — usadas en socios-privado.html
// ============================================================

// Guarda de sesión: redirige a socios.html si no hay sesión de socio activa.
export function checkSession() {
  if (localStorage.getItem(SESION_KEY) !== 'active') {
    window.location.replace('socios.html');
  }
}

// Cierra la sesión de socio y de admin (si la hubiera) y vuelve al inicio.
export async function logout() {
  await supabase.auth.signOut();
  sessionStorage.removeItem(ADMIN_KEY);
  localStorage.removeItem(SESION_KEY);
  window.location.href = 'index.html';
}
