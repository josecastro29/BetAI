// ⚠️ Configuração Supabase
// NOTA: Em produção, usar variáveis de ambiente
// Por agora, estas chaves públicas são seguras (anon key)

const SUPABASE_CONFIG = {
  url: 'https://wthelmchpyzgkmuvibhl.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0aGVsbWNocHl6Z2ttdXZpYmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzc2MzEsImV4cCI6MjA3ODYxMzYzMX0.RuQPeZSLB9EET4-LiNMTvoKzfKuYsp8Vsk_LNKMdhok'
};

// Inicializar cliente Supabase
const supabase = window.supabase.createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
);
