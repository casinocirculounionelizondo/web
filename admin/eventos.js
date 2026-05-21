// admin/eventos.js — Módulo de gestión de eventos

import { supabase, formatearFecha, formatearHora, escaparHTML } from '../js/supabase-client.js';
import { authReady } from './auth-guard.js';

const session = await authReady;
if (!session) throw new Error('Sin sesión');

const TABLA = 'eventos';

let eventos = [];

const tbody      = document.getElementById('eventos-tbody');
const dialogEl   = document.getElementById('dialog-evento');
const form       = document.getElementById('form-evento');
const dialogTit  = document.getElementById('dialog-titulo');
const dialogConf = document.getElementById('dialog-confirmar');

await cargar();
bindEventos();

// ============================================================
// Carga y renderizado
// ============================================================

async function cargar() {
  tbody.innerHTML = `<tr><td colspan="5" class="admin-empty">Cargando…</td></tr>`;

  const { data, error } = await supabase
    .from(TABLA)
    .select('*')
    .order('fecha', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-empty">Error al cargar eventos.</td></tr>`;
    return;
  }

  eventos = data ?? [];
  renderizar(eventos);
}

function renderizar(lista) {
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-empty">Sin eventos.</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(e => `
    <tr>
      <td>${escaparHTML(e.titulo)}</td>
      <td>${formatearFecha(e.fecha)}</td>
      <td>${e.hora ? formatearHora(e.hora) : '—'}</td>
      <td><span class="admin-tag ${e.activo ? 'admin-tag-activo' : 'admin-tag-inactivo'}">${e.activo ? 'Activo' : 'Archivado'}</span></td>
      <td class="col-acciones">
        <button class="btn btn-ghost btn-sm" data-action="editar"   data-id="${e.id}">Editar</button>
        <button class="btn btn-ghost btn-sm" data-action="archivar" data-id="${e.id}" data-activo="${e.activo}">${e.activo ? 'Archivar' : 'Activar'}</button>
        <button class="btn btn-ghost btn-sm" data-action="eliminar" data-id="${e.id}">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

// ============================================================
// Formulario nuevo / editar
// ============================================================

function abrirNuevo() {
  form.reset();
  form.dataset.id = '';
  dialogTit.textContent = 'Nuevo evento';
  document.getElementById('campo-activo').checked = true;
  dialogEl.showModal();
}

function abrirEditar(id) {
  const ev = eventos.find(x => x.id === id);
  if (!ev) return;
  form.dataset.id = id;
  dialogTit.textContent = 'Editar evento';
  document.getElementById('campo-titulo').value       = ev.titulo;
  document.getElementById('campo-fecha').value        = ev.fecha;
  document.getElementById('campo-hora').value         = ev.hora ? ev.hora.slice(0, 5) : '';
  document.getElementById('campo-descripcion').value  = ev.descripcion ?? '';
  document.getElementById('campo-activo').checked     = ev.activo;
  dialogEl.showModal();
}

// ============================================================
// Acciones sobre filas
// ============================================================

async function archivar(id, activo) {
  const { error } = await supabase.from(TABLA).update({ activo: !activo }).eq('id', id);
  if (error) { alert('Error: ' + error.message); return; }
  await cargar();
}

function abrirConfirmarEliminar(id) {
  const ev = eventos.find(x => x.id === id);
  if (!ev) return;
  document.getElementById('confirmar-nombre').textContent = ev.titulo;
  dialogConf.dataset.id = id;
  dialogConf.showModal();
}

// ============================================================
// Binding de eventos
// ============================================================

function bindEventos() {
  document.getElementById('btn-nuevo').addEventListener('click', abrirNuevo);

  tbody.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id, activo } = btn.dataset;
    if (action === 'editar')   abrirEditar(id);
    if (action === 'archivar') archivar(id, activo === 'true');
    if (action === 'eliminar') abrirConfirmarEliminar(id);
  });

  document.getElementById('btn-dialog-guardar').addEventListener('click', async () => {
    if (!form.reportValidity()) return;
    const datos = {
      titulo:      document.getElementById('campo-titulo').value.trim(),
      fecha:       document.getElementById('campo-fecha').value,
      hora:        document.getElementById('campo-hora').value || null,
      descripcion: document.getElementById('campo-descripcion').value.trim() || null,
      activo:      document.getElementById('campo-activo').checked,
    };
    const id = form.dataset.id;
    const { error } = id
      ? await supabase.from(TABLA).update(datos).eq('id', id)
      : await supabase.from(TABLA).insert(datos);
    if (error) { alert('Error al guardar: ' + error.message); return; }
    dialogEl.close();
    await cargar();
  });

  document.getElementById('btn-dialog-cerrar').addEventListener('click', () => dialogEl.close());
  document.getElementById('btn-dialog-cancelar').addEventListener('click', () => dialogEl.close());

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
