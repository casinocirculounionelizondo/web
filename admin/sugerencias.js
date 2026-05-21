// admin/sugerencias.js — Módulo de gestión de sugerencias recibidas

import { supabase, escaparHTML } from '../js/supabase-client.js';
import { authReady } from './auth-guard.js';

const session = await authReady;
if (!session) throw new Error('Sin sesión');

const TABLA = 'sugerencias';

const ESTADO_LABELS = {
  nueva:     'Nueva',
  'leída':   'Leída',
  archivada: 'Archivada',
};

const ESTADO_TAGS = {
  nueva:     'admin-tag-nueva',
  'leída':   'admin-tag-leida',
  archivada: 'admin-tag-archivada',
};

let sugerencias = [];

const tbody       = document.getElementById('sugerencias-tbody');
const filtroEstado = document.getElementById('filtro-estado');
const dialogEl     = document.getElementById('dialog-sugerencia');
const dialogConf   = document.getElementById('dialog-confirmar');

await cargar();
bindEventos();

// ============================================================
// Carga y renderizado
// ============================================================

async function cargar() {
  tbody.innerHTML = `<tr><td colspan="4" class="admin-empty">Cargando…</td></tr>`;

  const { data, error } = await supabase
    .from(TABLA)
    .select('*')
    .order('fecha', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="admin-empty">Error al cargar sugerencias.</td></tr>`;
    return;
  }

  sugerencias = data ?? [];
  aplicarFiltro();
}

function aplicarFiltro() {
  const estado = filtroEstado.value;
  const lista  = estado === 'todas' ? sugerencias : sugerencias.filter(s => s.estado === estado);
  renderizar(lista);
}

function formatearFechaHora(fechaStr) {
  const d = new Date(fechaStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function truncar(texto, max = 100) {
  return texto.length > max ? texto.slice(0, max) + '…' : texto;
}

function renderizar(lista) {
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="admin-empty">Sin sugerencias.</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(s => `
    <tr>
      <td style="white-space:nowrap">${formatearFechaHora(s.fecha)}</td>
      <td>
        <span class="sugerencias-texto-truncado" style="cursor:pointer;display:block"
          data-action="ver" data-id="${s.id}">${escaparHTML(truncar(s.texto))}</span>
      </td>
      <td><span class="admin-tag ${ESTADO_TAGS[s.estado] ?? ''}">${ESTADO_LABELS[s.estado] ?? s.estado}</span></td>
      <td class="col-acciones">
        ${s.estado === 'nueva' ? `<button class="btn btn-ghost btn-sm" data-action="leer" data-id="${s.id}">Marcar leída</button>` : ''}
        ${s.estado !== 'archivada' ? `<button class="btn btn-ghost btn-sm" data-action="archivar" data-id="${s.id}">Archivar</button>` : ''}
        <button class="btn btn-ghost btn-sm" data-action="eliminar" data-id="${s.id}">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

// ============================================================
// Acciones
// ============================================================

function abrirSugerencia(id) {
  const s = sugerencias.find(x => x.id === id);
  if (!s) return;
  document.getElementById('dialog-sugerencia-fecha').textContent = formatearFechaHora(s.fecha);
  document.getElementById('dialog-sugerencia-texto').textContent = s.texto;
  dialogEl.showModal();
  // Marcar como leída automáticamente al abrir
  if (s.estado === 'nueva') cambiarEstado(id, 'leída');
}

async function cambiarEstado(id, estado) {
  const { error } = await supabase.from(TABLA).update({ estado }).eq('id', id);
  if (error) { alert('Error: ' + error.message); return; }
  await cargar();
}

function abrirConfirmarEliminar(id) {
  dialogConf.dataset.id = id;
  dialogConf.showModal();
}

// ============================================================
// Binding de eventos
// ============================================================

function bindEventos() {
  filtroEstado.addEventListener('change', aplicarFiltro);

  tbody.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const { action, id } = el.dataset;
    if (action === 'ver')      abrirSugerencia(id);
    if (action === 'leer')     cambiarEstado(id, 'leída');
    if (action === 'archivar') cambiarEstado(id, 'archivada');
    if (action === 'eliminar') abrirConfirmarEliminar(id);
  });

  document.getElementById('btn-dialog-cerrar').addEventListener('click', () => dialogEl.close());
  document.getElementById('btn-dialog-cerrar-2').addEventListener('click', () => dialogEl.close());

  document.getElementById('btn-confirmar-eliminar').addEventListener('click', async () => {
    const id = dialogConf.dataset.id;
    const { error } = await supabase.from(TABLA).delete().eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    dialogConf.close();
    await cargar();
  });

  document.getElementById('btn-confirmar-cerrar').addEventListener('click', () => dialogConf.close());
  document.getElementById('btn-confirmar-cancelar').addEventListener('click', () => dialogConf.close());
}
