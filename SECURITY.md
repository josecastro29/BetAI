# 🔒 Política de Segurança

## 🚨 Estado Atual de Segurança

Este projeto está em **FASE DE DESENVOLVIMENTO** e utiliza práticas temporárias que **NÃO são adequadas para produção**.

## ⚠️ Vulnerabilidades Conhecidas (Temporárias)

### 1. Autenticação localStorage

**Status:** ❌ INSEGURO para produção (OK para desenvolvimento)

**Problema:**
```javascript
// ❌ Password em texto claro no localStorage
localStorage.setItem('betai_users', JSON.stringify({
  email: 'user@email.com',
  pass: 'senha123' // Facilmente acessível via DevTools
}));
```

**Risco:**
- Qualquer pessoa pode abrir DevTools (F12)
- Editar `localStorage` diretamente
- Aceder a contas alheias
- Ver passwords

**Solução para Produção:**
```javascript
// ✅ Backend com hash bcrypt + JWT
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Hash password antes de guardar
const hash = await bcrypt.hash(password, 10);

// Gerar token JWT
const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
  expiresIn: '7d'
});

// Enviar token em httpOnly cookie (não acessível via JavaScript)
res.cookie('token', token, { httpOnly: true, secure: true });
```

### 2. Validação Client-Side

**Status:** ❌ INSEGURO para produção

**Problema:**
```javascript
// ❌ Validação apenas no browser
function isSubscribed(user) {
  return user?.subUntil > Date.now();
}

// User pode fazer:
// 1. Abrir DevTools
// 2. Executar: localStorage.setItem('betai_current', 'fake@email.com')
// 3. Criar user fake com subscribed: true
// 4. Acesso premium grátis
```

**Solução para Produção:**
```javascript
// ✅ Validação server-side
app.get('/api/recommendations', authenticateJWT, async (req, res) => {
  const user = await db.users.findById(req.userId);
  
  // Validar no backend
  if (!user.subscribed || new Date(user.subUntil) < new Date()) {
    return res.status(403).json({ error: 'Subscription required' });
  }
  
  // Gerar recomendações
  const recommendations = generateRecommendations(req.body);
  res.json(recommendations);
});
```

### 3. Dados Sensíveis Expostos

**Status:** ⚠️ BAIXO RISCO (mas deve ser melhorado)

**Problema:**
- Toda lógica de negócio visível (app.js)
- Algoritmos de recomendação expostos
- Fácil de copiar/replicar

**Solução:**
```javascript
// ✅ Lógica crítica no backend
// Frontend apenas envia dados e recebe resultados
const response = await fetch('/api/generate-recommendations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(surveyData)
});
```

## ✅ O que ESTÁ Seguro

### 1. Stripe Payment Links

**Status:** ✅ SEGURO

```javascript
// ✅ Links públicos oficiais do Stripe
const stripeLinks = {
  monthly: 'https://buy.stripe.com/dRm00j9HSgAR1Tx5xK8EM02',
  yearly: 'https://buy.stripe.com/5kQ3cv6vG0BTcybaS48EM01'
};
```

**Por que é seguro:**
- Stripe processa pagamentos (PCI-DSS compliant)
- Nenhum dado de cartão passa pelo nosso código
- Links podem ser públicos sem risco
- Stripe gerencia tokens e segurança

**NOTA:** Precisa de webhooks para validação server-side!

### 2. HTML/CSS Públicos

**Status:** ✅ NORMAL

- HTML e CSS são sempre públicos
- Não contêm dados sensíveis
- Normal em qualquer website

## 🛡️ Checklist para Produção

### Fase 1 - Urgente (Antes do Lançamento)

- [ ] Implementar backend (Node.js/Python)
- [ ] Base de dados (PostgreSQL/MySQL)
- [ ] Hash de passwords (bcrypt)
- [ ] Autenticação JWT
- [ ] Validação server-side de subscrições
- [ ] Stripe Webhooks
- [ ] HTTPS obrigatório
- [ ] Variáveis de ambiente (.env)

### Fase 2 - Importante (Primeiros 30 dias)

- [ ] Rate limiting (evitar brute force)
- [ ] CORS configurado corretamente
- [ ] Input sanitization (XSS prevention)
- [ ] SQL injection prevention (prepared statements)
- [ ] Logs de segurança
- [ ] Monitoring (Sentry/LogRocket)
- [ ] Backup automático da database
- [ ] 2FA opcional para utilizadores

### Fase 3 - Recomendado (3-6 meses)

- [ ] Auditoria de segurança profissional
- [ ] Penetration testing
- [ ] GDPR compliance completo
- [ ] Política de privacidade legal
- [ ] Termos de serviço
- [ ] Bug bounty program
- [ ] Certificações de segurança

## 📞 Reportar Vulnerabilidades

Se encontrares vulnerabilidades de segurança, por favor **NÃO** criar issues públicas.

**Contacta diretamente:**
- Email: zizucastro2004@gmail.com
- Assunto: "[SECURITY] Vulnerabilidade em BetAI"

Responderemos em 48h e daremos crédito pela descoberta (se desejado).

## 🔐 Boas Práticas Implementadas (Parcial)

- ✅ Stripe Payment Links (seguro)
- ✅ Avisos de desenvolvimento no código
- ✅ .gitignore configurado
- ✅ README com disclaimers
- ⚠️ Validação client-side (temporário)
- ❌ Backend seguro (ainda não implementado)

## 📚 Recursos de Segurança

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Stripe Security Best Practices](https://stripe.com/docs/security)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)

---

**Última atualização:** 13 Novembro 2025
**Versão:** 0.1.0 (Desenvolvimento)
