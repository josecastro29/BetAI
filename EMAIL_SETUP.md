# 📧 Configuração do Sistema de Emails de Resgate

## 🎯 Objetivo
Enviar um email automático para o administrador sempre que um utilizador solicitar um resgate de pontos.

---

## 📋 O que foi implementado

### ✅ Validação de Pontos
- **Antes de criar o resgate**: Verifica se o utilizador tem pontos suficientes
- **Mensagem clara**: Mostra quantos pontos faltam
- **Atualização automática**: Recarrega a interface se os pontos mudaram

### ✅ Envio de Email
- **Automático**: Envia email assim que o resgate é criado
- **Informações completas**: Nome, email, telefone, IBAN, valor, data
- **Design profissional**: Email HTML formatado e bonito
- **Link direto**: Botão para ir direto ao painel admin

---

## 🔧 Como Configurar

### Opção 1: Gmail (Desenvolvimento Rápido) ⚡

#### Passo 1: Gerar App Password do Gmail
1. Vai a https://myaccount.google.com/apppasswords
2. Faz login na tua conta Gmail
3. Cria uma nova "App Password" com o nome "BetAI Emails"
4. Copia a senha gerada (16 caracteres)

#### Passo 2: Configurar Variáveis no Vercel
1. Vai a https://vercel.com/josecastro29/betai-one/settings/environment-variables
2. Adiciona estas variáveis:

```
GMAIL_USER = teu-email@gmail.com
GMAIL_APP_PASSWORD = xxxx xxxx xxxx xxxx (a senha de 16 chars)
```

3. Clica em "Save"

#### Passo 3: Deploy
```bash
git add .
git commit -m "feat: Sistema de email para resgates"
git push origin main
```

O Vercel vai fazer deploy automaticamente! ✅

---

### Opção 2: Resend (Recomendado para Produção) 🚀

#### Vantagens:
- ✅ **Grátis até 3000 emails/mês**
- ✅ **Domínio próprio** (emails@betai.pt)
- ✅ **99.9% de entrega**
- ✅ **Estatísticas detalhadas**
- ✅ **Sem bloqueios do Gmail**

#### Passo 1: Criar Conta
1. Vai a https://resend.com
2. Cria conta gratuita
3. Verifica o email

#### Passo 2: Obter API Key
1. No dashboard, vai a "API Keys"
2. Clica em "Create API Key"
3. Copia a chave (começa com `re_...`)

#### Passo 3: Configurar Domínio (Opcional)
1. Vai a "Domains"
2. Adiciona `betai.pt` (ou subdomínio `emails.betai.pt`)
3. Adiciona os records DNS que eles fornecem
4. Aguarda verificação (5-10 min)

#### Passo 4: Ativar no Código
No arquivo `api/send-redemption-email.js`:

```javascript
// Descomenta as linhas 62-141 (Opção 1: Usar Resend)
// Comenta as linhas 147-222 (Opção 2: Usar Nodemailer)
```

#### Passo 5: Configurar Variável no Vercel
```
RESEND_API_KEY = re_xxxxxxxxxxxxx
```

#### Passo 6: Instalar Dependência
```bash
npm install resend
```

#### Passo 7: Deploy
```bash
git add .
git commit -m "feat: Integração com Resend para emails"
git push origin main
```

---

## 📧 Como Funciona

### Fluxo Completo:

```
1. Utilizador clica em "Resgatar 20 pontos"
   ↓
2. Sistema verifica se tem pontos suficientes ✅
   ↓ (se sim)
3. Utilizador preenche IBAN e nome da conta
   ↓
4. Clica em "Confirmar Resgate"
   ↓
5. Sistema cria resgate na base de dados
   ↓
6. Sistema envia EMAIL para ti 📧
   ↓
7. Sistema tenta processar pagamento automático (Stripe Payouts)
   ↓
8. Utilizador vê confirmação
   ↓
9. TU recebes email com todos os detalhes!
```

---

## 📨 Exemplo de Email que vais receber

**Assunto:** 🔔 Novo Resgate de Pontos - João Silva (15€)

**Conteúdo:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Novo Resgate de Pontos
BetAI - Sistema de Recompensas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

15€
50 pontos convertidos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Informações do Utilizador
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nome: João Silva
Email: joao@exemplo.pt
Telemóvel: 912 345 678
Data do pedido: 14 de novembro de 2025, 15:30

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 Informações de Pagamento
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IBAN: PT50000123456789012345678
Nome da conta: João Silva
Método: Transferência Bancária

⚠️ Ação necessária:
Acede ao painel de administração para 
processar este resgate.

[🔧 Ir para o Painel Admin]
```

---

## 🧪 Como Testar

### Teste Rápido (sem configurar email):
1. Cria uma conta no site
2. Adiciona pontos manualmente no Supabase
3. Tenta fazer um resgate
4. Verifica os logs no Vercel:
   - https://vercel.com/josecastro29/betai-one/logs

### Teste Completo (com email):
1. Configura as variáveis (Gmail ou Resend)
2. Faz deploy
3. Cria um resgate real
4. Verifica teu email! 📬

---

## 🔍 Monitorização

### Ver Logs no Vercel:
```
https://vercel.com/josecastro29/betai-one/logs
```

Procura por:
- `✅ Email enviado com sucesso para admin`
- `❌ Erro ao enviar email`

### Ver Resgates no Supabase:
```sql
SELECT 
  r.*,
  u.name,
  u.email,
  u.phone
FROM redemptions r
JOIN users u ON r.user_id = u.id
ORDER BY r.requested_at DESC
LIMIT 10;
```

---

## ⚠️ Troubleshooting

### Email não chega?

**Problema 1: Gmail bloqueia**
- Solução: Usa App Password (não a senha normal)
- Ativa "Acesso de apps menos seguras"
- Ou muda para Resend

**Problema 2: Cai no SPAM**
- Solução: Adiciona noreply@betai.pt aos contactos
- Ou usa Resend com domínio verificado

**Problema 3: Erro "Invalid login"**
- Solução: Verifica as variáveis no Vercel
- Confirma que a App Password está correta

**Problema 4: Timeout**
- Solução: Vercel tem limite de 10s para funções
- Usa Resend (mais rápido que Gmail)

---

## 💰 Custos

### Gmail:
- ✅ **Grátis**
- ⚠️ Limite de 500 emails/dia
- ⚠️ Pode cair em spam

### Resend:
- ✅ **Grátis até 3000 emails/mês**
- ✅ **100 emails/dia no plano grátis**
- ✅ Depois: $20/mês para 50k emails

---

## 📞 Suporte

Se tiveres problemas:

1. **Verifica logs**: https://vercel.com/josecastro29/betai-one/logs
2. **Testa manualmente**: `curl -X POST https://betai-one.vercel.app/api/send-redemption-email`
3. **Verifica variáveis**: Todas as env vars estão configuradas?
4. **Re-deploy**: Às vezes só precisa de um novo deploy

---

## ✅ Checklist Final

- [ ] Configurar GMAIL_USER ou RESEND_API_KEY no Vercel
- [ ] Configurar GMAIL_APP_PASSWORD (se usares Gmail)
- [ ] Fazer deploy (`git push`)
- [ ] Testar com resgate real
- [ ] Verificar email recebido
- [ ] Adicionar emails@betai.pt aos contactos (evitar spam)

---

**🎉 Tudo pronto! Agora vais receber um email sempre que alguém pedir um resgate!**
