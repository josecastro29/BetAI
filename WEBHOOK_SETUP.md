# ============================================
# INSTRUÇÕES PARA CONFIGURAR STRIPE WEBHOOKS
# ============================================

## 🚀 PASSOS A SEGUIR

### ✅ **JÁ FEITO (por mim):**
1. ✅ Código do webhook criado (`webhook-stripe.js`)
2. ✅ Configuração Vercel criada (`vercel.json`)
3. ✅ Lógica de atualização de subscrições
4. ✅ Sistema automático de pontos
5. ✅ Atualização de status de referências

---

### ⚠️ **PRECISAS FAZER (no Stripe e Vercel):**

## 📝 PASSO 1: OBTER CHAVES DO STRIPE

1. Vai ao [Stripe Dashboard](https://dashboard.stripe.com/)
2. **Modo de Teste:**
   - Clica no switch "Modo de teste" (topo direito)
   - Vai para: Developers → API keys
   - Copia:
     - **Secret key** (começa com `sk_test_...`)
     - **Publishable key** (começa com `pk_test_...`)

3. **Modo de Produção:**
   - Desliga "Modo de teste"
   - Vai para: Developers → API keys
   - Copia:
     - **Secret key** (começa com `sk_live_...`)
     - **Publishable key** (começa com `pk_live_...`)

---

## 📝 PASSO 2: HOSPEDAR O WEBHOOK (OPÇÃO A - VERCEL)

### **Instalar Vercel CLI:**
```bash
npm install -g vercel
```

### **Fazer Deploy:**
```bash
cd C:\Users\josem\OneDrive\Documentos\GitHub\BetAI
vercel login
vercel --prod
```

### **Configurar Variáveis de Ambiente na Vercel:**

1. Vai para [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleciona o projeto BetAI
3. Settings → Environment Variables
4. Adiciona:

```
STRIPE_SECRET_KEY = sk_test_... (ou sk_live_...)
STRIPE_WEBHOOK_SECRET = whsec_... (vais obter no passo 3)
SUPABASE_URL = https://wthelmchpyzgkmuvibhl.supabase.co
SUPABASE_SERVICE_KEY = (vai ao Supabase → Settings → API → service_role key)
```

### **URL do Webhook:**
Após deploy, a Vercel vai dar-te um URL tipo:
```
https://betai-xyz.vercel.app/api/webhook/stripe
```

---

## 📝 PASSO 3: CONFIGURAR WEBHOOK NO STRIPE

1. Vai ao [Stripe Dashboard](https://dashboard.stripe.com/)
2. Developers → Webhooks
3. Clica "Add endpoint"
4. **Endpoint URL:** `https://betai-xyz.vercel.app/api/webhook/stripe`
5. **Events to send:** Seleciona:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
6. Clica "Add endpoint"
7. **COPIA O SIGNING SECRET** (`whsec_...`)
8. Volta para Vercel e adiciona como `STRIPE_WEBHOOK_SECRET`

---

## 📝 PASSO 4: ATUALIZAR PAYMENT LINKS (IMPORTANTE!)

### **Problema Atual:**
Os Payment Links atuais são "standalone" - não capturam email do utilizador.

### **Solução:**

#### **Opção A - Stripe Checkout (Recomendado):**
Criar sessões de checkout dinâmicas que incluem email:

```javascript
// Em vez de Payment Links diretos, usar Checkout Sessions
const response = await fetch('/api/create-checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: user.email,
    plan: 'monthly' // ou 'yearly'
  })
});
const { url } = await response.json();
window.location.href = url;
```

#### **Opção B - Adicionar Email aos Payment Links:**
1. No Stripe Dashboard
2. Payment Links → Edita os links existentes
3. "Collect customer information" → ✅ Email address
4. Guarda

---

## 📝 PASSO 5: ADICIONAR COLUNA STRIPE_CUSTOMER_ID

No Supabase SQL Editor, executa:

```sql
-- Adicionar coluna para ID do customer do Stripe
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer 
ON users(stripe_customer_id);
```

---

## 📝 PASSO 6: TESTAR O WEBHOOK

### **Teste Local (Stripe CLI):**
```bash
# Instalar Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Encaminhar webhooks para localhost
stripe listen --forward-to https://betai-xyz.vercel.app/api/webhook/stripe

# Testar evento
stripe trigger checkout.session.completed
```

### **Teste Real:**
1. Faz um pagamento de teste com card `4242 4242 4242 4242`
2. Verifica no Stripe Dashboard → Webhooks se evento foi enviado
3. Verifica no Supabase se subscrição foi atualizada
4. Verifica se pontos foram concedidos

---

## 🔍 VERIFICAR SE FUNCIONOU

### **No Stripe:**
- Dashboard → Webhooks → Ver eventos
- Deve mostrar "succeeded" com código 200

### **No Supabase:**
```sql
-- Ver subscrições ativas
SELECT email, subscribed, sub_until, plan_type 
FROM users 
WHERE subscribed = true;

-- Ver pontos atribuídos
SELECT u.email, rp.points, rp.total_earned
FROM users u
JOIN referral_points rp ON u.id = rp.user_id;

-- Ver referências completadas
SELECT * FROM referrals WHERE status = 'completed';
```

---

## ⚡ ALTERNATIVA MAIS SIMPLES (SEM SERVIDOR)

Se não quiseres usar Vercel, podes usar **Supabase Edge Functions**:

1. Cria função no Supabase
2. Configura webhook do Stripe para apontar lá
3. Código similar mas usando Deno em vez de Node.js

Queres que crie essa versão também?

---

## 📊 RESUMO DO QUE O WEBHOOK FAZ

### **Quando alguém paga:**
1. ✅ Ativa subscrição automaticamente
2. ✅ Define data de renovação (1 mês ou 1 ano)
3. ✅ Concede +8 pts (mensal) ou +12 pts (anual) ao utilizador
4. ✅ Se foi referido, concede +6 pts (mensal) ou +10 pts (anual) ao referrer
5. ✅ Atualiza status da referência: `pending` → `completed`

### **Quando subscrição renova:**
1. ✅ Atualiza data de sub_until
2. ✅ Mantém subscrição ativa

### **Quando subscrição é cancelada:**
1. ✅ Define cancelled_at
2. ✅ Mantém subscribed=true até sub_until

### **Quando pagamento falha:**
1. ✅ Log do erro (podes adicionar email notification)

---

## 🆘 PRECISO DE AJUDA?

Diz-me em qual passo tens dúvidas:
- [ ] Obter chaves do Stripe
- [ ] Deploy na Vercel
- [ ] Configurar webhook no Stripe
- [ ] Testar pagamento
- [ ] Verificar se funciona

Posso fazer uma call/partilha de ecrã se preferires! 🚀
