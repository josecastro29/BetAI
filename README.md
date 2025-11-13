# 🎯 BetAI - Planeador Inteligente de Apostas

Sistema de recomendações personalizadas para apostas desportivas baseado em IA.

## ⚠️ IMPORTANTE - ESTADO DO PROJETO

**Este é um protótipo em desenvolvimento ativo.**

### 🔒 Segurança Atual

Este projeto está em **fase de desenvolvimento** e utiliza:
- ✅ Stripe Payment Links (seguros e públicos)
- ⚠️ Autenticação localStorage (apenas para desenvolvimento)
- ⚠️ Validação client-side (temporária)

### ❌ NÃO USAR EM PRODUÇÃO sem implementar:

1. **Backend seguro** (Node.js/Python/PHP)
2. **Base de dados** (PostgreSQL/MySQL/MongoDB)
3. **Autenticação JWT** ou OAuth
4. **Validação server-side** de subscrições
5. **Stripe Webhooks** para pagamentos reais
6. **HTTPS** obrigatório
7. **Rate limiting** e proteção DDoS
8. **Encriptação** de dados sensíveis

## 🚀 Funcionalidades

### ✅ Implementadas
- 📝 Questionário detalhado (20+ critérios)
- 🤖 Recomendações personalizadas por IA
- 💰 Sistema de subscrição (Mensal/Anual)
- 📊 Gerador de stakes (Kelly Criterion)
- 🎯 Análise de perfil de risco
- 🛡️ Regras de gestão de bankroll
- 🧠 Alertas psicológicos
- ❌ Cancelamento de subscrição

### 🔜 Em Desenvolvimento
- 🎮 Sistema de pontos/referral gamificado
- 📈 Dashboard de estatísticas
- 🏆 Sistema de badges e conquistas
- 📱 Notificações push
- 🔐 Backend seguro com API REST

## 🛠️ Instalação Local

```bash
# Clone o repositório
git clone https://github.com/josecastro29/BetAI.git

# Entre na pasta
cd BetAI

# Abra o index.html no navegador
# Ou use um servidor local:
python -m http.server 8000
# Acesse: http://localhost:8000
```

## 📝 Estrutura do Projeto

```
BetAI/
├── index.html          # Interface principal
├── style.css           # Estilos
├── app.js              # Lógica da aplicação
├── README.md           # Este ficheiro
└── .gitignore          # Ficheiros ignorados pelo Git
```

## 🔐 Segurança

### Links de Pagamento Stripe (PÚBLICOS - OK)
```javascript
// ✅ Estes links são seguros e podem ser públicos
monthly: 'https://buy.stripe.com/dRm00j9HSgAR1Tx5xK8EM02'
yearly: 'https://buy.stripe.com/5kQ3cv6vG0BTcybaS48EM01'
```

### ⚠️ Avisos de Segurança para Produção

**LocalStorage atual** (desenvolvimento):
```javascript
// ❌ TEMPORÁRIO - Não usar em produção
localStorage.setItem('betai_users', JSON.stringify(users));
```

**Deve ser substituído por** (produção):
```javascript
// ✅ Backend com JWT
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})
.then(res => res.json())
.then(data => {
  // Token JWT seguro (httpOnly cookie)
  sessionStorage.setItem('token', data.token);
});
```

## 📧 Contacto

**Email:** zizucastro2004@gmail.com

Para questões, sugestões ou reportar problemas.

## 📄 Licença

Este projeto está em desenvolvimento privado.
© 2025 BetAI - Todos os direitos reservados.

## 🚨 Disclaimer Legal

⚠️ **AVISO IMPORTANTE:**

1. Esta ferramenta é **meramente informativa e educacional**
2. **NÃO garante resultados** nas apostas
3. Apostas envolvem **risco de perda total** do capital
4. **Não somos consultores financeiros**
5. Aposte apenas o que pode perder
6. **Jogo responsável:** Se tens problemas com jogo, procura ajuda
   - 🇵🇹 Linha Vida: 1414
   - 🇵🇹 SICAD: linha.apoio@sicad.pt

## 🎯 Roadmap

### Fase 1 - MVP (Atual) ✅
- [x] Interface básica
- [x] Questionário completo
- [x] Sistema de recomendações
- [x] Integração Stripe
- [x] Cancelamento de subscrição

### Fase 2 - Backend (Em breve)
- [ ] API REST segura
- [ ] Base de dados PostgreSQL
- [ ] Autenticação JWT
- [ ] Stripe Webhooks
- [ ] Sistema de logs

### Fase 3 - Gamificação
- [ ] Sistema de pontos
- [ ] Programa de referral
- [ ] Badges e conquistas
- [ ] Leaderboards
- [ ] Notificações

### Fase 4 - Funcionalidades Avançadas
- [ ] Histórico de apostas
- [ ] Estatísticas personalizadas
- [ ] Comparador de odds
- [ ] Alertas de value bets
- [ ] App mobile

---

**Desenvolvido com ❤️ por José Castro**
