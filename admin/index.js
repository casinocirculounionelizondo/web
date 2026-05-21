// admin/index.js — Dashboard: contadores de resumen

import { supabase } from '../js/supabase-client.js';
import { authReady } from './auth-guard.js';

const session = await authReady;
if (!session) throw new Error('Sin sesión');

const hoy = new Date();
const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

const [sociosRes, eventosRes, anunciosRes, sugerenciasRes] = await Promise.all([
  supabase.from('socios_directorio').select('*', { count: 'exact', head: true }).eq('activo', true),
  supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('activo', true).gte('fecha', fechaHoy),
  supabase.from('anuncios').select('*', { count: 'exact', head: true }).eq('activo', true),
  supabase.from('sugerencias').select('*', { count: 'exact', head: true }).eq('estado', 'nueva'),
]);

document.getElementById('cnt-socios').textContent      = sociosRes.count    ?? '—';
document.getElementById('cnt-eventos').textContent     = eventosRes.count   ?? '—';
document.getElementById('cnt-anuncios').textContent    = anunciosRes.count  ?? '—';
document.getElementById('cnt-sugerencias').textContent = sugerenciasRes.count ?? '—';
