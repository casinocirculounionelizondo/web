// js/eventos.js — Próximos eventos (panel E de la zona de socios)
// Carga la tabla `eventos` de Supabase filtrando por activo = true
// y fecha >= hoy, ordenados por fecha ascendente.

import { supabase, formatearFecha, formatearHora, escaparHTML } from './supabase-client.js';

const TEXTOS = {
  sinDatos:   'No hay eventos próximos en este momento.',
  errorCarga: 'No se pudieron cargar los eventos.',
};

async function cargarEventos() {
  const contenedor = document.getElementById('eventos-lista');
  if (!contenedor) return;

  // YYYY-MM-DD en hora local para evitar desplazamientos por UTC
  const hoy = new Date();
  const fechaHoy = [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, '0'),
    String(hoy.getDate()).padStart(2, '0'),
  ].join('-');

  const { data, error } = await supabase
    .from('eventos')
    .select('id, titulo, fecha, hora, descripcion')
    .eq('activo', true)
    .gte('fecha', fechaHoy)
    .order('fecha', { ascending: true });

  if (error) {
    contenedor.innerHTML = `<p class="empty-state">${TEXTOS.errorCarga}</p>`;
    return;
  }

  if (!data.length) {
    contenedor.innerHTML = `<p class="empty-state">${TEXTOS.sinDatos}</p>`;
    return;
  }

  contenedor.innerHTML = data.map(ev => {
    const hora = formatearHora(ev.hora);
    const fechaHora = hora
      ? `${formatearFecha(ev.fecha)} · ${hora}`
      : formatearFecha(ev.fecha);

    return `
      <article class="privado-card">
        <p class="privado-card-titulo">${escaparHTML(ev.titulo)}</p>
        <p class="privado-card-fecha">${fechaHora}</p>
        ${ev.descripcion
          ? `<p class="privado-card-cuerpo">${escaparHTML(ev.descripcion)}</p>`
          : ''}
      </article>
    `;
  }).join('');
}

cargarEventos();
