// Configuración pública del cliente de Supabase.
// La clave "anon" está protegida por Row Level Security (RLS) en el backend,
// por lo que es segura para exponer en el navegador.
const SUPABASE_URL = 'https://mhmqgjgfkcrgbtrhmtqw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obXFnamdma2NyZ2J0cmhtdHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzQ3ODIsImV4cCI6MjEwMjA1MDc4Mn0.mR9X_uejf10JglaZbKuWwnedqGiFhxB97i4fkWE6P6Y';
const SHORT_VIDEOS_BUCKET = 'short-videos';
const SHORT_VIDEOS_TABLE = 'short_videos';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
