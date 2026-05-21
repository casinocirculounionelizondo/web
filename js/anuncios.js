// js/anuncios.js — Tablón de anuncios (panel A de la zona de socios)
// Carga la tabla `anuncios` de Supabase y renderiza las entradas activas.

import { supabase, formatearFecha, escaparHTML } from './supabase-client.js';

// Textos agrupados para facilitar la futura traducción al euskera
const TEXTOS = {
  cargando:   'Cargando…',
  sinDatos:   'No hay anuncios en este momento.',
  errorCarga: 'No se pudieron cargar los anuncios.',
};

async function cargarAnuncios() {
  const contenedor = document.getElementById('anuncios-lista');
  if (!contenedor) return;

  const { data, error } = await supabase
    .from('anuncios')
    .select('id, titulo, cuerpo, fecha_publicacion')
    .eq('activo', true)
    .order('fecha_publicacion', { ascending: false });

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
      <p class="privado-card-fecha">${formatearFecha(a.fecha_publicacion)}</p>
      <p class="privado-card-cuerpo">${escaparHTML(a.cuerpo)}</p>
    </article>
  `).join('');
}

cargarAnuncios();
