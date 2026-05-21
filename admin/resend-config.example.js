// admin/resend-config.example.js — Plantilla de configuración para el módulo de comunicaciones
//
// INSTRUCCIONES:
//   1. Copiar este archivo como admin/resend-config.js (sin el sufijo .example)
//   2. Sustituir RESEND_API_KEY_AQUI por la clave real de https://resend.com/api-keys
//   3. admin/resend-config.js está en .gitignore — NO subir a GitHub
//
// Cuando el Casino tenga dominio propio, cambiar el campo `from` en comunicaciones.js:
//   from: 'Casino Círculo de la Unión <noreply@dominio-del-casino.com>'

const RESEND_API_KEY = 'RESEND_API_KEY_AQUI';
