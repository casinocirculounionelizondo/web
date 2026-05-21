// admin/comunicaciones.js — Módulo de envío de emails a socios via Resend
//
// REQUISITO: crear admin/resend-config.js a partir de admin/resend-config.example.js
// con la API key real de Resend. El archivo NO debe subirse a GitHub (.gitignore).
//
// Cuando el Casino tenga dominio propio, cambiar el campo `from` de la función enviarEmail.
/* global RESEND_API_KEY */

import { supabase, escaparHTML } from '../js/supabase-client.js';
import { authReady } from './auth-guard.js';

// resend-config.js exporta RESEND_API_KEY como variable global (script clásico)
// Se carga antes de este módulo en comunicaciones.html... pero este módulo ES6
// necesita la variable. La cargamos verificando si existe en el scope global.

const session = await authReady;
if (!session) throw new Error('Sin sesión');

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const EMAIL_FROM      = 'Casino Círculo de la Unión <noreply@resend.dev>';
const EMAIL_REPLY_TO  = 'casinocirculounion@gmail.com';

let destinatariosActuales = [];

const formEl              = document.getElementById('form-comunicacion');
const selectDestinatarios = document.getElementById('campo-destinatarios');
const contadorEl          = document.getElementById('contador-destinatarios');
const confirmacionEl      = document.getElementById('confirmacion');
const progresoEl          = document.getElementById('progreso-envio');
const progresoBarra       = document.getElementById('progreso-barra');
const progresoTexto       = document.getElementById('progreso-texto');

bindEventos();

// ============================================================
// Carga de destinatarios según la lista seleccionada
// ============================================================

async function cargarDestinatarios(lista) {
  contadorEl.textContent = 'Cargando…';
  destinatariosActuales  = [];

  let query = supabase
    .from('socios_directorio')
    .select('nombre_completo, email')
    .eq('activo', true)
    .not('email', 'is', null);

  if (lista === 'junta') {
    query = query.not('cargo_junta', 'is', null);
  }

  const { data, error } = await query;

  if (error) {
    contadorEl.textContent = 'Error al cargar destinatarios.';
    return;
  }

  // Solo socios con email no vacío
  destinatariosActuales = (data ?? []).filter(s => s.email?.trim());
  contadorEl.textContent = `${destinatariosActuales.length} destinatario${destinatariosActuales.length !== 1 ? 's' : ''}`;
}

// ============================================================
// Pantalla de confirmación
// ============================================================

function mostrarConfirmacion() {
  const lista   = selectDestinatarios.options[selectDestinatarios.selectedIndex].text;
  const asunto  = document.getElementById('campo-asunto').value.trim();
  const cuerpo  = document.getElementById('campo-cuerpo').value.trim();

  document.getElementById('conf-destinatarios').textContent =
    `Destinatarios: ${lista} (${destinatariosActuales.length} emails)`;
  document.getElementById('conf-asunto').textContent = `Asunto: ${asunto}`;
  document.getElementById('conf-preview').textContent =
    `Mensaje: ${cuerpo.slice(0, 200)}${cuerpo.length > 200 ? '…' : ''}`;

  formEl.style.display     = 'none';
  confirmacionEl.style.display = '';
  progresoEl.style.display  = 'none';
}

// ============================================================
// Envío de emails
// ============================================================

async function enviarEmail(to, nombreCompleto, asunto, cuerpo) {
  // Verificar que RESEND_API_KEY está disponible en el scope global
  const apiKey = typeof RESEND_API_KEY !== 'undefined' ? RESEND_API_KEY : null;
  if (!apiKey || apiKey === 'RESEND_API_KEY_AQUI') {
    throw new Error('Falta la API key de Resend. Crea admin/resend-config.js con tu clave real.');
  }

  const html = cuerpo
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');

  const respuesta = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:     EMAIL_FROM,
      reply_to: EMAIL_REPLY_TO,
      to:       [to],
      subject:  asunto,
      html:     `<p>${html}</p>`,
    }),
  });

  if (!respuesta.ok) {
    const err = await respuesta.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${respuesta.status}`);
  }
}

async function ejecutarEnvio() {
  if (!destinatariosActuales.length) {
    alert('No hay destinatarios con email disponible.');
    return;
  }

  const asunto = document.getElementById('campo-asunto').value.trim();
  const cuerpo = document.getElementById('campo-cuerpo').value.trim();

  confirmacionEl.style.display  = 'none';
  progresoEl.style.display      = '';
  progresoBarra.style.width     = '0%';

  let enviados = 0;
  let errores  = 0;
  const total  = destinatariosActuales.length;

  for (const socio of destinatariosActuales) {
    progresoTexto.textContent = `Enviando ${enviados + 1} de ${total}…`;
    progresoBarra.style.width = `${Math.round(((enviados) / total) * 100)}%`;

    try {
      await enviarEmail(socio.email, socio.nombre_completo, asunto, cuerpo);
      enviados++;
    } catch (e) {
      errores++;
    }
  }

  progresoBarra.style.width = '100%';
  progresoTexto.textContent =
    `Completado. ${enviados} enviado${enviados !== 1 ? 's' : ''}` +
    (errores ? `, ${errores} error${errores !== 1 ? 'es' : ''}` : '') + '.';
}

// ============================================================
// Binding de eventos
// ============================================================

function bindEventos() {
  selectDestinatarios.addEventListener('change', () => {
    if (selectDestinatarios.value) cargarDestinatarios(selectDestinatarios.value);
    else contadorEl.textContent = '';
  });

  formEl.addEventListener('submit', e => {
    e.preventDefault();
    if (!selectDestinatarios.value) {
      alert('Selecciona una lista de destinatarios.');
      return;
    }
    if (!destinatariosActuales.length) {
      alert('No hay destinatarios disponibles en esa lista.');
      return;
    }
    mostrarConfirmacion();
  });

  document.getElementById('btn-cancelar-envio').addEventListener('click', () => {
    confirmacionEl.style.display = 'none';
    formEl.style.display         = '';
  });

  document.getElementById('btn-confirmar-envio').addEventListener('click', ejecutarEnvio);
}
