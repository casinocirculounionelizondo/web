// js/documentos.js — Documentos de la sociedad (panel C de la zona de socios)
// Lee de la tabla `documentos` en Supabase Storage (sustituye a la antigua tabla `actas`).

import { supabase, formatearFecha, escaparHTML } from './supabase-client.js';

const TIPOS = {
  acta:         'Acta',
  convocatoria: 'Convocatoria',
  estatutos:    'Estatutos',
  normativa:    'Normativa',
  comunicado:   'Comunicado',
  otros:        'Documento',
};

const TEXTOS = {
  sinDatos:   'No hay documentos disponibles en este momento.',
  errorCarga: 'No se pudieron cargar los documentos.',
  descargar:  'Descargar',
};

async function cargarDocumentos() {
  const contenedor = document.getElementById('documentos-lista');
  if (!contenedor) return;

  const { data, error } = await supabase
    .from('documentos')
    .select('id, titulo, tipo, fecha, descripcion, url_storage')
    .eq('activo', true)
    .eq('visibilidad', 'socios')
    .order('fecha', { ascending: false });

  if (error) {
    contenedor.innerHTML = `<p class="empty-state">${TEXTOS.errorCarga}</p>`;
    return;
  }

  if (!data.length) {
    contenedor.innerHTML = `<p class="empty-state">${TEXTOS.sinDatos}</p>`;
    return;
  }

  contenedor.innerHTML = data.map(d => `
    <article class="privado-card">
      <div class="privado-card-meta">
        <span class="privado-card-tipo">${escaparHTML(TIPOS[d.tipo] ?? d.tipo)}</span>
        <span class="privado-card-fecha">${formatearFecha(d.fecha)}</span>
      </div>
      <p class="privado-card-titulo">${escaparHTML(d.titulo)}</p>
      ${d.descripcion
        ? `<p class="privado-card-cuerpo">${escaparHTML(d.descripcion)}</p>`
        : ''}
      <a href="${escaparHTML(d.url_storage)}"
         class="btn btn-ghost btn-sm"
         target="_blank"
         rel="noopener noreferrer">
        ${TEXTOS.descargar}
      </a>
    </article>
  `).join('');
}

cargarDocumentos();
