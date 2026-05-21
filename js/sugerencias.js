// js/sugerencias.js — Formulario de sugerencias anónimas para socios (zona privada)
// La inserción usa la anon key; la policy RLS de `sugerencias` lo permite.

import { supabase } from './supabase-client.js';

const MAX_CHARS = 1000;

const TEXTOS = {
  confirmacion: 'Sugerencia enviada. Gracias por tu aportación.',
  error:        'No se pudo enviar la sugerencia. Inténtalo de nuevo.',
  enviando:     'Enviando…',
  enviar:       'Enviar sugerencia',
};

function initSugerencias() {
  const form     = document.getElementById('sugerencias-form');
  const textarea = document.getElementById('sugerencias-texto');
  const contador = document.getElementById('sugerencias-contador');
  const mensaje  = document.getElementById('sugerencias-mensaje');

  if (!form) return;

  textarea.addEventListener('input', () => {
    const n = textarea.value.length;
    contador.textContent = `${n} / ${MAX_CHARS}`;
    contador.classList.toggle('limite-cercano', MAX_CHARS - n < 100);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const texto = textarea.value.trim();
    if (!texto) return;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled    = true;
    btn.textContent = TEXTOS.enviando;
    mensaje.hidden  = true;

    const { error } = await supabase.from('sugerencias').insert({ texto });

    if (error) {
      mensaje.textContent = TEXTOS.error;
      mensaje.className   = 'sugerencias-mensaje error';
    } else {
      form.reset();
      contador.textContent = `0 / ${MAX_CHARS}`;
      mensaje.textContent  = TEXTOS.confirmacion;
      mensaje.className    = 'sugerencias-mensaje ok';
    }

    mensaje.hidden  = false;
    btn.disabled    = false;
    btn.textContent = TEXTOS.enviar;
  });
}

initSugerencias();
