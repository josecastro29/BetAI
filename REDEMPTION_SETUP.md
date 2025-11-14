# 💰 Sistema de Resgate de Pontos - Guia de Implementação

## ✅ O Que Foi Implementado

### 1. **Base de Dados (SQL)**
- ✅ Tabela `redemptions` criada
- ✅ Função `request_redemption()` para criar pedidos
- ✅ Função `process_redemption()` para aprovação/rejeição (admin)
- ✅ RLS (Row-Level Security) policies configuradas
- ✅ Validações automáticas de pontos disponíveis
- ✅ Sistema de reembolso em caso de rejeição

### 2. **Interface do Utilizador**
- ✅ Botões de resgate (20, 50, 100 pontos) com bónus progressivos
- ✅ Formulário de seleção de método de pagamento
  - 📱 MB WAY (telemóvel)
  - 💳 PayPal (email)
  - 🏦 Transferência Bancária (IBAN + nome titular)
- ✅ Histórico de resgates com estados visuais
- ✅ Sistema de validação de dados

### 3. **Lógica de Negócio**
- ✅ Conversão de pontos em euros com bónus:
  - 20 pontos = 5€ (0.25€/ponto)
  - 50 pontos = 15€ (0.30€/ponto) — **+20% bónus**
  - 100 pontos = 35€ (0.35€/ponto) — **+40% bónus**
- ✅ Dedução imediata de pontos ao pedir resgate
- ✅ Reembolso automático se rejeitado
- ✅ Estados: `pending`, `approved`, `paid`, `rejected`

---

## 📋 Passos Para Ativar

### **Passo 1: Executar SQL no Supabase**

1. Vai a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleciona o teu projeto **BetAI**
3. Clica em **SQL Editor** (menu lateral esquerdo)
4. Clica em **+ New Query**
5. **COPIA TODO O CONTEÚDO** do ficheiro `supabase_setup_complete.sql`
6. **COLA** no editor SQL
7. Clica em **Run** (ou pressiona `Ctrl+Enter`)
8. ✅ Deves ver mensagem de sucesso!

### **Passo 2: Fazer Deploy das Alterações**

#### Opção A: Via Git (Recomendado)
```bash
git add .
git commit -m "feat: Sistema de resgate de pontos implementado"
git push origin main
```

#### Opção B: Reenviar Ficheiros Manualmente
- Faz upload dos ficheiros atualizados:
  - `index.html`
  - `app.js`
  - `style.css`
  - `supabase_setup_complete.sql`

### **Passo 3: Testar o Sistema**

1. **Login** na aplicação
2. Vai à aba **🎁 Missões**
3. Ganha alguns pontos (preenche questionário ou usa código de referral)
4. Clica num dos botões de resgate (20, 50 ou 100 pontos)
5. Seleciona método de pagamento
6. Preenche os dados (telemóvel, email ou IBAN)
7. Clica em **Confirmar Resgate**
8. ✅ Deverás ver mensagem de sucesso!

### **Passo 4: Verificar no Supabase**

1. Vai a **Table Editor** no Supabase
2. Seleciona a tabela **redemptions**
3. Deverás ver o teu pedido com `status = pending`
4. Vai a **referral_points**
5. Os pontos foram debitados automaticamente!

---

## 🔧 Como Processar Resgates (ADMIN)

### **Método Manual (Supabase Dashboard)**

1. Vai a **Table Editor** → **redemptions**
2. Encontra o pedido com `status = pending`
3. Vê os detalhes de pagamento em `payment_details`:
   - **MB WAY**: `{"phone": "912345678"}`
   - **PayPal**: `{"email": "user@example.com"}`
   - **Transferência**: `{"iban": "PT50...", "accountName": "Nome"}`
4. **Efetua o pagamento manualmente** usando esses dados
5. Clica na linha do resgate
6. Muda `status` para:
   - `approved` — aprovado (mas ainda não pago)
   - `paid` — pago (dinheiro transferido)
   - `rejected` — rejeitado (pontos reembolsados)
7. Adiciona `admin_notes` (opcional) como: `"Pago via MB WAY às 14:30"`
8. Atualiza `processed_at` para a data/hora atual

### **Método Automático (Função SQL)**

```sql
-- Aprovar e marcar como pago
SELECT process_redemption(
  'REDEMPTION_ID_AQUI', -- ID do resgate
  'paid',               -- Novo status
  'Transferência MB WAY concluída'  -- Nota admin (opcional)
);

-- Rejeitar (pontos são reembolsados automaticamente)
SELECT process_redemption(
  'REDEMPTION_ID_AQUI',
  'rejected',
  'NIF não corresponde ao titular da conta'
);
```

---

## 🎯 Fluxo Completo do Sistema

```
1. UTILIZADOR PEDE RESGATE
   └─ Seleciona 20/50/100 pontos
   └─ Escolhe método (MB WAY/PayPal/Transferência)
   └─ Preenche dados de pagamento
   └─ Clica "Confirmar Resgate"

2. SISTEMA PROCESSA (AUTOMÁTICO)
   └─ Valida se tem pontos suficientes
   └─ Cria registo na tabela redemptions (status: pending)
   └─ DEBITA pontos imediatamente
   └─ Mostra mensagem de sucesso

3. ADMIN PROCESSA (MANUAL - ATÉ 48H)
   └─ Vê pedido no Supabase
   └─ Efetua pagamento via MB WAY/PayPal/Transferência
   └─ Muda status para "paid"
   └─ OU rejeita (sistema reembolsa pontos automaticamente)

4. UTILIZADOR VÊ HISTÓRICO
   └─ Estado atualizado em tempo real
   └─ Notas do admin (se houver)
   └─ Data de processamento
```

---

## 🛡️ Segurança e Validações

### ✅ O Que Está Protegido

- [x] **Validação de pontos**: Só pode resgatar se tiver saldo
- [x] **Dedução imediata**: Evita resgates duplicados
- [x] **Reembolso automático**: Pontos devolvidos se rejeitado
- [x] **Validação de dados**:
  - MB WAY: 9 dígitos começando em 91/92/93/96
  - PayPal: formato de email válido
  - IBAN: PT50 + 21 dígitos
- [x] **RLS (Row-Level Security)**: Só vê os próprios resgates
- [x] **Valores fixos**: Só 20, 50 ou 100 pontos (não pode hackear)
- [x] **Histórico completo**: Tracking de todas as operações

### ⚠️ Pontos de Atenção

- **Processamento manual**: Por agora, tens de pagar manualmente via MB WAY/PayPal/Transferência
- **Prazo de 48h**: Compromisso com o utilizador
- **Verificação de identidade**: Recomenda-se verificar NIF antes de pagar valores grandes
- **Limites**: Podes adicionar limite diário/mensal de resgates (futura feature)

---

## 📊 Queries Úteis para ADMIN

### Ver Todos os Resgates Pendentes
```sql
SELECT 
  u.name,
  u.email,
  u.nif,
  r.points_redeemed,
  r.amount_euro,
  r.payment_method,
  r.payment_details,
  r.requested_at
FROM redemptions r
JOIN users u ON r.user_id = u.id
WHERE r.status = 'pending'
ORDER BY r.requested_at ASC;
```

### Ver Total Pago Por Utilizador
```sql
SELECT 
  u.name,
  u.email,
  COUNT(*) as total_resgates,
  SUM(r.amount_euro) as total_pago
FROM redemptions r
JOIN users u ON r.user_id = u.id
WHERE r.status = 'paid'
GROUP BY u.id, u.name, u.email
ORDER BY total_pago DESC;
```

### Ver Estatísticas Gerais
```sql
SELECT 
  status,
  COUNT(*) as quantidade,
  SUM(points_redeemed) as total_pontos,
  SUM(amount_euro) as total_euros
FROM redemptions
GROUP BY status;
```

---

## 🚀 Próximos Passos (Opcional)

### Funcionalidades Futuras

1. **Dashboard Admin**
   - Painel para aprovar/rejeitar resgates diretamente na app
   - Notificações de novos pedidos
   - Histórico completo com filtros

2. **Automação de Pagamentos**
   - Integração MB WAY API (quando disponível em Portugal)
   - Integração PayPal API para transferências automáticas
   - Webhooks para atualizar status automaticamente

3. **Limites e Regras**
   - Limite máximo de 100€/mês por utilizador
   - Resgates só após 30 dias de conta ativa
   - Verificação obrigatória de NIF para valores >50€

4. **Notificações**
   - Email quando resgate aprovado/rejeitado
   - SMS via Twilio quando pago
   - Notificações push na app

---

## ❓ Troubleshooting

### "Pontos insuficientes"
- Verifica em **referral_points** se o utilizador tem saldo
- Verifica se já não fez resgate recente (pontos já debitados)

### "Erro ao criar resgate"
- Verifica se a função `request_redemption()` existe no Supabase
- Verifica logs de erro no console do navegador
- Confirma que as policies RLS estão corretas

### Pontos não reembolsados após rejeição
- Verifica se usaste a função `process_redemption()`
- Se mudaste status manualmente, precisas reembolsar manualmente:
```sql
UPDATE referral_points
SET points = points + PONTOS_A_REEMBOLSAR,
    total_paid = total_paid - VALOR_EM_EUROS
WHERE user_id = 'USER_ID_AQUI';
```

### Histórico não aparece
- Verifica em F12 (DevTools) → Console se há erros JavaScript
- Confirma que `loadRedemptionHistory()` está a ser chamada
- Verifica policies RLS da tabela `redemptions`

---

## 📞 Suporte

Se encontrares algum problema:
1. Verifica logs do navegador (F12 → Console)
2. Verifica logs do Supabase (Dashboard → Logs)
3. Testa cada passo individualmente
4. Contacta: zizucastro2004@gmail.com

---

## ✅ Checklist Final

Antes de lançar em produção:

- [ ] SQL executado com sucesso no Supabase
- [ ] Testado resgate de 20 pontos (MB WAY)
- [ ] Testado resgate de 50 pontos (PayPal)
- [ ] Testado resgate de 100 pontos (Transferência)
- [ ] Testado rejeição de resgate (reembolso automático)
- [ ] Testado com utilizador sem pontos suficientes
- [ ] Histórico mostra todos os estados corretamente
- [ ] Admin consegue processar pagamentos manualmente
- [ ] Prazo de 48h está claro para utilizadores

---

🎉 **Sistema pronto a usar!** Os teus utilizadores já podem resgatar pontos por dinheiro real!
