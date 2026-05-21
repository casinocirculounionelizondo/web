// admin/socios.js — Módulo de gestión de socios
// Funcionalidades: tabla con búsqueda/filtro/ordenación, formulario con detección
// de duplicados, importación CSV/XLSX (SheetJS), exportación CSV.
/* global XLSX */

import { supabase, formatearFecha, escaparHTML } from '../js/supabase-client.js';
import { authReady } from './auth-guard.js';

const session = await authReady;
if (!session) throw new Error('Sin sesión');

const TABLA = 'socios_directorio';

// ============================================================
// Estado del módulo
// ============================================================

let socios          = [];    // todos los cargados de BD
let sociosFiltrados = [];    // resultado tras filtrar/ordenar
let columnaOrden    = 'nombre_completo';
let ordenAsc        = true;
let filtroTexto     = '';
let filtroTipo      = 'activos';

// ============================================================
// Referencias al DOM
// ============================================================

const tbody       = document.getElementById('socios-tbody');
const buscador    = document.getElementById('buscador');
const filtroTipoEl = document.getElementById('filtro-tipo');
const contadorEl  = document.getElementById('contador-socios');
const dialogSocio = document.getElementById('dialog-socio');
const formSocio   = document.getElementById('form-socio');
const dialogConf  = document.getElementById('dialog-confirmar');
const inputArchivo = document.getElementById('input-archivo');

// ============================================================
// Arranque
// ============================================================

await cargar();
bindEventos();

// ============================================================
// Carga desde BD
// ============================================================

async function cargar() {
  tbody.innerHTML = `<tr><td colspan="7" class="admin-empty">Cargando…</td></tr>`;

  const { data, error } = await supabase
    .from(TABLA)
    .select('*');

  if (error) {
    tbody.innerHTML = `<tr><td colspan="7" class="admin-empty">Error al cargar socios.</td></tr>`;
    return;
  }

  socios = data ?? [];
  aplicarFiltros();
}

// ============================================================
// Filtrado y ordenación
// ============================================================

function normalizarTexto(str) {
  return (str ?? '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim();
}

function aplicarFiltros() {
  const textoBusq = normalizarTexto(filtroTexto);

  sociosFiltrados = socios.filter(s => {
    if (filtroTipo === 'activos' && !s.activo)                    return false;
    if (filtroTipo === 'junta'   && !s.cargo_junta)               return false;
    if (!textoBusq) return true;
    return normalizarTexto(s.nombre_completo).includes(textoBusq)
        || normalizarTexto(s.email).includes(textoBusq)
        || normalizarTexto(s.telefono).includes(textoBusq);
  });

  sociosFiltrados.sort((a, b) => {
    const va = normalizarTexto(String(a[columnaOrden] ?? ''));
    const vb = normalizarTexto(String(b[columnaOrden] ?? ''));
    return ordenAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  renderizar(sociosFiltrados);
  contadorEl.textContent = `${sociosFiltrados.length} socio${sociosFiltrados.length !== 1 ? 's' : ''}`;
}

// ============================================================
// Renderizado de tabla
// ============================================================

function renderizar(lista) {
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="admin-empty">Sin resultados.</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(s => `
    <tr>
      <td>${escaparHTML(s.nombre_completo)}</td>
      <td>${s.email ? escaparHTML(s.email) : '<span style="color:var(--color-text-faint)">—</span>'}</td>
      <td>${s.telefono ? escaparHTML(s.telefono) : '<span style="color:var(--color-text-faint)">—</span>'}</td>
      <td>${s.cargo_junta ? escaparHTML(s.cargo_junta) : '<span style="color:var(--color-text-faint)">—</span>'}</td>
      <td><span class="admin-tag ${s.activo ? 'admin-tag-activo' : 'admin-tag-inactivo'}">${s.activo ? 'Sí' : 'No'}</span></td>
      <td>${s.fecha_alta ? formatearFecha(s.fecha_alta) : '—'}</td>
      <td class="col-acciones">
        <button class="btn btn-ghost btn-sm" data-action="editar" data-id="${s.id}">Editar</button>
        <button class="btn btn-ghost btn-sm" data-action="baja"   data-id="${s.id}" ${!s.activo ? 'disabled' : ''}>Baja</button>
      </td>
    </tr>
  `).join('');

  // Actualizar icono de ordenación en cabeceras
  document.querySelectorAll('.admin-table th[data-col]').forEach(th => {
    delete th.dataset.order;
    if (th.dataset.col === columnaOrden) th.dataset.order = ordenAsc ? 'asc' : 'desc';
  });
}

// ============================================================
// Formulario nuevo / editar
// ============================================================

function abrirNuevo() {
  formSocio.reset();
  formSocio.dataset.id = '';
  document.getElementById('dialog-socio-titulo').textContent = 'Nuevo socio';
  document.getElementById('campo-activo').checked = true;
  document.getElementById('campo-fecha-alta').value = new Date().toISOString().slice(0, 10);
  document.getElementById('aviso-duplicados').style.display = 'none';
  dialogSocio.showModal();
}

function abrirEditar(id) {
  const s = socios.find(x => x.id === id);
  if (!s) return;
  formSocio.dataset.id = id;
  document.getElementById('dialog-socio-titulo').textContent = 'Editar socio';
  document.getElementById('campo-nombre').value             = s.nombre_completo ?? '';
  document.getElementById('campo-email').value              = s.email ?? '';
  document.getElementById('campo-telefono').value           = s.telefono ?? '';
  document.getElementById('campo-mostrar-telefono').checked = s.mostrar_telefono ?? false;
  document.getElementById('campo-cargo').value              = s.cargo_junta ?? '';
  document.getElementById('campo-activo').checked           = s.activo ?? true;
  document.getElementById('campo-fecha-alta').value         = s.fecha_alta ?? '';
  document.getElementById('campo-notas').value              = s.notas ?? '';
  document.getElementById('aviso-duplicados').style.display = 'none';
  dialogSocio.showModal();
}

// ============================================================
// Detección de duplicados
// ============================================================

// Comprueba si candidato tiene posibles duplicados en la lista de socios.
// excluirId: id del socio actual en edición (para no reportarlo como duplicado de sí mismo).
// Devuelve array de { socio, razon }.
function detectarDuplicados(candidato, excluirId = null) {
  const emailNorm  = normalizarTexto(candidato.email);
  const telNorm    = (candidato.telefono ?? '').replace(/\s/g, '');
  const tokensNuevo = new Set(
    normalizarTexto(candidato.nombre_completo).split(/\s+/).filter(t => t.length > 2)
  );

  return socios
    .filter(s => s.id !== excluirId)
    .reduce((acc, s) => {
      let razon = null;

      if (emailNorm && normalizarTexto(s.email) === emailNorm) {
        razon = 'email coincide';
      } else if (telNorm && (s.telefono ?? '').replace(/\s/g, '') === telNorm) {
        razon = 'teléfono coincide';
      } else {
        const tokensExistente = new Set(
          normalizarTexto(s.nombre_completo).split(/\s+/).filter(t => t.length > 2)
        );
        let shared = 0;
        for (const t of tokensNuevo) if (tokensExistente.has(t)) shared++;
        if (shared >= 2) razon = 'nombre similar';
      }

      if (razon) acc.push({ socio: s, razon });
      return acc;
    }, []);
}

function mostrarAvisoDuplicados(duplicados) {
  const aviso = document.getElementById('aviso-duplicados');
  const lista  = document.getElementById('lista-duplicados');

  if (!duplicados.length) {
    aviso.style.display = 'none';
    return;
  }

  lista.innerHTML = duplicados.map(({ socio, razon }) => `
    <p style="font-size:var(--text-sm);margin-bottom:var(--space-2)">
      <strong>${escaparHTML(socio.nombre_completo)}</strong>
      <span style="color:var(--color-text-muted)"> — ${escaparHTML(razon)}</span>
    </p>
  `).join('');

  aviso.style.display = '';
}

async function guardarSocio() {
  if (!formSocio.reportValidity()) return;

  const datos = {
    nombre_completo:  document.getElementById('campo-nombre').value.trim(),
    email:            document.getElementById('campo-email').value.trim() || null,
    telefono:         document.getElementById('campo-telefono').value.trim() || null,
    mostrar_telefono: document.getElementById('campo-mostrar-telefono').checked,
    cargo_junta:      document.getElementById('campo-cargo').value.trim() || null,
    activo:           document.getElementById('campo-activo').checked,
    fecha_alta:       document.getElementById('campo-fecha-alta').value || null,
    notas:            document.getElementById('campo-notas').value.trim() || null,
  };

  const id = formSocio.dataset.id;

  // Detección de duplicados (solo al crear — al editar el usuario ya lo sabe)
  if (!id) {
    const duplicados = detectarDuplicados(datos);
    if (duplicados.length) {
      mostrarAvisoDuplicados(duplicados);
      // No bloquear, solo avisar — el usuario puede ignorar y volver a pulsar Guardar
      if (document.getElementById('aviso-duplicados').dataset.ignorado !== 'true') {
        document.getElementById('aviso-duplicados').dataset.ignorado = 'true';
        return;
      }
    }
  }

  const { error } = id
    ? await supabase.from(TABLA).update(datos).eq('id', id)
    : await supabase.from(TABLA).insert(datos);

  if (error) { alert('Error al guardar: ' + error.message); return; }
  dialogSocio.close();
  await cargar();
}

// ============================================================
// Baja lógica (activo = false)
// ============================================================

function abrirConfirmarBaja(id) {
  const s = socios.find(x => x.id === id);
  if (!s) return;
  document.getElementById('confirmar-nombre').textContent = s.nombre_completo;
  dialogConf.dataset.id = id;
  dialogConf.showModal();
}

async function darDeBaja(id) {
  const { error } = await supabase.from(TABLA).update({ activo: false }).eq('id', id);
  if (error) { alert('Error: ' + error.message); return; }
  dialogConf.close();
  await cargar();
}

// ============================================================
// Exportar CSV
// ============================================================

function exportarCSV() {
  const cabeceras = ['nombre_completo', 'email', 'telefono', 'cargo_junta', 'activo', 'fecha_alta', 'notas'];

  const filas = [cabeceras.join(',')].concat(
    sociosFiltrados.map(s =>
      cabeceras.map(c => {
        const v = s[c] ?? '';
        const str = String(v === true ? 'Sí' : v === false ? 'No' : v);
        // Entrecomillar si contiene coma, comilla o salto de línea
        return /[,"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    )
  );

  const blob = new Blob(['﻿' + filas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `socios-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// Importación CSV / XLSX — wizard de pasos
// ============================================================

const dialogImportacion  = document.getElementById('dialog-importacion');
const importacionContent = document.getElementById('importacion-contenido');
const importacionFooter  = document.getElementById('importacion-footer');

let filasCrudas    = [];   // filas del archivo sin procesar
let columnasArchivo = [];  // nombres de columnas del archivo
let mapeoActual    = {};   // { campo_tabla: nombre_columna_archivo }

const CAMPOS_TABLA = [
  { key: 'nombre_completo', label: 'Nombre completo', requerido: true },
  { key: 'email',           label: 'Email' },
  { key: 'telefono',        label: 'Teléfono' },
  { key: 'cargo_junta',     label: 'Cargo en junta' },
  { key: 'mostrar_telefono', label: 'Mostrar teléfono (true/false)' },
  { key: 'notas',           label: 'Notas' },
];

function abrirImportacion() {
  filasCrudas    = [];
  columnasArchivo = [];
  mapeoActual    = {};
  mostrarPasoSeleccion();
  dialogImportacion.showModal();
  // Resetear input
  inputArchivo.value = '';
  inputArchivo.click();
}

// --- PASO 1: selección de archivo (el input file se abre directamente) ---

function mostrarPasoSeleccion() {
  importacionContent.innerHTML = `
    <p class="text-body">Selecciona un archivo .csv o .xlsx con los datos de los socios.</p>
    <p class="text-meta" style="margin-top:var(--space-2)">Cuando el archivo cargue, podrás mapear las columnas.</p>
  `;
  importacionFooter.innerHTML = `
    <button class="btn btn-ghost" id="btn-import-cancelar">Cancelar</button>
  `;
  document.getElementById('btn-import-cancelar').addEventListener('click', () => dialogImportacion.close());
}

// --- PASO 2: mapeo de columnas ---

function mostrarPasoMapeo() {
  importacionContent.innerHTML = `
    <p class="text-body" style="margin-bottom:var(--space-4)">
      Indica qué columna del archivo corresponde a cada campo:
    </p>
    <table class="mapeo-tabla">
      <thead>
        <tr>
          <th>Campo de la base de datos</th>
          <th>Columna del archivo</th>
        </tr>
      </thead>
      <tbody>
        ${CAMPOS_TABLA.map(campo => `
          <tr>
            <td>${escaparHTML(campo.label)}${campo.requerido ? ' *' : ''}</td>
            <td>
              <select class="form-input" data-campo="${campo.key}" style="width:100%">
                <option value="">— no mapear —</option>
                ${columnasArchivo.map(c => `<option value="${escaparHTML(c)}"${mapeoActual[campo.key] === c ? ' selected' : ''}>${escaparHTML(c)}</option>`).join('')}
              </select>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  importacionFooter.innerHTML = `
    <button class="btn btn-ghost" id="btn-import-atras">Cancelar</button>
    <button class="btn btn-primary" id="btn-import-preview">Vista previa</button>
  `;

  document.getElementById('btn-import-atras').addEventListener('click', () => dialogImportacion.close());
  document.getElementById('btn-import-preview').addEventListener('click', () => {
    // Guardar mapeo
    document.querySelectorAll('[data-campo]').forEach(sel => {
      mapeoActual[sel.dataset.campo] = sel.value;
    });
    if (!mapeoActual.nombre_completo) {
      alert('El campo "Nombre completo" es obligatorio — debe estar mapeado.');
      return;
    }
    mostrarPasoPreview();
  });
}

// --- PASO 3: vista previa ---

function aplicarMapeo(fila) {
  const resultado = {};
  for (const { key } of CAMPOS_TABLA) {
    const colArchivo = mapeoActual[key];
    if (colArchivo) resultado[key] = fila[colArchivo] ?? '';
  }
  return resultado;
}

function mostrarPasoPreview() {
  const muestra = filasCrudas.slice(0, 5).map(aplicarMapeo);

  importacionContent.innerHTML = `
    <p class="text-body" style="margin-bottom:var(--space-4)">
      Vista previa de los primeros ${muestra.length} registros:
    </p>
    <div class="preview-tabla-contenedor">
      <table class="admin-table">
        <thead>
          <tr>
            ${CAMPOS_TABLA.filter(c => mapeoActual[c.key]).map(c => `<th>${escaparHTML(c.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${muestra.map(fila => `
            <tr>
              ${CAMPOS_TABLA.filter(c => mapeoActual[c.key]).map(c => `<td>${escaparHTML(String(fila[c.key] ?? ''))}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <p class="text-meta" style="margin-top:var(--space-4)">Total de registros a importar: <strong>${filasCrudas.length}</strong></p>
  `;

  importacionFooter.innerHTML = `
    <button class="btn btn-ghost" id="btn-import-volver-mapeo">Volver</button>
    <button class="btn btn-primary" id="btn-import-procesar">Procesar importación</button>
  `;

  document.getElementById('btn-import-volver-mapeo').addEventListener('click', mostrarPasoMapeo);
  document.getElementById('btn-import-procesar').addEventListener('click', mostrarPasoRevision);
}

// --- PASO 4: revisión de duplicados ---

// Decisiones: mapa id_fila → 'importar' | 'descartar' | { combinar_con: id_socio }
let decisiones = {};

function mostrarPasoRevision() {
  const registros = filasCrudas.map((fila, i) => ({
    indice: i,
    datos: aplicarMapeo(fila),
    duplicados: detectarDuplicados(aplicarMapeo(fila)),
  }));

  const sinConflicto = registros.filter(r => !r.duplicados.length);
  const conConflicto = registros.filter(r => r.duplicados.length);

  // Decisiones iniciales
  decisiones = {};
  sinConflicto.forEach(r => { decisiones[r.indice] = 'importar'; });
  conConflicto.forEach(r => { decisiones[r.indice] = 'descartar'; });

  importacionContent.innerHTML = `
    ${sinConflicto.length ? `
      <div class="revision-grupo">
        <p class="revision-grupo-titulo">Sin conflictos — se importarán directamente (${sinConflicto.length})</p>
        ${sinConflicto.slice(0, 5).map(r => `
          <div class="revision-item">
            <div class="revision-item-info">
              <p class="revision-item-nombre">${escaparHTML(r.datos.nombre_completo ?? '')}</p>
              <p class="revision-item-detalle">${[r.datos.email, r.datos.telefono].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
        `).join('')}
        ${sinConflicto.length > 5 ? `<p class="text-meta" style="margin-top:var(--space-2)">… y ${sinConflicto.length - 5} más.</p>` : ''}
      </div>
    ` : ''}

    ${conConflicto.length ? `
      <div class="revision-grupo">
        <p class="revision-grupo-titulo">Posibles duplicados — revisar (${conConflicto.length})</p>
        ${conConflicto.map(r => `
          <div class="revision-item" id="revision-${r.indice}">
            <div class="revision-item-info">
              <p class="revision-item-nombre">${escaparHTML(r.datos.nombre_completo ?? '')}</p>
              <p class="revision-item-detalle">${[r.datos.email, r.datos.telefono].filter(Boolean).join(' · ')}</p>
              ${r.duplicados.map(d => `
                <p class="revision-item-razon">Posible duplicado: ${escaparHTML(d.socio.nombre_completo)} (${escaparHTML(d.razon)})</p>
              `).join('')}
            </div>
            <div class="revision-item-acciones">
              <button class="btn btn-ghost btn-sm" data-decision="importar" data-idx="${r.indice}">Importar</button>
              <button class="btn btn-secondary btn-sm" data-decision="descartar" data-idx="${r.indice}">Descartar</button>
              <button class="btn btn-ghost btn-sm" data-decision="combinar" data-idx="${r.indice}" data-dup-id="${r.duplicados[0].socio.id}">Combinar con existente</button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;

  importacionContent.querySelectorAll('[data-decision]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (btn.dataset.decision === 'combinar') {
        decisiones[idx] = { combinar_con: btn.dataset.dupId };
      } else {
        decisiones[idx] = btn.dataset.decision;
      }
      // Resaltar fila según decisión
      const item = document.getElementById(`revision-${idx}`);
      item.style.opacity = decisiones[idx] === 'descartar' ? '0.4' : '1';
      item.style.borderColor = decisiones[idx] === 'importar'
        ? '#2D6A4F' : decisiones[idx] === 'descartar'
        ? 'var(--color-border)' : 'var(--color-accent)';
    });
  });

  importacionFooter.innerHTML = `
    <button class="btn btn-ghost" id="btn-revision-volver">Volver</button>
    <button class="btn btn-primary" id="btn-revision-confirmar">Confirmar importación</button>
  `;

  document.getElementById('btn-revision-volver').addEventListener('click', mostrarPasoPreview);
  document.getElementById('btn-revision-confirmar').addEventListener('click', ejecutarImportacion);
}

// --- PASO 5: ejecución y resumen ---

async function ejecutarImportacion() {
  importacionContent.innerHTML = `<p class="text-body">Importando…</p>`;
  importacionFooter.innerHTML  = '';

  let importados = 0;
  let descartados = 0;
  let combinados  = 0;
  let errores     = 0;

  for (const [idxStr, decision] of Object.entries(decisiones)) {
    const fila  = filasCrudas[parseInt(idxStr)];
    const datos = aplicarMapeo(fila);

    // Normalizar mostrar_telefono
    if (datos.mostrar_telefono !== undefined) {
      datos.mostrar_telefono = ['true', '1', 'sí', 'si', 'yes'].includes(
        String(datos.mostrar_telefono).toLowerCase()
      );
    }

    try {
      if (decision === 'descartar') {
        descartados++;
      } else if (decision === 'importar') {
        const { error } = await supabase.from(TABLA).insert({ ...datos, activo: true });
        if (error) throw error;
        importados++;
      } else if (decision?.combinar_con) {
        // Combinar: actualizar el existente con campos no vacíos del nuevo
        const actualizacion = Object.fromEntries(
          Object.entries(datos).filter(([, v]) => v !== '' && v != null)
        );
        const { error } = await supabase.from(TABLA).update(actualizacion).eq('id', decision.combinar_con);
        if (error) throw error;
        combinados++;
      }
    } catch {
      errores++;
    }
  }

  importacionContent.innerHTML = `
    <p class="text-body" style="margin-bottom:var(--space-4)">Importación completada.</p>
    <p class="text-body">✓ Importados: <strong>${importados}</strong></p>
    <p class="text-body">↔ Combinados con existentes: <strong>${combinados}</strong></p>
    <p class="text-body">✗ Descartados: <strong>${descartados}</strong></p>
    ${errores ? `<p class="text-body" style="color:var(--color-error)">⚠ Errores: <strong>${errores}</strong></p>` : ''}
  `;

  importacionFooter.innerHTML = `
    <button class="btn btn-primary" id="btn-import-cerrar">Cerrar</button>
  `;

  document.getElementById('btn-import-cerrar').addEventListener('click', () => {
    dialogImportacion.close();
    cargar();
  });
}

// ============================================================
// Lectura de archivo CSV/XLSX con SheetJS
// ============================================================

function leerArchivo(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const hoja     = workbook.Sheets[workbook.SheetNames[0]];
        const filas    = XLSX.utils.sheet_to_json(hoja, { defval: '' });
        resolve(filas);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(archivo);
  });
}

// ============================================================
// Binding de eventos principal
// ============================================================

function bindEventos() {
  // Buscador
  buscador.addEventListener('input', () => {
    filtroTexto = buscador.value;
    aplicarFiltros();
  });

  // Filtro tipo
  filtroTipoEl.addEventListener('change', () => {
    filtroTipo = filtroTipoEl.value;
    aplicarFiltros();
  });

  // Ordenación por columna
  document.querySelectorAll('.admin-table th[data-col]').forEach(th => {
    th.addEventListener('click', () => {
      if (columnaOrden === th.dataset.col) {
        ordenAsc = !ordenAsc;
      } else {
        columnaOrden = th.dataset.col;
        ordenAsc = true;
      }
      aplicarFiltros();
    });
  });

  // Acciones en filas
  tbody.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'editar') abrirEditar(id);
    if (action === 'baja')   abrirConfirmarBaja(id);
  });

  // Botón nuevo
  document.getElementById('btn-nuevo').addEventListener('click', abrirNuevo);

  // Botón exportar
  document.getElementById('btn-exportar').addEventListener('click', exportarCSV);

  // Botón importar
  document.getElementById('btn-importar').addEventListener('click', abrirImportacion);

  // Input de archivo (selección de archivo para importar)
  inputArchivo.addEventListener('change', async () => {
    const archivo = inputArchivo.files[0];
    if (!archivo) { dialogImportacion.close(); return; }

    importacionContent.innerHTML = `<p class="text-body">Leyendo archivo…</p>`;

    try {
      filasCrudas     = await leerArchivo(archivo);
      columnasArchivo = filasCrudas.length ? Object.keys(filasCrudas[0]) : [];
      if (!filasCrudas.length) {
        importacionContent.innerHTML = `<p class="text-body">El archivo no contiene datos.</p>`;
        return;
      }
      mostrarPasoMapeo();
    } catch (err) {
      importacionContent.innerHTML = `<p class="text-body">Error al leer el archivo: ${escaparHTML(err.message)}</p>`;
    }
  });

  // Formulario socio — guardar
  document.getElementById('btn-socio-guardar').addEventListener('click', guardarSocio);
  document.getElementById('btn-socio-cancelar').addEventListener('click', () => dialogSocio.close());
  document.getElementById('btn-socio-cerrar').addEventListener('click', () => dialogSocio.close());

  // Limpiar aviso duplicados al escribir
  document.getElementById('campo-nombre').addEventListener('input', () => {
    document.getElementById('aviso-duplicados').dataset.ignorado = 'false';
    document.getElementById('aviso-duplicados').style.display = 'none';
  });

  // Confirmación de baja
  document.getElementById('btn-confirmar-eliminar').addEventListener('click', () => {
    darDeBaja(dialogConf.dataset.id);
  });
  document.getElementById('btn-confirmar-cerrar').addEventListener('click', () => dialogConf.close());
  document.getElementById('btn-confirmar-cancelar').addEventListener('click', () => dialogConf.close());

  // Cerrar dialog importación
  document.getElementById('btn-importacion-cerrar').addEventListener('click', () => dialogImportacion.close());
}
