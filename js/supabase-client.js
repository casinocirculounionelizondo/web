// js/supabase-client.js — Cliente Supabase compartido y utilidades de datos
//
// SUPABASE_URL y SUPABASE_ANON_KEY provienen de config.js (script clásico).
// Se cargan antes de que cualquier módulo de esta carpeta ejecute.
/* global SUPABASE_URL, SUPABASE_ANON_KEY */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Convierte 'YYYY-MM-DD' en "15 de marzo de 2025".
// El sufijo T00:00:00 fuerza interpretación local y evita saltos de día por UTC.
export function formatearFecha(fechaStr) {
  if (!fechaStr) return '';
  const fecha = new Date(fechaStr + 'T00:00:00');
  return fecha.toLocaleDateString('es-ES', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  });
}

// Convierte 'HH:MM:SS' en "14:00".
export function formatearHora(horaStr) {
  if (!horaStr) return '';
  const [h, m] = horaStr.split(':');
  return `${h}:${m}`;
}

// Escapa HTML usando el DOM para evitar XSS al insertar datos de Supabase con innerHTML.
export function escaparHTML(str) {
  if (!str) return '';
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}
