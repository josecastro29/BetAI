-- ====================================================================
-- SCRIPT SQL: Configuração do Painel de Administração
-- ====================================================================
-- Este script adiciona a funcionalidade de administrador ao sistema
-- ====================================================================

-- 1. Adicionar coluna is_admin à tabela users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Criar índice para melhorar performance de queries admin
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- 3. Comentário explicativo
COMMENT ON COLUMN users.is_admin IS 'Indica se o utilizador tem permissões de administrador para gerir resgates';

-- ====================================================================
-- CRIAR UTILIZADOR ADMINISTRADOR
-- ====================================================================
-- ⚠️ IMPORTANTE: Altera o email e a password antes de executar!
-- ⚠️ A password abaixo é "admin123" - MUDA ISTO!
-- ====================================================================

-- Para gerar o hash da password, usa este código JavaScript:
/*
const bcrypt = dcodeIO.bcrypt;
const password = "SUA_PASSWORD_SEGURA_AQUI";
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
*/

-- Exemplo: Criar admin com email "admin@betai.com" e password "admin123"
-- Hash gerado: $2a$10$rFj8VhKGCYjXtD5xmJ5IfOqKqW7Ud5rRmWVKjGMj8pOQN5H7hK7jK

INSERT INTO users (
  name,
  email,
  password_hash,
  nif,
  phone,
  referral_code,
  is_admin,
  created_at
) VALUES (
  'Administrador',
  'admin@betai.com',  -- ⚠️ MUDA ISTO para o teu email
  '$2a$10$rFj8VhKGCYjXtD5xmJ5IfOqKqW7Ud5rRmWVKjGMj8pOQN5H7hK7jK',  -- ⚠️ Password: "admin123" - MUDA ISTO!
  '999999990',  -- NIF genérico para admin
  '999999999',  -- Telemóvel genérico para admin
  'ADMIN2024',
  TRUE,  -- is_admin = true
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  is_admin = TRUE;

-- ====================================================================
-- VERIFICAR UTILIZADORES ADMIN
-- ====================================================================

SELECT 
  id,
  name,
  email,
  is_admin,
  created_at
FROM users
WHERE is_admin = TRUE;

-- ====================================================================
-- QUERIES ÚTEIS PARA ADMINISTRAÇÃO
-- ====================================================================

-- Ver todos os resgates pendentes com informação do utilizador
SELECT 
  r.id,
  r.points_redeemed,
  r.amount_euro,
  r.status,
  r.requested_at,
  r.payment_details,
  u.name as user_name,
  u.email as user_email,
  u.phone as user_phone
FROM redemptions r
JOIN users u ON r.user_id = u.id
WHERE r.status = 'pending'
ORDER BY r.requested_at DESC;

-- Ver estatísticas de resgates por status
SELECT 
  status,
  COUNT(*) as total,
  SUM(amount_euro) as total_amount,
  AVG(amount_euro) as avg_amount
FROM redemptions
GROUP BY status;

-- Ver total pago este mês
SELECT 
  COUNT(*) as total_resgates,
  SUM(amount_euro) as total_pago
FROM redemptions
WHERE status = 'paid'
  AND DATE_TRUNC('month', processed_at) = DATE_TRUNC('month', CURRENT_DATE);

-- Ver utilizadores com mais resgates
SELECT 
  u.name,
  u.email,
  COUNT(r.id) as total_resgates,
  SUM(r.amount_euro) as total_resgatado
FROM users u
JOIN redemptions r ON u.id = r.user_id
WHERE r.status = 'paid'
GROUP BY u.id, u.name, u.email
ORDER BY total_resgatado DESC
LIMIT 10;

-- ====================================================================
-- ATUALIZAR UTILIZADOR EXISTENTE PARA ADMIN
-- ====================================================================
-- Se já tens uma conta e queres torná-la admin:

-- UPDATE users
-- SET is_admin = TRUE
-- WHERE email = 'teu-email@exemplo.com';

-- ====================================================================
-- REMOVER PRIVILÉGIOS DE ADMIN
-- ====================================================================
-- Para remover permissões de admin de um utilizador:

-- UPDATE users
-- SET is_admin = FALSE
-- WHERE email = 'email-do-utilizador@exemplo.com';

-- ====================================================================
-- POLÍTICA RLS (Row Level Security) - OPCIONAL
-- ====================================================================
-- Se quiseres adicionar segurança extra, podes criar políticas RLS
-- que apenas permitam admins a aceder a certas operações

-- Exemplo: Apenas admins podem atualizar status de redemptions
-- (Descomentado por padrão - adiciona se necessário)

/*
CREATE POLICY admin_update_redemptions ON redemptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );
*/
