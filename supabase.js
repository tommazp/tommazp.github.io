// ============================================
// js/supabase.js — Supabase client (shared)
// ============================================
// INSTRUCCIONES:
// 1. Creá un proyecto en https://supabase.com
// 2. Andá a Settings > API
// 3. Copiá la URL y la anon key y pegá abajo
// ============================================

const SUPABASE_URL     = 'https://unkewfarpionedanpmyq.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua2V3ZmFycGlvbmVkYW5wbXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzE0NDcsImV4cCI6MjA5NjgwNzQ0N30.14lPbqKTAx4DPKFQ7NDb8YWk5_gCaVfI02A_8NyOnuk';

// La contraseña del admin NUNCA va aquí.
// Se verifica contra Supabase Auth desde el servidor.

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default _supabase;
export { SUPABASE_URL, SUPABASE_ANON_KEY };
