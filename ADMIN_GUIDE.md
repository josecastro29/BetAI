# 🎯 Painel de Administração - BetAI

Sistema manual de gestão de resgates de pontos.

---

## 📋 O Que Foi Implementado

✅ **Painel de administração completo** em `admin.html`  
✅ **Login protegido** com email + password  
✅ **Dashboard** com estatísticas em tempo real  
✅ **Gestão de resgates:** Aprovar, Rejeitar, Marcar como Pago  
✅ **Filtros** por status (pendente, aprovado, pago, rejeitado)  
✅ **Auto-refresh** a cada 30 segundos  
✅ **Design responsivo** e profissional  

---

## 🚀 Como Configurar

### **Passo 1: Executar SQL no Supabase**

1. Vai ao Supabase SQL Editor: https://supabase.com/dashboard/project/wthelmchpyzgkmuvibhl/sql
2. Copia e cola o conteúdo de `admin_setup.sql`
3. **⚠️ IMPORTANTE:** Antes de executar, **muda o email e a password do admin!**

```sql
-- Linha 41-42 do admin_setup.sql
'admin@betai.com',  -- ⚠️ MUDA para o teu email
'$2a$10$...',       -- ⚠️ MUDA a password (vê instruções abaixo)
```

4. Clica em **"Run"**

---

### **Passo 2: Gerar Password Hash**

A password precisa estar em formato bcrypt. Usa este código JavaScript:

```javascript
// Abre a consola do browser (F12) e cola isto:
const bcrypt = dcodeIO.bcrypt;
const password = "MinhaPasswordSegura123!";
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
```

Copia o hash que aparece e substitui na linha 42 do SQL.

**OU** usa este site (100% client-side, seguro):
https://bcrypt-generator.com/

---

### **Passo 3: Aceder ao Painel**

1. Abre: `admin.html` no browser ou faz deploy no GitHub Pages
2. **URL de produção:** https://josecastro29.github.io/BetAI/admin.html
3. Login com o email e password que configuraste

---

## 💼 Como Usar o Painel

### **📊 Dashboard**

Ao fazer login, vês:
- **Total de resgates**
- **Pendentes** (a aguardar tua aprovação)
- **Aprovados** (aprovados mas ainda não pagos)
- **Pagos** (transferências concluídas)
- **Rejeitados**
- **Total pago** em euros

### **⏳ Processar Resgate Pendente**

1. Clica no filtro **"Pendentes"**
2. Vê os detalhes: utilizador, pontos, IBAN, valor
3. Clica em **"✅ Aprovar"** ou **"❌ Rejeitar"**
   - **Aprovar:** Resgate passa para status "aprovado"
   - **Rejeitar:** Pontos são devolvidos ao utilizador

### **💰 Marcar Como Pago**

1. Clica no filtro **"Aprovados"**
2. **FAZ A TRANSFERÊNCIA BANCÁRIA** manualmente para o IBAN do cliente
3. Clica em **"💰 Marcar Pago"**
4. O resgate fica marcado como concluído

### **🔍 Filtros Disponíveis**

- **Todos:** Mostra todos os resgates
- **Pendentes:** Aguardam tua aprovação
- **Aprovados:** Aprovados mas ainda não pagos
- **Pagos:** Transferências concluídas
- **Rejeitados:** Resgates rejeitados

---

## 🔐 Segurança

### **Quem Tem Acesso?**

Apenas utilizadores com `is_admin = TRUE` na base de dados podem fazer login.

### **Como Adicionar Mais Admins?**

```sql
UPDATE users
SET is_admin = TRUE
WHERE email = 'email-do-novo-admin@exemplo.com';
```

### **Como Remover Admin?**

```sql
UPDATE users
SET is_admin = FALSE
WHERE email = 'email-do-ex-admin@exemplo.com';
```

### **Proteger a Página Admin**

⚠️ **IMPORTANTE:** O ficheiro `admin.html` é público!

Para proteger:
1. **Opção 1:** Não partilhes o URL `admin.html` com ninguém
2. **Opção 2:** Adiciona autenticação adicional (IP whitelist, VPN)
3. **Opção 3:** Hospeda numa pasta privada (ex: `/admin/` com .htaccess)

---

## 📊 Queries Úteis

### **Ver Todos os Resgates Pendentes**

```sql
SELECT 
  r.id,
  u.name,
  u.email,
  r.points_redeemed,
  r.amount_euro,
  r.payment_details->>'iban' as iban,
  r.requested_at
FROM redemptions r
JOIN users u ON r.user_id = u.id
WHERE r.status = 'pending'
ORDER BY r.requested_at DESC;
```

### **Total Pago Este Mês**

```sql
SELECT 
  COUNT(*) as total_resgates,
  SUM(amount_euro) as total_pago
FROM redemptions
WHERE status = 'paid'
  AND DATE_TRUNC('month', processed_at) = DATE_TRUNC('month', CURRENT_DATE);
```

### **Top 10 Utilizadores**

```sql
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
```

---

## 🔄 Fluxo Completo de Resgate

```
1. CLIENTE (site):
   └─ Pede resgate de 20 pontos → €5
   
2. SISTEMA:
   └─ Cria registo com status "pending"
   └─ Debita 20 pontos do cliente
   
3. TU (admin.html):
   └─ Vê pedido no painel
   └─ Clica "✅ Aprovar"
   
4. TU (manualmente):
   └─ Faz transferência bancária para IBAN do cliente
   
5. TU (admin.html):
   └─ Clica "💰 Marcar Pago"
   
6. SISTEMA:
   └─ Status muda para "paid"
   └─ Cliente pode ver histórico atualizado
```

---

## 🛠️ Troubleshooting

### **"Email ou palavra-passe incorretos"**
- Verifica se executaste o SQL `admin_setup.sql`
- Confirma que usaste o email e password corretos
- Verifica se a password hash foi gerada corretamente

### **"Erro ao carregar dados"**
- Verifica a consola do browser (F12)
- Confirma que o ficheiro `config.js` está correto
- Verifica se o Supabase está acessível

### **Botões não funcionam**
- Abre a consola (F12) e vê erros
- Confirma que a função `process_redemption` existe no Supabase
- Verifica se tens permissões na base de dados

---

## 📞 Suporte

Se tiveres problemas:
1. Verifica logs no browser (F12 → Console)
2. Verifica SQL Editor do Supabase por erros
3. Confirma que todas as tabelas e funções existem

---

## ✅ Checklist de Configuração

- [ ] Executei `admin_setup.sql` no Supabase
- [ ] Mudei email e password do admin no SQL
- [ ] Gerei password hash com bcrypt
- [ ] Acedi a `admin.html` com sucesso
- [ ] Testei aprovar um resgate
- [ ] Testei marcar como pago
- [ ] Testei rejeitar um resgate

---

🎉 **Sistema pronto!** Agora podes gerir os resgates manualmente de forma profissional!
