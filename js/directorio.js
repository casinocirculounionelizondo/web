// js/directorio.js — Directorio de socios (panel D de la zona de socios)
// Carga la tabla `socios_directorio` de Supabase ordenada alfabéticamente.
// El teléfono solo se muestra cuando mostrar_telefono = true.

import { supabase, escaparHTML } from './supabase-client.js';

const TEXTOS = {
  sinDatos:   'No hay socios registrados en el directorio.',
  errorCarga: 'No se pudo cargar el directorio.',
};

async function cargarDirectorio() {
  const contenedor = document.getElementById('directorio-lista');
  if (!contenedor) return;

  const { data, error } = await supabase
    .from('socios_directorio')
    .select('id, nombre_completo, telefono, mostrar_telefono')
    .order('nombre_completo', { ascending: true });

  if (error) {
    contenedor.innerHTML = `<p class="empty-state">${TEXTOS.errorCarga}</p>`;
    return;
  }

  if (!data.length) {
    contenedor.innerHTML = `<p class="empty-state">${TEXTOS.sinDatos}</p>`;
    return;
  }

  const filas = data.map(s => `
    <li class="directorio-fila">
      <span class="directorio-nombre">${escaparHTML(s.nombre_completo)}</span>
      ${s.mostrar_telefono && s.telefono
        ? `<span class="directorio-telefono">${escaparHTML(s.telefono)}</span>`
        : ''}
    </li>
  `).join('');

  contenedor.innerHTML = `<ul class="directorio-lista">${filas}</ul>`;
}

cargarDirectorio();
