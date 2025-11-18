-- ============================================
-- ADICIONAR CAMPO is_admin À TABELA USERS
-- ============================================
-- Execute este SQL no Supabase SQL Editor

-- Adicionar coluna is_admin (default false)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- ============================================
-- DEFINIR ADMIN(S)
-- ============================================
-- Substitui 'teu-email@gmail.com' pelo teu email de admin

-- Método 1: Por email
UPDATE users 
SET is_admin = true 
WHERE email = 'teu-email@gmail.com';

-- Método 2: Por ID (se souberes o ID)
-- UPDATE users 
-- SET is_admin = true 
-- WHERE id = 'uuid-do-admin-aqui';

-- ============================================
-- VERIFICAR ADMINS
-- ============================================
-- Listar todos os admins

SELECT 
  id,
  name,
  email,
  is_admin,
  created_at
FROM users
WHERE is_admin = true;

-- ============================================
-- POLICY PARA PERMITIR ADMINS LEREM TUDO
-- ============================================
-- Permite que admins vejam todos os utilizadores

DROP POLICY IF EXISTS "Admins can read all users" ON users;

CREATE POLICY "Admins can read all users" ON users
FOR SELECT
TO authenticated
USING (
  is_admin = true OR auth.uid() = id
);

-- ============================================
-- NOTAS
-- ============================================
-- Depois de executar este SQL:
-- 1. Certifica-te que atualizaste o email do admin
-- 2. Verifica se o campo is_admin = true no utilizador correto
-- 3. Faz login no site e deverás ser redirecionado para admin.html
