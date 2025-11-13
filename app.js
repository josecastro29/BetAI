// Lógica simples baseada em regras para gerar recomendações + autenticação/pagamento simulado
const survey = document.getElementById('survey');
const advice = document.getElementById('advice');
const adviceContent = document.getElementById('adviceContent');
const betBuilder = document.getElementById('betBuilder');
const betForm = document.getElementById('betForm');
const betResult = document.getElementById('betResult');
const resetBtn = document.getElementById('resetBtn');
// Auth/payment elements
const openLogin = document.getElementById('openLogin');
const authModal = document.getElementById('authModal');
const closeAuth = document.getElementById('closeAuth');
const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const loginBox = document.getElementById('loginBox');
const signupBox = document.getElementById('signupBox');
const doLogin = document.getElementById('doLogin');
const doSignup = document.getElementById('doSignup');
const accountArea = document.getElementById('accountArea');
const paymentModal = document.getElementById('paymentModal');
const closePayment = document.getElementById('closePayment');
const payBtns = document.getElementsByClassName('payBtn');

function formatEuro(x){return '€'+Number(x).toFixed(2)}

survey.addEventListener('submit', (e)=>{
  e.preventDefault();
  
  // Verificar se o utilizador tem subscrição ativa
  const user = getCurrentUser();
  if (!user || !isSubscribed(user)){
    // Mostrar modal de pagamento se não tiver subscrição
    paymentModal.classList.remove('hidden');
    return;
  }
  
  // Coletar todos os dados do questionário
  const data = {
    // Financeiro
    bankroll: Number(document.getElementById('bankroll').value),
    target: Number(document.getElementById('target').value),
    timeframe: Number(document.getElementById('timeframe').value),
    canReload: document.getElementById('canReload').value,
    goal: document.getElementById('goal').value,
    
    // Histórico
    experience: document.getElementById('experience').value,
    recentBets: Number(document.getElementById('recentBets').value),
    winRate: Number(document.getElementById('winRate').value),
    maxLoss: Number(document.getElementById('maxLoss').value),
    
    // Preferências
    sport: document.getElementById('sport').value,
    betType: document.getElementById('betType').value,
    timing: document.getElementById('timing').value,
    oddsRange: document.getElementById('oddsRange').value,
    markets: document.getElementById('markets').value,
    
    // Disponibilidade
    timePerDay: document.getElementById('timePerDay').value,
    frequency: document.getElementById('frequency').value,
    setLimits: document.getElementById('setLimits').value,
    stopAfterLoss: document.getElementById('stopAfterLoss').value,
    chasing: document.getElementById('chasing').value,
    
    // Conhecimento
    followNews: document.getElementById('followNews').value,
    useStats: document.getElementById('useStats').value,
    concepts: document.getElementById('concepts').value,
    tools: document.getElementById('tools').value,
    
    // Gestão
    risk: document.getElementById('risk').value,
    staking: document.getElementById('staking').value
  };

  // Validação
  if (data.bankroll <=0 || data.target <=0){
    adviceContent.innerHTML = '<p>❌ Introduz valores válidos para bankroll e montante alvo.</p>';
    advice.classList.remove('hidden');
    return;
  }

  // Gerar recomendação personalizada
  const recommendation = generateAdvancedRecommendation(data);
  adviceContent.innerHTML = recommendation;
  advice.classList.remove('hidden');
  betBuilder.classList.remove('hidden');
});

resetBtn.addEventListener('click',()=>{
  survey.reset();
  advice.classList.add('hidden');
  betBuilder.classList.add('hidden');
  betResult.innerHTML = '';
});

// Bet builder: calcula Kelly e percentagem fixa
betForm.addEventListener('submit',(e)=>{
  e.preventDefault();
  const event = document.getElementById('event').value;
  const odds = Number(document.getElementById('odds').value);
  const probPct = Number(document.getElementById('prob').value) / 100.0; // 0..1
  const bankroll = Number(document.getElementById('bankroll').value) || 100;

  if (odds <= 1 || probPct <= 0){
    betResult.innerHTML = '<p>Odds ou probabilidade inválidas.</p>';
    return;
  }

  // Kelly fraction: f* = (bp - q) / b, where b = odds-1, p=prob, q=1-p
  const b = odds - 1;
  const p = probPct;
  const q = 1 - p;
  let kelly = (b * p - q) / b;
  if (kelly < 0) kelly = 0;
  if (kelly > 1) kelly = 1;

  const kellyStake = bankroll * kelly;

  // alternate stake: fraction method from survey
  const risk = document.getElementById('risk').value;
  const fractionPct = risk === 'low' ? 0.005 : risk === 'medium' ? 0.02 : 0.05;
  const fractionStake = Math.max(1, bankroll * fractionPct);

  // flat stake: example equal to fractionStake rounded
  const flatStake = Math.max(1, Math.round(fractionStake));

  betResult.innerHTML = `
    <h4>Resultado para: ${escapeHtml(event)}</h4>
    <p><strong>Odds:</strong> ${odds.toFixed(2)} — <strong>Tua probabilidade:</strong> ${(p*100).toFixed(1)}%</p>
    <p><strong>Kelly fraction:</strong> ${(kelly*100).toFixed(2)}% do bankroll — stake sugerida: <strong>${formatEuro(kellyStake)}</strong></p>
    <p><strong>Percentagem sugerida (com base no risco):</strong> ${(fractionPct*100).toFixed(2)}% do bankroll — stake exemplo: <strong>${formatEuro(fractionStake)}</strong></p>
    <p><strong>Flat stake exemplo:</strong> ${formatEuro(flatStake)}</p>
    <p><em>Notas:</em> A fórmula de Kelly assume que a tua estimativa de probabilidade é correcta. Se não tiveres confiança nas tuas probabilidades, usa percentagem baixa ou flat stakes.</p>
  `;
});

function escapeHtml(s){ return s.replace(/[&<>\"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c];}); }

/* ----------------- Geração de Recomendação Avançada ----------------- */
function generateAdvancedRecommendation(data){
  const lines = [];
  const need = data.target - data.bankroll;
  const roiNeeded = ((need / data.bankroll) * 100).toFixed(1);
  const days = Math.max(1, data.timeframe);
  
  // Header
  lines.push(`<div style="background:rgba(6,182,212,0.1);padding:12px;border-radius:8px;margin-bottom:16px">`);
  lines.push(`<h3 style="margin:0 0 8px 0;color:#06b6d4">🎯 Plano Personalizado de ${days} dias</h3>`);
  lines.push(`<p style="margin:0"><strong>Bankroll:</strong> ${formatEuro(data.bankroll)} → <strong>Alvo:</strong> ${formatEuro(data.target)} (+${roiNeeded}% ROI necessário)</p>`);
  lines.push(`</div>`);
  
  // Análise de viabilidade
  const viability = analyzeViability(data, roiNeeded);
  if (viability.warning){
    lines.push(`<div style="background:rgba(239,68,68,0.1);border-left:3px solid #ef4444;padding:12px;margin-bottom:16px">`);
    lines.push(`<p style="margin:0;color:#fca5a5"><strong>⚠️ Alerta:</strong> ${viability.warning}</p>`);
    lines.push(`</div>`);
  }
  
  // Perfil do apostador
  lines.push(`<h4 style="color:#06b6d4">📊 Teu Perfil</h4>`);
  lines.push(`<ul style="line-height:1.8">`);
  lines.push(`<li><strong>Experiência:</strong> ${getExperienceLabel(data.experience)}</li>`);
  lines.push(`<li><strong>Taxa histórica de sucesso:</strong> ${data.winRate}%${data.winRate < 45 ? ' ⚠️ Abaixo da média' : data.winRate > 55 ? ' ✅ Acima da média' : ''}</li>`);
  lines.push(`<li><strong>Disciplina:</strong> ${getDisciplineScore(data)}</li>`);
  lines.push(`<li><strong>Conhecimento técnico:</strong> ${getTechnicalLevel(data)}</li>`);
  lines.push(`</ul>`);
  
  // Estratégia recomendada
  const strategy = calculateStrategy(data);
  lines.push(`<h4 style="color:#06b6d4">💡 Estratégia Recomendada</h4>`);
  lines.push(`<div style="background:rgba(16,185,129,0.1);padding:12px;border-radius:8px;margin-bottom:12px">`);
  lines.push(`<p style="margin:0 0 8px 0"><strong>Método de stake:</strong> ${strategy.method}</p>`);
  lines.push(`<p style="margin:0 0 8px 0"><strong>Stake base:</strong> ${formatEuro(strategy.baseStake)} (${strategy.stakePct}% do bankroll)</p>`);
  lines.push(`<p style="margin:0 0 8px 0"><strong>Apostas sugeridas:</strong> ${strategy.betsPerWeek} por semana (${strategy.totalBets} no total)</p>`);
  lines.push(`<p style="margin:0"><strong>Mercados recomendados:</strong> ${getMarketRecommendation(data)}</p>`);
  lines.push(`</div>`);
  
  // Plano semanal
  lines.push(`<h4 style="color:#06b6d4">📅 Plano Semanal</h4>`);
  const weeklyPlan = generateWeeklyPlan(data, strategy);
  lines.push(weeklyPlan);
  
  // Regras de gestão de risco
  lines.push(`<h4 style="color:#06b6d4">🛡️ Regras de Gestão de Risco</h4>`);
  const riskRules = generateRiskRules(data, strategy);
  lines.push(riskRules);
  
  // Alertas psicológicos
  if (data.chasing !== 'never' || data.stopAfterLoss !== 'yes'){
    lines.push(`<h4 style="color:#ef4444">🧠 Alertas Psicológicos</h4>`);
    lines.push(`<div style="background:rgba(239,68,68,0.1);padding:12px;border-radius:8px;margin-bottom:12px">`);
    if (data.chasing === 'often'){
      lines.push(`<p style="margin:0 0 8px 0">⚠️ Identificamos tendência para "chase losses" (perseguir perdas). Isto é extremamente perigoso.</p>`);
    }
    if (data.stopAfterLoss !== 'yes'){
      lines.push(`<p style="margin:0">⚠️ Recomendamos fortemente: PARAR após 3 perdas consecutivas. Pausa mínima de 24h.</p>`);
    }
    lines.push(`</div>`);
  }
  
  // Benchmarks e educação
  lines.push(`<h4 style="color:#06b6d4">📚 Educação e Benchmarks</h4>`);
  lines.push(`<ul style="line-height:1.8;color:#cbd5e1">`);
  lines.push(`<li>Apostadores profissionais têm ROI médio de <strong>3-8% ao ano</strong></li>`);
  lines.push(`<li>95% dos apostadores recreativos <strong>perdem dinheiro a longo prazo</strong></li>`);
  lines.push(`<li>Variance (variação) pode causar perdas de 20-30% mesmo com value betting</li>`);
  if (data.concepts === 'none' || data.concepts === 'basic'){
    lines.push(`<li>📖 Recomendado: Aprende sobre <strong>Expected Value (EV)</strong> e <strong>Kelly Criterion</strong></li>`);
  }
  if (data.tools === 'none'){
    lines.push(`<li>🔧 Considera usar comparadores de odds (Oddschecker, Oddsportal) para maximizar value</li>`);
  }
  lines.push(`</ul>`);
  
  // Call to action
  lines.push(`<div style="background:rgba(6,182,212,0.1);padding:12px;border-radius:8px;margin-top:16px">`);
  lines.push(`<p style="margin:0"><strong>Próximo passo:</strong> Usa o "Gerador de apostas" abaixo para calcular stakes específicas para cada evento com base nas odds e tua estimativa de probabilidade.</p>`);
  lines.push(`</div>`);
  
  return lines.join('\n');
}

function analyzeViability(data, roiNeeded){
  const result = {warning: null};
  
  if (roiNeeded > 100 && data.timeframe < 90){
    result.warning = `Teu objetivo de +${roiNeeded}% em ${data.timeframe} dias é extremamente ambicioso e pouco realista. Apostadores profissionais fazem 3-8% ao ano. Considera reduzir para +${Math.min(30, roiNeeded/3).toFixed(0)}% ou aumentar o prazo.`;
  } else if (roiNeeded > 50 && data.timeframe < 30){
    result.warning = `Objetivo de +${roiNeeded}% em ${data.timeframe} dias requer muito risco. Possível mas com alta probabilidade de ruína (perder tudo).`;
  } else if (data.goal === 'primary'){
    result.warning = `Usar apostas como rendimento principal é extremamente arriscado. Apenas 1-2% dos apostadores conseguem isto de forma sustentável.`;
  }
  
  if (data.canReload === 'no' && data.risk === 'high'){
    result.warning = (result.warning ? result.warning + ' ' : '') + 'Risco alto + impossibilidade de repor bankroll = alta probabilidade de perder tudo.';
  }
  
  return result;
}

function getExperienceLabel(exp){
  const labels = {
    none: 'Iniciante (sem experiência)',
    low: 'Baixa (< 6 meses)',
    medium: 'Média (6 meses - 2 anos)',
    high: 'Alta (2+ anos)'
  };
  return labels[exp] || exp;
}

function getDisciplineScore(data){
  let score = 0;
  if (data.setLimits === 'always') score += 2;
  else if (data.setLimits === 'sometimes') score += 1;
  
  if (data.stopAfterLoss === 'yes') score += 2;
  else if (data.stopAfterLoss === 'sometimes') score += 1;
  
  if (data.chasing === 'never') score += 2;
  else if (data.chasing === 'sometimes') score += 1;
  
  if (score >= 5) return '🟢 Excelente';
  if (score >= 3) return '🟡 Boa (mas pode melhorar)';
  return '🔴 Fraca (alto risco de perder por falta de disciplina)';
}

function getTechnicalLevel(data){
  if (data.concepts === 'advanced' && data.useStats === 'advanced') return '🟢 Avançado';
  if (data.concepts === 'basic' && data.useStats !== 'no') return '🟡 Intermediário';
  return '🔴 Básico (recomendado: estudar mais antes de arriscar muito)';
}

function calculateStrategy(data){
  const strategy = {};
  
  // Escolher método baseado em experiência e preferências
  if (data.experience === 'none' || data.concepts === 'none'){
    strategy.method = 'Flat stakes (fixo) — mais simples para iniciantes';
    strategy.stakePct = data.risk === 'low' ? 1 : data.risk === 'medium' ? 2 : 3;
  } else if (data.staking === 'kelly' && data.concepts === 'advanced'){
    strategy.method = 'Kelly Criterion (fracionado a 25-50% para segurança)';
    strategy.stakePct = data.risk === 'low' ? 0.5 : data.risk === 'medium' ? 1 : 2;
  } else {
    strategy.method = 'Percentagem do bankroll (ajustável)';
    strategy.stakePct = data.risk === 'low' ? 1 : data.risk === 'medium' ? 2 : 4;
  }
  
  strategy.baseStake = Math.max(1, data.bankroll * (strategy.stakePct / 100));
  
  // Calcular apostas sugeridas
  const betsPerDay = data.frequency === 'daily' ? (data.timePerDay === 'high' ? 3 : data.timePerDay === 'medium' ? 2 : 1) : 
                     data.frequency === 'weekly' ? 0.5 : 0.3;
  strategy.betsPerWeek = Math.max(1, Math.round(betsPerDay * 7));
  strategy.totalBets = Math.max(1, Math.round(betsPerDay * data.timeframe));
  
  return strategy;
}

function getMarketRecommendation(data){
  const recs = [];
  
  if (data.markets !== 'mixed'){
    const marketNames = {
      result: 'Resultado final (1X2)',
      over: 'Over/Under',
      handicap: 'Handicap asiático',
      btts: 'Ambas marcam'
    };
    recs.push(marketNames[data.markets] || data.markets);
  }
  
  if (data.betType === 'single'){
    recs.push('Apostas simples (recomendado para controlo)');
  } else if (data.betType === 'combo'){
    recs.push('Múltiplas com máximo 3-4 seleções (variance alta)');
  }
  
  if (data.oddsRange === 'low'){
    recs.push('Odds 1.20-1.80 (seguras, menor value)');
  } else if (data.oddsRange === 'medium'){
    recs.push('Odds 1.80-2.50 (equilibradas)');
  } else if (data.oddsRange === 'high'){
    recs.push('Odds 2.50+ (arriscadas, maior variance)');
  }
  
  return recs.join(' • ');
}

function generateWeeklyPlan(data, strategy){
  const lines = [];
  const weeks = Math.ceil(data.timeframe / 7);
  
  lines.push(`<div style="background:rgba(255,255,255,0.02);padding:12px;border-radius:8px">`);
  
  for (let w = 1; w <= Math.min(weeks, 4); w++){
    const weekStake = w === 1 ? strategy.baseStake : strategy.baseStake * (1 + (w-1) * 0.05);
    lines.push(`<p style="margin:4px 0"><strong>Semana ${w}:</strong> ${strategy.betsPerWeek} apostas, stake ${formatEuro(weekStake)}</p>`);
  }
  
  if (weeks > 4){
    lines.push(`<p style="margin:4px 0;color:#9fb4c8"><em>... (continuar padrão similar)</em></p>`);
  }
  
  lines.push(`</div>`);
  return lines.join('\n');
}

function generateRiskRules(data, strategy){
  const lines = [];
  const stopLoss = Math.max(10, strategy.baseStake * 3);
  const maxDailyLoss = data.bankroll * 0.05; // 5% do bankroll
  const withdrawProfit = data.bankroll * 0.3; // retirar aos 30% lucro
  
  lines.push(`<ul style="line-height:1.8">`);
  lines.push(`<li>🛑 <strong>Stop-loss diário:</strong> Máximo ${formatEuro(maxDailyLoss)} de perda por dia</li>`);
  lines.push(`<li>🛑 <strong>Pausa obrigatória:</strong> Após 3 perdas consecutivas, parar 24-48h</li>`);
  lines.push(`<li>📉 <strong>Redução de stake:</strong> Se bankroll cair -20%, reduzir stake para ${formatEuro(strategy.baseStake * 0.7)}</li>`);
  lines.push(`<li>📈 <strong>Levantamento de lucros:</strong> Aos +${formatEuro(withdrawProfit)} lucro, retirar ${formatEuro(withdrawProfit * 0.5)}</li>`);
  lines.push(`<li>📊 <strong>Registo obrigatório:</strong> Anota TODAS as apostas (stake, odds, resultado, ROI)</li>`);
  
  if (data.betType === 'combo'){
    lines.push(`<li>⚠️ <strong>Limite de múltiplas:</strong> Máximo 3-4 seleções por bilhete (odds combinadas < 10.0)</li>`);
  }
  
  lines.push(`</ul>`);
  return lines.join('\n');
}

// Pequeno toque: preencher valores iniciais e mostrar instruções
document.addEventListener('DOMContentLoaded',()=>{
  setupAuthUI();
  // wire payment buttons
  Array.from(payBtns).forEach(btn=>{
    btn.addEventListener('click',()=>{
      const plan = btn.getAttribute('data-plan');
      handlePayment(plan);
    });
  });
  
  // Verificar se o utilizador voltou de um pagamento bem-sucedido
  checkPaymentReturn();
});

/* ----------------- Autenticação simples (localStorage) ----------------- */
function setupAuthUI(){
  // open modal
  openLogin.addEventListener('click',()=>authModal.classList.remove('hidden'));
  closeAuth.addEventListener('click',()=>authModal.classList.add('hidden'));
  tabLogin.addEventListener('click',()=>{loginBox.classList.remove('hidden');signupBox.classList.add('hidden');});
  tabSignup.addEventListener('click',()=>{signupBox.classList.remove('hidden');loginBox.classList.add('hidden');});

  doSignup.addEventListener('click',()=>{
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const pass = document.getElementById('signupPass').value;
    if (!email || !pass){ alert('Introduce email e password válidos.'); return; }
    if (getUser(email)){ alert('Utilizador já existe. Usa Entrar.'); return; }
    const user = {name, email, pass, subscribed:false, subUntil:null, cancelledAt:null, planType:null};
    saveUser(user);
    setCurrentUser(email);
    authModal.classList.add('hidden');
    renderAccount();
    alert('Registo feito. Preenche o questionário para gerar recomendações.');
  });

  doLogin.addEventListener('click',()=>{
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value;
    const u = getUser(email);
    if (!u || u.pass !== pass){ alert('Credenciais inválidas.'); return; }
    setCurrentUser(email);
    authModal.classList.add('hidden');
    renderAccount();
  });

  renderAccount();
}

function getUser(email){
  const raw = localStorage.getItem('betai_users');
  if (!raw) return null;
  const users = JSON.parse(raw);
  return users[email] || null;
}

function saveUser(user){
  const raw = localStorage.getItem('betai_users');
  const users = raw ? JSON.parse(raw) : {};
  users[user.email] = user;
  localStorage.setItem('betai_users', JSON.stringify(users));
}

function setCurrentUser(email){ localStorage.setItem('betai_current', email); }
function getCurrentUser(){ const e = localStorage.getItem('betai_current'); return e ? getUser(e) : null; }

function isSubscribed(user){
  if (!user) return false;
  if (user.subscribed && user.subUntil){
    const until = new Date(user.subUntil);
    return until.getTime() > Date.now();
  }
  return Boolean(user.subscribed);
}

function renderAccount(){
  const u = getCurrentUser();
  accountArea.innerHTML = '';
  if (u){
    const div = document.createElement('div');
    const isSub = isSubscribed(u);
    let statusText = 'Sem subscrição';
    
    if (isSub){
      const until = new Date(u.subUntil);
      const formatted = until.toLocaleDateString('pt-PT');
      
      if (u.cancelledAt){
        statusText = `Ativa até ${formatted} (Cancelada)`;
      } else {
        statusText = `Ativa até ${formatted}`;
      }
    }
    
    div.innerHTML = `<div style="text-align:right"><strong>${escapeHtml(u.name||u.email)}</strong><br><small>${statusText}</small></div>`;
    
    // Botão de gestão de subscrição (se subscrito)
    if (isSub && !u.cancelledAt){
      const btnManage = document.createElement('button');
      btnManage.textContent = 'Gerir Subscrição';
      btnManage.style.marginLeft = '8px';
      btnManage.style.fontSize = '12px';
      btnManage.style.padding = '4px 8px';
      btnManage.addEventListener('click', () => showManageSubscription());
      accountArea.appendChild(btnManage);
    }
    
    const btnLogout = document.createElement('button'); 
    btnLogout.textContent='Sair';
    btnLogout.style.marginLeft='8px';
    btnLogout.addEventListener('click',()=>{ localStorage.removeItem('betai_current'); renderAccount(); });
    accountArea.appendChild(div); 
    accountArea.appendChild(btnLogout);
  } else {
    const btn = document.createElement('button'); btn.id='openLoginBtn'; btn.textContent='Entrar / Registar';
    btn.addEventListener('click',()=>authModal.classList.remove('hidden'));
    accountArea.appendChild(btn);
  }
}

/* ----------------- Gestão de subscrição ----------------- */
function showManageSubscription(){
  const u = getCurrentUser();
  if (!u || !isSubscribed(u)) return;
  
  const until = new Date(u.subUntil);
  const formatted = until.toLocaleDateString('pt-PT', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const planType = u.planType || 'mensal';
  const planName = planType === 'yearly' ? 'Anual' : 'Mensal';
  
  const message = `
Subscrição Ativa

Plano: ${planName}
Ativa até: ${formatted}

Tens a certeza que queres cancelar a subscrição?

⚠️ Importante:
• O cancelamento é imediato e não pode ser revertido
• Continuarás a ter acesso premium até ${formatted}
• Após essa data, os benefícios serão desativados
• Não haverá reembolso do período já pago
• Podes reativar mais tarde se quiseres
  `.trim();
  
  if (confirm(message)){
    cancelSubscription(u);
  }
}

function cancelSubscription(user){
  user.cancelledAt = new Date().toISOString();
  saveUser(user);
  renderAccount();
  
  alert('✓ Subscrição cancelada com sucesso!\n\nContinuas com acesso premium até ' + 
        new Date(user.subUntil).toLocaleDateString('pt-PT') + 
        '\n\nDepois dessa data, os benefícios serão desativados.');
}

/* ----------------- Pagamento simulado ----------------- */
closePayment.addEventListener('click',()=>paymentModal.classList.add('hidden'));

function handlePayment(plan){
  const u = getCurrentUser();
  if (!u){ 
    // Fechar modal de pagamento e abrir modal de registo/login
    paymentModal.classList.add('hidden'); 
    authModal.classList.remove('hidden'); 
    return; 
  }
  
  // Redirecionar para Stripe Checkout com Payment Links
  const stripeLinks = {
    monthly: 'https://buy.stripe.com/dRm00j9HSgAR1Tx5xK8EM02',
    yearly: 'https://buy.stripe.com/5kQ3cv6vG0BTcybaS48EM01'
  };
  
  // Guardar informação do utilizador antes de redirecionar
  localStorage.setItem('betai_pending_payment', JSON.stringify({
    email: u.email,
    plan: plan,
    timestamp: Date.now()
  }));
  
  // Redirecionar para página de pagamento do Stripe
  window.location.href = stripeLinks[plan];
}

function checkPaymentReturn(){
  // Verificar parâmetros URL para confirmar sucesso do pagamento
  const urlParams = new URLSearchParams(window.location.search);
  const paymentSuccess = urlParams.get('payment') === 'success';
  
  if (paymentSuccess){
    const pendingPayment = localStorage.getItem('betai_pending_payment');
    if (pendingPayment){
      const payment = JSON.parse(pendingPayment);
      const u = getUser(payment.email);
      
      if (u){
        // Ativar subscrição
        let months = payment.plan === 'monthly' ? 1 : 12;
        const now = new Date();
        const until = new Date(now.setMonth(now.getMonth()+months));
        u.subscribed = true;
        u.subUntil = until.toISOString();
        u.planType = payment.plan;
        u.cancelledAt = null; // Limpar qualquer cancelamento anterior
        saveUser(u);
        
        // Limpar dados pendentes
        localStorage.removeItem('betai_pending_payment');
        
        // Atualizar UI
        renderAccount();
        
        // Mostrar mensagem de sucesso
        alert('🎉 Pagamento bem-sucedido! A tua subscrição está ativa. Agora podes usar o questionário para obter recomendações!');
        
        // Limpar URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }
}
