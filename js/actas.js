// js/actas.js — Actas de reuniones (panel C de la zona de socios)
// Carga la tabla `actas` de Supabase y renderiza las entradas con enlace de descarga.

import { supabase, formatearFecha, escaparHTML } from './supabase-client.js';

const TEXTOS = {
  sinDatos:   'No hay actas disponibles en este momento.',
  errorCarga: 'No se pudieron cargar las actas.',
  descargar:  'Descargar acta',
};

async function cargarActas() {
  const contenedor = document.getElementById('actas-lista');
  if (!contenedor) return;

  const { data, error } = await supabase
    .from('actas')
    .select('id, titulo, fecha, descripcion_breve, url_pdf')
    .order('fecha', { ascending: false });

  if (error) {
    contenedor.innerHTML = `<p class="empty-state">${TEXTOS.errorCarga}</p>`;
    return;
  }

  if (!data.length) {
    contenedor.innerHTML = `<p class="empty-state">${TEXTOS.sinDatos}</p>`;
    return;
  }

  contenedor.innerHTML = data.map(a => `
    <article class="privado-card">
      <p class="privado-card-titulo">${escaparHTML(a.titulo)}</p>
      <p class="privado-card-fecha">${formatearFecha(a.fecha)}</p>
      ${a.descripcion_breve
        ? `<p class="privado-card-cuerpo">${escaparHTML(a.descripcion_breve)}</p>`
        : ''}
      <a href="${escaparHTML(a.url_pdf)}"
         class="btn btn-ghost btn-sm"
         target="_blank"
         rel="noopener noreferrer">
        ${TEXTOS.descargar}
      </a>
    </article>
  `).join('');
}

cargarActas();
