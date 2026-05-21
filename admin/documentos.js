// admin/documentos.js — Módulo de gestión de documentos con subida a Supabase Storage

import { supabase, formatearFecha, escaparHTML } from '../js/supabase-client.js';
import { authReady } from './auth-guard.js';

const session = await authReady;
if (!session) throw new Error('Sin sesión');

const TABLA  = 'documentos';
const BUCKET = 'documentos';

const TIPO_LABELS = {
  acta:         'Acta',
  convocatoria: 'Convocatoria',
  estatutos:    'Estatutos',
  normativa:    'Normativa',
  comunicado:   'Comunicado',
  otros:        'Otros',
};

const VISIBILIDAD_LABELS = { socios: 'Socios', junta: 'Solo junta' };

let documentos = [];

const tbody      = document.getElementById('documentos-tbody');
const dialogEl   = document.getElementById('dialog-documento');
const form       = document.getElementById('form-documento');
const dialogTit  = document.getElementById('dialog-titulo');
const dialogConf = document.getElementById('dialog-confirmar');

await cargar();
bindEventos();

// ============================================================
// Carga y renderizado
// ============================================================

async function cargar() {
  tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">Cargando…</td></tr>`;

  const { data, error } = await supabase
    .from(TABLA)
    .select('*')
    .order('fecha', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">Error al cargar documentos.</td></tr>`;
    return;
  }

  documentos = data ?? [];
  renderizar(documentos);
}

function renderizar(lista) {
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">Sin documentos.</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(d => `
    <tr>
      <td>${escaparHTML(d.titulo)}</td>
      <td>${escaparHTML(TIPO_LABELS[d.tipo] ?? d.tipo)}</td>
      <td>${formatearFecha(d.fecha)}</td>
      <td>${escaparHTML(VISIBILIDAD_LABELS[d.visibilidad] ?? d.visibilidad)}</td>
      <td><span class="admin-tag ${d.activo ? 'admin-tag-activo' : 'admin-tag-inactivo'}">${d.activo ? 'Activo' : 'Archivado'}</span></td>
      <td class="col-acciones">
        <a class="btn btn-ghost btn-sm" href="${escaparHTML(d.url_storage)}" target="_blank" rel="noopener noreferrer">Ver</a>
        <button class="btn btn-ghost btn-sm" data-action="archivar" data-id="${d.id}" data-activo="${d.activo}">${d.activo ? 'Archivar' : 'Activar'}</button>
        <button class="btn btn-ghost btn-sm" data-action="eliminar" data-id="${d.id}">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

// ============================================================
// Subir documento
// ============================================================

function abrirSubir() {
  form.reset();
  form.dataset.id = '';
  dialogTit.textContent = 'Subir documento';
  document.getElementById('grupo-archivo').style.display = '';
  document.getElementById('campo-archivo').required = true;
  document.getElementById('campo-fecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('progreso-subida').style.display = 'none';
  document.getElementById('progreso-texto').textContent = '';
  dialogEl.showModal();
}

function sanitizarNombre(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function subirDocumento() {
  const archivo  = document.getElementById('campo-archivo').files[0];
  const titulo   = document.getElementById('campo-titulo').value.trim();
  const tipo     = document.getElementById('campo-tipo').value;
  const fecha    = document.getElementById('campo-fecha').value;

  if (!archivo || !titulo || !tipo || !fecha) return null;

  // Nombre del archivo: tipo/año-mes-titulo-sanitizado.pdf
  const [anio, mes] = fecha.split('-');
  const nombreArchivo = `${tipo}/${anio}-${mes}-${sanitizarNombre(titulo)}.pdf`;

  document.getElementById('progreso-subida').style.display = '';
  document.getElementById('progreso-barra').style.width = '30%';
  document.getElementById('progreso-texto').textContent = 'Subiendo archivo…';

  const { error: errorSubida } = await supabase.storage
    .from(BUCKET)
    .upload(nombreArchivo, archivo, { contentType: 'application/pdf', upsert: true });

  if (errorSubida) {
    document.getElementById('progreso-texto').textContent = 'Error al subir: ' + errorSubida.message;
    document.getElementById('progreso-barra').style.width = '0%';
    return null;
  }

  document.getElementById('progreso-barra').style.width = '70%';
  document.getElementById('progreso-texto').textContent = 'Guardando en base de datos…';

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo);
  return urlData.publicUrl;
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
  const d = documentos.find(x => x.id === id);
  if (!d) return;
  document.getElementById('confirmar-nombre').textContent = d.titulo;
  dialogConf.dataset.id = id;
  dialogConf.showModal();
}

async function eliminar(id) {
  const d = documentos.find(x => x.id === id);
  if (!d) return;

  // Extraer ruta del archivo desde la URL pública
  const rutaArchivo = d.url_storage.split(`/storage/v1/object/public/${BUCKET}/`)[1];
  if (rutaArchivo) {
    await supabase.storage.from(BUCKET).remove([rutaArchivo]);
  }

  const { error } = await supabase.from(TABLA).delete().eq('id', id);
  if (error) { alert('Error: ' + error.message); return; }
}

// ============================================================
// Binding de eventos
// ============================================================

function bindEventos() {
  document.getElementById('btn-subir').addEventListener('click', abrirSubir);

  tbody.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id, activo } = btn.dataset;
    if (action === 'archivar') archivar(id, activo === 'true');
    if (action === 'eliminar') abrirConfirmarEliminar(id);
  });

  document.getElementById('btn-dialog-guardar').addEventListener('click', async () => {
    if (!form.reportValidity()) return;

    const btnGuardar = document.getElementById('btn-dialog-guardar');
    btnGuardar.disabled = true;

    const urlStorage = await subirDocumento();
    if (!urlStorage) { btnGuardar.disabled = false; return; }

    const datos = {
      titulo:      document.getElementById('campo-titulo').value.trim(),
      tipo:        document.getElementById('campo-tipo').value,
      fecha:       document.getElementById('campo-fecha').value,
      descripcion: document.getElementById('campo-descripcion').value.trim() || null,
      visibilidad: document.getElementById('campo-visibilidad').value,
      url_storage: urlStorage,
      activo:      true,
    };

    const { error } = await supabase.from(TABLA).insert(datos);

    btnGuardar.disabled = false;
    if (error) { alert('Error al guardar: ' + error.message); return; }

    document.getElementById('progreso-barra').style.width = '100%';
    document.getElementById('progreso-texto').textContent = 'Guardado correctamente.';

    setTimeout(() => {
      dialogEl.close();
      cargar();
    }, 600);
  });

  document.getElementById('btn-dialog-cerrar').addEventListener('click', () => dialogEl.close());
  document.getElementById('btn-dialog-cancelar').addEventListener('click', () => dialogEl.close());

  document.getElementById('btn-confirmar-eliminar').addEventListener('click', async () => {
    const id = dialogConf.dataset.id;
    await eliminar(id);
    dialogConf.close();
    await cargar();
  });

  document.getElementById('btn-confirmar-cerrar').addEventListener('click', () => dialogConf.close());
  document.getElementById('btn-confirmar-cancelar').addEventListener('click', () => dialogConf.close());
}
