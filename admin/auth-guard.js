// admin/auth-guard.js — Protección de sesión para el panel admin.
//
// Importado como primer módulo en todas las páginas admin.
// Exporta `authReady`, una Promise que resuelve con la sesión si el usuario
// está autenticado. Si no hay sesión, redirige antes de mostrar contenido.
// El body arranca con visibility:hidden (en admin.css) y se muestra aquí.
/* global SUPABASE_URL, SUPABASE_ANON_KEY */

import { supabase } from '../js/supabase-client.js';

export const authReady = supabase.auth.getSession().then(({ data: { session } }) => {
  if (!session) {
    window.location.replace('../index.html');
    return null;
  }
  document.body.style.visibility = 'visible';
  marcarEnlaceActivo();
  cargarBadgeSugerencias();
  return session;
});

// Logout — adjuntado al botón presente en el sidebar de todas las páginas admin
document.getElementById('btn-admin-logout')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.replace('../index.html');
});

function marcarEnlaceActivo() {
  const ruta = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.admin-nav-link[href]').forEach(link => {
    if (link.getAttribute('href') === ruta) link.classList.add('activo');
  });
}

async function cargarBadgeSugerencias() {
  const badge = document.getElementById('badge-sugerencias');
  if (!badge) return;
  const { count } = await supabase
    .from('sugerencias')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'nueva');
  if (count > 0) {
    badge.textContent = count;
    badge.removeAttribute('hidden');
  }
}
