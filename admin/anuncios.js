// admin/anuncios.js — Módulo de gestión de anuncios

import { supabase, formatearFecha, escaparHTML } from '../js/supabase-client.js';
import { authReady } from './auth-guard.js';

const session = await authReady;
if (!session) throw new Error('Sin sesión');

const TABLA = 'anuncios';

let anuncios = [];

const tbody      = document.getElementById('anuncios-tbody');
const dialogEl   = document.getElementById('dialog-anuncio');
const form       = document.getElementById('form-anuncio');
const dialogTit  = document.getElementById('dialog-titulo');
const dialogConf = document.getElementById('dialog-confirmar');

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
    .order('fecha_publicacion', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="admin-empty">Error al cargar anuncios.</td></tr>`;
    return;
  }

  anuncios = data ?? [];
  renderizar(anuncios);
}

function renderizar(lista) {
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="admin-empty">Sin anuncios.</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(a => `
    <tr>
      <td>${escaparHTML(a.titulo)}</td>
      <td>${formatearFecha(a.fecha_publicacion)}</td>
      <td><span class="admin-tag ${a.activo ? 'admin-tag-activo' : 'admin-tag-inactivo'}">${a.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td class="col-acciones">
        <button class="btn btn-ghost btn-sm" data-action="editar"   data-id="${a.id}">Editar</button>
        <button class="btn btn-ghost btn-sm" data-action="archivar" data-id="${a.id}" data-activo="${a.activo}">${a.activo ? 'Archivar' : 'Activar'}</button>
        <button class="btn btn-ghost btn-sm" data-action="eliminar" data-id="${a.id}">Eliminar</button>
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
  dialogTit.textContent = 'Nuevo anuncio';
  document.getElementById('campo-activo').checked = true;
  document.getElementById('campo-fecha').value = new Date().toISOString().slice(0, 10);
  dialogEl.showModal();
}

function abrirEditar(id) {
  const a = anuncios.find(x => x.id === id);
  if (!a) return;
  form.dataset.id = id;
  dialogTit.textContent = 'Editar anuncio';
  document.getElementById('campo-titulo').value = a.titulo;
  document.getElementById('campo-cuerpo').value = a.cuerpo;
  document.getElementById('campo-fecha').value  = a.fecha_publicacion;
  document.getElementById('campo-activo').checked = a.activo;
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
  const a = anuncios.find(x => x.id === id);
  if (!a) return;
  document.getElementById('confirmar-nombre').textContent = a.titulo;
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
      titulo:            document.getElementById('campo-titulo').value.trim(),
      cuerpo:            document.getElementById('campo-cuerpo').value.trim(),
      fecha_publicacion: document.getElementById('campo-fecha').value,
      activo:            document.getElementById('campo-activo').checked,
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
