// ✅ BACKEND ATIVO - Supabase
// Sistema de autenticação e validação centralizada implementado
// Todos os registos são guardados na base de dados cloud
// Validação de unicidade (email, NIF, telemóvel) funciona globalmente

// Aguardar carregamento do bcrypt
let bcrypt;
if (typeof window.dcodeIO !== 'undefined' && window.dcodeIO.bcrypt) {
  bcrypt = window.dcodeIO.bcrypt;
} else if (typeof window.bcrypt !== 'undefined') {
  bcrypt = window.bcrypt;
}

// Lógica simples baseada em regras para gerar recomendações + autenticação com Supabase
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
// Verification elements
const verificationBox = document.getElementById('verificationBox');
const doVerify = document.getElementById('doVerify');
const resendCode = document.getElementById('resendCode');
const backToSignup = document.getElementById('backToSignup');

// Temporary storage for pending registration
let pendingRegistration = null;
let currentVerificationCode = null;

/* ----------------- Sistema de Referral - Detecção e Tracking ----------------- */
// Detectar código de referral na URL ao carregar página
function detectAndStoreReferral() {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  
  if (refCode) {
    // Guardar em localStorage (permanente até registar)
    localStorage.setItem('betai_referral', refCode);
    
    // Guardar em cookie (30 dias como backup)
    setCookie('betai_referral', refCode, 30);
    
    console.log('✅ Código de referral detectado:', refCode);
    
    // Opcional: Mostrar mensagem de boas-vindas
    // showReferralWelcome(refCode);
  }
}

// Funções auxiliares de cookies
function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');
}

function deleteCookie(name) {
  setCookie(name, '', -1);
}

// Gerar código único de referral
function generateReferralCode(name, email) {
  // Limpar nome (remover espaços e caracteres especiais)
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 6);
  
  // Adicionar parte do email ou random
  const emailPart = email.split('@')[0].substring(0, 4);
  
  // Adicionar número aleatório
  const random = Math.floor(1000 + Math.random() * 9000);
  
  // Combinar: nome + random (ex: jose1234)
  return `${cleanName}${random}`.toUpperCase();
}

// Buscar referrer pelo código
async function getReferrerByCode(refCode) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('referral_code', refCode)
      .single();
    
    if (error || !data) {
      console.log('Código de referral não encontrado:', refCode);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Erro ao buscar referrer:', err);
    return null;
  }
}

// Criar registo de referral
async function createReferralRecord(referrerId, referredId, refCode) {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .insert([{
        referrer_id: referrerId,
        referred_id: referredId,
        referral_code: refCode,
        status: 'pending',
        points_earned: 0
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar referral:', error);
      return null;
    }
    
    // Dar +2 pontos ao referrer (registo completo)
    await addReferralPoints(referrerId, 2, 'referral_signup', data.id);
    
    console.log('✅ Referral criado! Referrer ganhou +2 pontos');
    return data;
    
  } catch (err) {
    console.error('Erro ao criar referral:', err);
    return null;
  }
}

// Adicionar pontos ao utilizador
async function addReferralPoints(userId, points, reason, referralId = null) {
  try {
    const { error } = await supabase
      .rpc('add_referral_points', {
        p_user_id: userId,
        p_points: points,
        p_reason: reason,
        p_referral_id: referralId
      });
    
    if (error) {
      console.error('Erro ao adicionar pontos:', error);
    }
    
  } catch (err) {
    console.error('Erro ao adicionar pontos:', err);
  }
}

// Executar detecção ao carregar página
document.addEventListener('DOMContentLoaded', detectAndStoreReferral);
const paymentModal = document.getElementById('paymentModal');
const closePayment = document.getElementById('closePayment');
const payBtns = document.getElementsByClassName('payBtn');

function formatEuro(x){return '€'+Number(x).toFixed(2)}

/* ----------------- Conceder Pontos por Questionário ----------------- */
async function awardQuestionnairePoints(user) {
  if (!user || !user.id) return;
  
  try {
    // Verificar se já preencheu questionário hoje (opcional: limitar a 1x por dia)
    const today = new Date().toISOString().split('T')[0];
    const checkKey = `betai_questionnaire_${user.id}_${today}`;
    
    if (localStorage.getItem(checkKey)) {
      console.log('Questionário já preenchido hoje - pontos já atribuídos');
      return;
    }
    
    // Adicionar pontos usando a função RPC do Supabase
    const { error } = await supabase.rpc('add_referral_points', {
      p_user_id: user.id,
      p_points: 5,
      p_reason: 'Preenchimento de questionário',
      p_referral_id: null
    });
    
    if (error) {
      console.error('Erro ao conceder pontos:', error);
    } else {
      // Marcar como preenchido hoje
      localStorage.setItem(checkKey, 'true');
      
      // Mostrar notificação
      console.log('✅ +5 pontos concedidos por preencher questionário!');
      
      // Opcional: mostrar alerta visual
      setTimeout(() => {
        alert('🎉 +5 pontos! Ganhaste pontos por preencher o questionário.');
      }, 1000);
    }
    
  } catch (err) {
    console.error('Erro ao processar pontos:', err);
  }
}

survey.addEventListener('submit', async (e)=>{
  e.preventDefault();
  
  // Verificar se o utilizador tem subscrição ativa
  const user = await getCurrentUser();
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
  
  // Conceder +5 pontos por preencher questionário (primeira vez do dia ou sempre?)
  await awardQuestionnairePoints(user);
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
// ⚠️ ATENÇÃO: Sistema temporário para desenvolvimento
// TODO: Implementar backend com:
// - Hash bcrypt para passwords
// - JWT tokens para sessões
// - Validação server-side
// - Rate limiting contra brute force
function setupAuthUI(){
  // open modal
  openLogin.addEventListener('click',()=>authModal.classList.remove('hidden'));
  closeAuth.addEventListener('click',()=>authModal.classList.add('hidden'));
  tabLogin.addEventListener('click',()=>{loginBox.classList.remove('hidden');signupBox.classList.add('hidden');});
  tabSignup.addEventListener('click',()=>{signupBox.classList.remove('hidden');loginBox.classList.add('hidden');});

  doSignup.addEventListener('click', async ()=>{
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const nif = document.getElementById('signupNif').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const pass = document.getElementById('signupPass').value;
    
    // Validações básicas
    if (!name || !email || !nif || !phone || !pass){ 
      alert('Por favor, preenche todos os campos.'); 
      return; 
    }
    
    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)){
      alert('❌ Email inválido. Usa um formato válido (exemplo@dominio.com).');
      return;
    }
    
    // Validar NIF
    const nifValidation = validateNIF(nif);
    if (!nifValidation.valid){
      alert(`❌ NIF inválido: ${nifValidation.error}`);
      return;
    }
    
    // Validar telemóvel
    const phoneValidation = validatePortuguesePhone(phone);
    if (!phoneValidation.valid){
      alert(`❌ Telemóvel inválido: ${phoneValidation.error}`);
      return;
    }
    
    // ✅ VERIFICAÇÃO DE UNICIDADE (Supabase - Base de Dados)
    const uniquenessCheck = await checkUniquenessSupabase(email, nif, phone);
    if (!uniquenessCheck.unique){
      alert(`❌ Registo impossível:\n\n${uniquenessCheck.errors.join('\n')}\n\nCada conta deve ter dados únicos.`);
      return;
    }
    
    // ✅ Tudo válido - Enviar código de verificação SMS
    try {
      // Guardar dados temporariamente (aguarda verificação)
      pendingRegistration = {
        name,
        email,
        nif,
        phone,
        password: pass
      };
      
      // Gerar e enviar código de verificação
      const codeSent = await sendVerificationCode(phone);
      
      if (!codeSent) {
        alert('❌ Erro ao enviar código de verificação. Tenta novamente.');
        return;
      }
      
      // Mostrar interface de verificação
      signupBox.classList.add('hidden');
      verificationBox.classList.remove('hidden');
      document.getElementById('verificationPhone').textContent = formatPortuguesePhone(phone);
      document.getElementById('verificationCode').value = '';
      document.getElementById('verificationCode').focus();
      
    } catch (err) {
      console.error('Erro ao processar registo:', err);
      alert('❌ Erro ao processar registo. Tenta novamente.');
    }
  });

  doLogin.addEventListener('click', async ()=>{
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value;
    
    if (!email || !pass) {
      alert('❌ Por favor, preenche email e password.');
      return;
    }
    
    try {
      // Buscar utilizador no Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error || !data) {
        alert('❌ Email ou password incorretos.');
        return;
      }
      
      // Verificar password com bcrypt
      const passwordMatch = await bcrypt.compare(pass, data.password);
      
      if (!passwordMatch) {
        alert('❌ Email ou password incorretos.');
        return;
      }
      
      // Guardar sessão
      localStorage.setItem('betai_current_user_id', data.id);
      localStorage.setItem('betai_current_user_email', data.email);
      
      authModal.classList.add('hidden');
      renderAccount();
      
      alert('✅ Login bem-sucedido!');
      
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      alert('❌ Erro ao fazer login. Tenta novamente.');
    }
  });

  renderAccount();
  
  // Verificar código SMS
  doVerify.addEventListener('click', async ()=>{
    const code = document.getElementById('verificationCode').value.trim();
    
    if (!code || code.length !== 6) {
      alert('❌ Por favor, introduz o código de 6 dígitos.');
      return;
    }
    
    // Verificar código
    if (code !== currentVerificationCode) {
      alert('❌ Código inválido. Verifica e tenta novamente.');
      return;
    }
    
    // Código correto! Criar utilizador
    try {
      // Verificar se tem código de referral
      const refCode = 
        new URLSearchParams(window.location.search).get('ref') ||
        localStorage.getItem('betai_referral') ||
        getCookie('betai_referral');
      
      let referrerId = null;
      
      if (refCode) {
        const referrer = await getReferrerByCode(refCode);
        if (referrer) {
          referrerId = referrer.id;
          console.log('✅ Referido por:', referrer.name);
        }
      }
      
      // Gerar código único para este novo utilizador
      const newReferralCode = generateReferralCode(
        pendingRegistration.name,
        pendingRegistration.email
      );
      
      // Hash da password antes de guardar
      const passwordHash = await bcrypt.hash(pendingRegistration.password, 10);
      
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            name: pendingRegistration.name,
            email: pendingRegistration.email,
            nif: pendingRegistration.nif,
            phone: pendingRegistration.phone,
            password: passwordHash, // ✅ Password com hash bcrypt
            subscribed: false,
            sub_until: null,
            plan_type: null,
            cancelled_at: null,
            referred_by: referrerId,      // ← Quem referiu
            referral_code: newReferralCode // ← Código único deste user
          }
        ])
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar utilizador:', error);
        alert(`❌ Erro ao criar conta: ${error.message}`);
        return;
      }
      
      // Se foi referido por alguém, criar registo de referral
      if (referrerId) {
        await createReferralRecord(referrerId, data.id, refCode);
        
        // Limpar tracking após usar
        localStorage.removeItem('betai_referral');
        deleteCookie('betai_referral');
      }
      
      // Limpar dados temporários
      pendingRegistration = null;
      currentVerificationCode = null;
      
      // Guardar sessão
      localStorage.setItem('betai_current_user_id', data.id);
      localStorage.setItem('betai_current_user_email', data.email);
      
      // Fechar modal e mostrar sucesso
      verificationBox.classList.add('hidden');
      signupBox.classList.remove('hidden');
      authModal.classList.add('hidden');
      renderAccount();
      
      let successMsg = '✅ Telemóvel verificado!\n\nRegisto concluído com sucesso!';
      if (referrerId) {
        successMsg += '\n\n🎁 Foste referido! O teu amigo ganhou +2 pontos!';
      }
      successMsg += '\n\nPreenche o questionário para gerar recomendações personalizadas.';
      
      alert(successMsg);
      
    } catch (err) {
      console.error('Erro ao criar utilizador:', err);
      alert('❌ Erro ao criar conta. Tenta novamente.');
    }
  });
  
  // Reenviar código
  resendCode.addEventListener('click', async ()=>{
    if (!pendingRegistration) {
      alert('❌ Erro: Nenhum registo pendente.');
      return;
    }
    
    const codeSent = await sendVerificationCode(pendingRegistration.phone);
    
    if (codeSent) {
      alert('✅ Novo código enviado!\n\nVerifica o teu telemóvel.');
    } else {
      alert('❌ Erro ao reenviar código. Tenta novamente.');
    }
  });
  
  // Voltar ao formulário de registo
  backToSignup.addEventListener('click', ()=>{
    verificationBox.classList.add('hidden');
    signupBox.classList.remove('hidden');
    pendingRegistration = null;
    currentVerificationCode = null;
  });
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
async function getCurrentUser(){ 
  const userId = localStorage.getItem('betai_current_user_id');
  if (!userId) return null;
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    return error ? null : data;
  } catch (err) {
    return null;
  }
}

/* ----------------- Validação de NIF (Autoridade Tributária PT) ----------------- */
function validateNIF(nif){
  // Remover espaços e caracteres não numéricos
  nif = nif.replace(/\s/g, '');
  
  // ✅ Regra 1: Tem que ter exatamente 9 dígitos
  if (!/^\d{9}$/.test(nif)){
    return {
      valid: false,
      error: 'O NIF deve ter exatamente 9 dígitos numéricos.'
    };
  }
  
  // ✅ Regra 2: Primeiro dígito válido (tipo de entidade)
  const firstDigit = parseInt(nif[0]);
  const validFirstDigits = [1, 2, 3, 5, 6, 8, 9];
  
  if (!validFirstDigits.includes(firstDigit)){
    return {
      valid: false,
      error: `Primeiro dígito inválido (${firstDigit}). Deve ser: 1, 2, 3, 5, 6, 8 ou 9.`
    };
  }
  
  // ✅ Regra 3: Validar dígito de controlo (9º dígito)
  const checkDigit = parseInt(nif[8]);
  const calculatedCheckDigit = calculateNIFCheckDigit(nif.substring(0, 8));
  
  if (checkDigit !== calculatedCheckDigit){
    return {
      valid: false,
      error: 'NIF inválido. O dígito de controlo não corresponde.'
    };
  }
  
  // ✅ NIF válido!
  return {
    valid: true,
    type: getNIFType(firstDigit)
  };
}

function calculateNIFCheckDigit(first8Digits){
  // Algoritmo oficial da Autoridade Tributária
  // Multiplica cada dígito por peso decrescente (9, 8, 7, 6, 5, 4, 3, 2)
  let sum = 0;
  for (let i = 0; i < 8; i++){
    sum += parseInt(first8Digits[i]) * (9 - i);
  }
  
  // Calcula resto da divisão por 11
  const remainder = sum % 11;
  
  // Se resto for 0 ou 1, dígito de controlo = 0
  // Caso contrário, dígito de controlo = 11 - resto
  if (remainder === 0 || remainder === 1){
    return 0;
  } else {
    return 11 - remainder;
  }
}

function getNIFType(firstDigit){
  const types = {
    1: 'Pessoa singular (antes de 1999)',
    2: 'Pessoa singular',
    3: 'Pessoa singular (não residente)',
    5: 'Pessoa coletiva (empresa)',
    6: 'Administração pública',
    8: 'Entidade não residente',
    9: 'Entidade especial'
  };
  return types[firstDigit] || 'Desconhecido';
}

function nifExists(nif){
  const raw = localStorage.getItem('betai_users');
  if (!raw) return false;
  const users = JSON.parse(raw);
  
  // Verificar se algum utilizador já tem este NIF
  for (const email in users){
    if (users[email].nif === nif){
      return true;
    }
  }
  return false;
}

/* ----------------- Validação de Telemóvel Português ----------------- */
function validatePortuguesePhone(phone){
  // Remover espaços e caracteres não numéricos
  phone = phone.replace(/\s/g, '').replace(/[^0-9]/g, '');
  
  // ✅ Regra 1: Tem que ter exatamente 9 dígitos
  if (!/^\d{9}$/.test(phone)){
    return {
      valid: false,
      error: 'O número de telemóvel deve ter exatamente 9 dígitos.'
    };
  }
  
  // ✅ Regra 2: Deve começar por 9
  if (phone[0] !== '9'){
    return {
      valid: false,
      error: 'O número deve começar por 9 (ex: 91, 92, 93, 96).'
    };
  }
  
  // ✅ Regra 3: Segundo dígito válido (prefixos de operadores portugueses)
  const secondDigit = phone[1];
  const validSecondDigits = ['1', '2', '3', '6'];
  
  if (!validSecondDigits.includes(secondDigit)){
    return {
      valid: false,
      error: `Prefixo inválido (9${secondDigit}). Deve ser: 91, 92, 93 ou 96.`
    };
  }
  
  // ✅ Telemóvel válido!
  const prefix = phone.substring(0, 2);
  return {
    valid: true,
    operator: getPortugueseOperator(prefix),
    formatted: formatPortuguesePhone(phone)
  };
}

function getPortugueseOperator(prefix){
  // Prefixos históricos dos operadores portugueses
  const operators = {
    '91': 'Vodafone',
    '92': 'TMN/MEO',
    '93': 'NOS/Optimus',
    '96': 'TMN/MEO'
  };
  return operators[prefix] || 'Operador português';
}

function formatPortuguesePhone(phone){
  // Formatar: 912 345 678
  return `${phone.substring(0, 3)} ${phone.substring(3, 6)} ${phone.substring(6, 9)}`;
}

/* ----------------- Sistema de Verificação SMS ----------------- */
async function sendVerificationCode(phone){
  // Gerar código de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  currentVerificationCode = code;
  
  // ⚠️ MODO DESENVOLVIMENTO: Mostrar código no console/alert
  // TODO: Integrar com Twilio para SMS real em produção
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📱 CÓDIGO DE VERIFICAÇÃO SMS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Telemóvel: ${formatPortuguesePhone(phone)}`);
  console.log(`Código: ${code}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Mostrar também em alert (temporário para desenvolvimento)
  alert(`📱 CÓDIGO DE VERIFICAÇÃO (DEV MODE)\n\nTelemóvel: ${formatPortuguesePhone(phone)}\n\nCódigo: ${code}\n\n⚠️ Em produção, este código será enviado via SMS real.`);
  
  // Guardar no Supabase (tabela de verificações)
  try {
    const { error } = await supabase
      .from('verification_codes')
      .insert([
        {
          phone: phone,
          code: code,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutos
          used: false
        }
      ]);
    
    if (error && error.code !== '42P01') { // Ignorar se tabela não existe (opcional)
      console.error('Erro ao guardar código:', error);
    }
  } catch (err) {
    console.log('Tabela verification_codes não existe (opcional)');
  }
  
  return true;
}

function phoneExists(phone){
  const raw = localStorage.getItem('betai_users');
  if (!raw) return false;
  const users = JSON.parse(raw);
  
  // Normalizar número (remover espaços)
  phone = phone.replace(/\s/g, '');
  
  // Verificar se algum utilizador já tem este telemóvel
  for (const email in users){
    if (users[email].phone && users[email].phone.replace(/\s/g, '') === phone){
      return true;
    }
  }
  return false;
}

/* ----------------- Verificação de Unicidade (Supabase - Global) ----------------- */
async function checkUniquenessSupabase(email, nif, phone){
  const errors = [];
  
  try {
    // Verificar email
    const { data: emailCheck } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (emailCheck) {
      errors.push('• Este email já está registado.');
    }
    
    // Verificar NIF
    const { data: nifCheck } = await supabase
      .from('users')
      .select('id')
      .eq('nif', nif)
      .maybeSingle();
    
    if (nifCheck) {
      errors.push('• Este NIF já está registado noutra conta.');
    }
    
    // Verificar telemóvel
    const { data: phoneCheck } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    
    if (phoneCheck) {
      errors.push('• Este telemóvel já está registado noutra conta.');
    }
    
    return {
      unique: errors.length === 0,
      errors
    };
    
  } catch (err) {
    console.error('Erro ao verificar unicidade:', err);
    return {
      unique: false,
      errors: ['• Erro ao verificar dados. Tenta novamente.']
    };
  }
}

function isSubscribed(user){
  if (!user) return false;
  if (user.subscribed && user.sub_until){
    const until = new Date(user.sub_until);
    return until.getTime() > Date.now();
  }
  return Boolean(user.subscribed);
}

async function renderAccount(){
  const u = await getCurrentUser();
  accountArea.innerHTML = '';
  if (u){
    const div = document.createElement('div');
    const isSub = isSubscribed(u);
    let statusText = 'Sem subscrição';
    
    if (isSub){
      const until = new Date(u.sub_until);
      const formatted = until.toLocaleDateString('pt-PT');
      
      if (u.cancelled_at){
        statusText = `Ativa até ${formatted} (Cancelada)`;
      } else {
        statusText = `Ativa até ${formatted}`;
      }
    }
    
    // Buscar pontos do utilizador
    let pointsText = '';
    try {
      const { data: points } = await supabase
        .from('referral_points')
        .select('points')
        .eq('user_id', u.id)
        .single();
      
      if (points && points.points > 0) {
        pointsText = ` | 💎 ${points.points} pts`;
      }
    } catch (err) {
      // Sem pontos ainda
    }
    
    div.innerHTML = `<div style="text-align:right"><strong>${escapeHtml(u.name||u.email)}</strong><br><small>${statusText}${pointsText}</small></div>`;
    
    // Botão de gestão de subscrição (se subscrito)
    if (isSub && !u.cancelled_at){
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
    btnLogout.addEventListener('click',()=>{ 
      localStorage.removeItem('betai_current_user_id'); 
      localStorage.removeItem('betai_current_user_email');
      renderAccount(); 
    });
    accountArea.appendChild(div); 
    accountArea.appendChild(btnLogout);
    
    // Mostrar barra de pontos na aba principal
    const pointsBarMain = document.getElementById('pointsBarMain');
    if (pointsBarMain) {
      pointsBarMain.style.display = 'block';
    }
    
    // Carregar pontos para a barra compacta
    loadPointsForMainTab(u.email);
    
    // Nota: A secção de referral agora está na aba "Missões" e só é carregada quando essa aba é aberta
    // A função loadReferralData é chamada apenas quando o usuário clica na aba "Missões"
  } else {
    const btn = document.createElement('button'); btn.id='openLoginBtn'; btn.textContent='Entrar / Registar';
    btn.addEventListener('click',()=>authModal.classList.remove('hidden'));
    accountArea.appendChild(btn);
    
    // Ocultar barra de pontos se não estiver logado
    const pointsBarMain = document.getElementById('pointsBarMain');
    if (pointsBarMain) {
      pointsBarMain.style.display = 'none';
    }
  }
}

/* ----------------- Carregar Pontos para Barra Compacta ----------------- */
async function loadPointsForMainTab(userEmail) {
  try {
    // Buscar usuário
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();
    
    if (error || !user) {
      console.error('Erro ao carregar utilizador para pontos:', error);
      return;
    }
    
    // Buscar pontos
    const { data: points } = await supabase
      .from('referral_points')
      .select('points')
      .eq('user_id', user.id)
      .single();
    
    const userPoints = points ? points.points : 0;
    
    // Atualizar barra compacta
    const userPointsMain = document.getElementById('userPointsMain');
    const pointsProgressMain = document.getElementById('pointsProgressMain');
    const pointsToNextMain = document.getElementById('pointsToNextMain');
    
    if (userPointsMain) {
      userPointsMain.textContent = userPoints;
    }
    
    // Calcular progresso
    const nextMilestone = userPoints < 20 ? 20 : userPoints < 50 ? 50 : 100;
    const progress = (userPoints / nextMilestone) * 100;
    
    if (pointsProgressMain) {
      pointsProgressMain.style.width = `${Math.min(progress, 100)}%`;
    }
    
    if (pointsToNextMain) {
      pointsToNextMain.textContent = nextMilestone - userPoints;
    }
    
  } catch (err) {
    console.error('Erro ao carregar pontos:', err);
  }
}

/* ----------------- Carregar Dados de Referral do Utilizador ----------------- */
async function loadReferralData(userEmail) {
  console.log('🔄 Iniciando loadReferralData para:', userEmail);
  
  // Buscar usuário completo do Supabase
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', userEmail)
    .single();
  
  if (error || !user) {
    console.error('❌ Erro ao carregar dados do usuário:', error);
    return;
  }
  
  console.log('✅ Utilizador carregado:', user.name, user.email);
  
  // Mostrar secção de referral
  const referralSection = document.getElementById('referralSection');
  if (referralSection) {
    referralSection.style.display = 'block';
    console.log('✅ Secção de referral mostrada');
  } else {
    console.error('❌ Elemento referralSection não encontrado!');
    return;
  }
  
  // Preparar link de referral
  const linkInput = document.getElementById('referralLinkInput');
  
  // Se não tem código, gerar um agora (para utilizadores antigos)
  if (!user.referral_code) {
    const newCode = generateReferralCode(user.name || 'user', user.email);
    
    // Atualizar na base de dados
    const { error: updateError } = await supabase
      .from('users')
      .update({ referral_code: newCode })
      .eq('id', user.id);
    
    if (!updateError) {
      user.referral_code = newCode;
      console.log('✅ Código de referral gerado:', newCode);
    } else {
      console.error('Erro ao gerar código:', updateError);
    }
  }
  
  // Configurar link completo
  if (user.referral_code) {
    const fullLink = `${window.location.origin}${window.location.pathname}?ref=${user.referral_code}`;
    linkInput.value = fullLink;
    console.log('✅ Link de referral configurado');
  } else {
    linkInput.value = 'Erro ao gerar link - contacta o suporte';
    console.error('❌ Código de referral não disponível');
  }
  
  // Carregar pontos
  try {
    const { data: points } = await supabase
      .from('referral_points')
      .select('points')
      .eq('user_id', user.id)
      .single();
    
    const userPoints = points ? points.points : 0;
    
    // Atualizar na aba Missões
    document.getElementById('userPoints').textContent = userPoints;
    
    // Atualizar na barra compacta da aba BetAI
    const userPointsMain = document.getElementById('userPointsMain');
    if (userPointsMain) {
      userPointsMain.textContent = userPoints;
    }
    
    // Calcular progresso para próxima recompensa
    const nextMilestone = userPoints < 20 ? 20 : userPoints < 50 ? 50 : 100;
    const progress = (userPoints / nextMilestone) * 100;
    
    // Atualizar na aba Missões
    document.getElementById('pointsProgress').style.width = `${Math.min(progress, 100)}%`;
    document.getElementById('pointsToNext').textContent = nextMilestone - userPoints;
    
    // Atualizar na barra compacta da aba BetAI
    const pointsProgressMain = document.getElementById('pointsProgressMain');
    const pointsToNextMain = document.getElementById('pointsToNextMain');
    if (pointsProgressMain) {
      pointsProgressMain.style.width = `${Math.min(progress, 100)}%`;
    }
    if (pointsToNextMain) {
      pointsToNextMain.textContent = nextMilestone - userPoints;
    }
    
    // Atualizar botões de resgate baseado nos pontos disponíveis
    updateRedemptionButtons(userPoints);
    
  } catch (err) {
    console.log('Sem pontos ainda');
  }
  
  // Carregar estatísticas de referências
  try {
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id);
    
    const statsContent = document.getElementById('referralStatsContent');
    
    if (error || !referrals || referrals.length === 0) {
      statsContent.innerHTML = 'Ainda não referiste ninguém. Partilha o teu código!';
    } else {
      const total = referrals.length;
      const pending = referrals.filter(r => r.status === 'pending').length;
      const completed = referrals.filter(r => r.status === 'completed').length;
      
      statsContent.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center">
          <div>
            <div style="font-size:24px;font-weight:bold;color:#06b6d4">${total}</div>
            <div style="font-size:12px;color:#9fb4c8">Total</div>
          </div>
          <div>
            <div style="font-size:24px;font-weight:bold;color:#eab308">${pending}</div>
            <div style="font-size:12px;color:#9fb4c8">Pendentes</div>
          </div>
          <div>
            <div style="font-size:24px;font-weight:bold;color:#10b981">${completed}</div>
            <div style="font-size:12px;color:#9fb4c8">Completos</div>
          </div>
        </div>
      `;
    }
    
  } catch (err) {
    console.error('Erro ao carregar referências:', err);
  }
  
  // Adicionar event listener para copiar link
  const copyLinkBtn = document.getElementById('copyReferralLink');
  
  // Remover listener antigo (se existir) e adicionar novo
  copyLinkBtn.replaceWith(copyLinkBtn.cloneNode(true));
  
  document.getElementById('copyReferralLink').addEventListener('click', () => {
    linkInput.select();
    navigator.clipboard.writeText(linkInput.value).then(() => {
      alert('✅ Link copiado! Partilha com os teus amigos para ganharem pontos. 🎁');
    }).catch(() => {
      // Fallback para navegadores antigos
      document.execCommand('copy');
      alert('✅ Link copiado! Partilha com os teus amigos para ganharem pontos. 🎁');
    });
  });
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

async function cancelSubscription(user){
  // Atualizar no Supabase
  const { error } = await supabase
    .from('users')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', user.id);
  
  if (error) {
    console.error('Erro ao cancelar:', error);
    alert('❌ Erro ao cancelar subscrição. Tenta novamente.');
    return;
  }
  
  user.cancelled_at = new Date().toISOString();
  saveUser(user);
  renderAccount();
  
  alert('✓ Subscrição cancelada com sucesso!\n\nContinuas com acesso premium até ' + 
        new Date(user.subUntil).toLocaleDateString('pt-PT') + 
        '\n\nDepois dessa data, os benefícios serão desativados.');
}

/* ----------------- Pagamento via Stripe Payment Links ----------------- */
// ✅ SEGURO: Links públicos oficiais do Stripe
// Stripe processa pagamentos de forma segura
// TODO: Implementar webhooks para confirmação automática server-side
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

/* ----------------- Carregar Estado da Subscrição ----------------- */
async function loadSubscriptionStatus() {
  const userEmail = localStorage.getItem('betai_current_user_email');
  const statusDiv = document.getElementById('currentSubscriptionInfo');
  
  if (!userEmail) {
    statusDiv.innerHTML = `
      <p style="text-align:center;color:#9fb4c8">
        Faz login para ver o estado da tua subscrição
      </p>
    `;
    return;
  }
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();
    
    if (error || !user) {
      statusDiv.innerHTML = '<p style="color:#ef4444">Erro ao carregar subscrição</p>';
      return;
    }
    
    const isSub = isSubscribed(user);
    
    if (!isSub) {
      statusDiv.innerHTML = `
        <div style="text-align:center;padding:20px">
          <p style="font-size:16px;color:#9fb4c8;margin:0 0 8px 0">
            ❌ Sem subscrição ativa
          </p>
          <p style="font-size:13px;color:#9fb4c8;margin:0">
            Escolhe um plano abaixo para desbloquear todas as funcionalidades
          </p>
        </div>
      `;
    } else {
      const until = new Date(user.sub_until);
      const formatted = until.toLocaleDateString('pt-PT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const planType = user.plan_type || 'mensal';
      const planName = planType === 'yearly' ? 'Anual' : 'Mensal';
      const planPrice = planType === 'yearly' ? '€45/ano' : '€10/mês';
      const isCancelled = user.cancelled_at;
      
      statusDiv.innerHTML = `
        <div style="padding:16px;background:rgba(16,185,129,0.2);border-radius:8px;border:1px solid #10b981">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div>
              <p style="margin:0;font-size:18px;font-weight:bold;color:#10b981">
                ✅ Subscrição Ativa
              </p>
              <p style="margin:4px 0 0 0;font-size:13px;color:#9fb4c8">
                Plano ${planName} · ${planPrice}
              </p>
            </div>
            <div style="text-align:right">
              <p style="margin:0;font-size:14px;color:#e6eef8;font-weight:600">
                ${isCancelled ? 'Termina em:' : 'Renova em:'}
              </p>
              <p style="margin:4px 0 0 0;font-size:16px;color:#10b981;font-weight:bold">
                ${formatted}
              </p>
            </div>
          </div>
          
          ${isCancelled ? `
            <div style="padding:12px;background:rgba(239,68,68,0.2);border-radius:6px;border:1px solid #ef4444;margin-top:12px">
              <p style="margin:0;font-size:13px;color:#fca5a5">
                ⚠️ <strong>Subscrição cancelada</strong> - Manténs acesso até ${formatted}
              </p>
            </div>
          ` : `
            <button id="cancelSubscriptionBtn" style="width:100%;padding:10px;background:rgba(239,68,68,0.8);color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;margin-top:12px">
              🗑️ Cancelar Subscrição
            </button>
          `}
        </div>
      `;
      
      // Adicionar listener ao botão de cancelar
      if (!isCancelled) {
        document.getElementById('cancelSubscriptionBtn').addEventListener('click', () => {
          showManageSubscription();
        });
      }
    }
    
  } catch (err) {
    console.error('Erro ao carregar subscrição:', err);
    statusDiv.innerHTML = '<p style="color:#ef4444">Erro ao carregar dados</p>';
  }
}

/* ----------------- Sistema de Navegação por Abas ----------------- */
function initTabNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-tab'));
    });
  });
  
  // Botão "Ver Missões" da barra de pontos
  const goToMissionsBtn = document.getElementById('goToMissions');
  if (goToMissionsBtn) {
    goToMissionsBtn.addEventListener('click', () => {
      switchTab('missions');
    });
  }
}

function switchTab(targetTab) {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Remover active de todos os botões e conteúdos
  tabBtns.forEach(b => b.classList.remove('active'));
  tabContents.forEach(c => c.classList.remove('active'));
  
  // Adicionar active ao botão clicado e conteúdo correspondente
  document.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');
  document.getElementById(`tab-${targetTab}`).classList.add('active');
  
  // Se for a aba de missões e o usuário estiver logado, carregar dados
  if (targetTab === 'missions') {
    const userEmail = localStorage.getItem('betai_current_user_email');
    if (userEmail) {
      console.log('Carregando dados de referral para:', userEmail);
      loadReferralData(userEmail);
    } else {
      console.log('Utilizador não está logado');
    }
  }
  
  // Se for a aba de subscrições, carregar estado
  if (targetTab === 'subscription') {
    loadSubscriptionStatus();
  }
}

// Inicializar tudo quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  // Detectar código de referral na URL
  detectAndStoreReferral();
  
  // Inicializar navegação por abas
  initTabNavigation();
  
  // Verificar retorno de pagamento
  checkPaymentReturn();
  
  // Renderizar conta
  renderAccount();
  
  // Inicializar sistema de resgate
  initRedemptionSystem();
});

/* ----------------- Sistema de Resgate de Pontos ----------------- */
let selectedRedemption = null;

function updateRedemptionButtons(userPoints) {
  const redemptionBtns = document.querySelectorAll('.redemption-btn');
  
  redemptionBtns.forEach(btn => {
    const requiredPoints = parseInt(btn.getAttribute('data-points'));
    
    if (userPoints < requiredPoints) {
      // Desabilitar botão
      btn.disabled = true;
      btn.style.opacity = '0.4';
      btn.style.cursor = 'not-allowed';
      btn.style.filter = 'grayscale(1)';
      
      // Adicionar mensagem de pontos insuficientes
      const pointsDiv = btn.querySelector('div:first-child');
      let insufficientMsg = btn.querySelector('.insufficient-points-msg');
      
      if (!insufficientMsg) {
        insufficientMsg = document.createElement('div');
        insufficientMsg.className = 'insufficient-points-msg';
        insufficientMsg.style.cssText = 'font-size:11px;color:#ef4444;margin-top:4px;font-weight:600';
        insufficientMsg.textContent = `❌ Precisas de ${requiredPoints - userPoints} pontos`;
        pointsDiv.appendChild(insufficientMsg);
      }
    } else {
      // Habilitar botão
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.style.filter = 'grayscale(0)';
      
      // Remover mensagem de pontos insuficientes
      const insufficientMsg = btn.querySelector('.insufficient-points-msg');
      if (insufficientMsg) {
        insufficientMsg.remove();
      }
    }
  });
}

function initRedemptionSystem() {
  // Botões de seleção de resgate
  const redemptionBtns = document.querySelectorAll('.redemption-btn');
  redemptionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) {
        alert('⚠️ Não tens pontos suficientes para este levantamento!');
        return;
      }
      const points = parseInt(btn.getAttribute('data-points'));
      const amount = parseFloat(btn.getAttribute('data-amount'));
      showRedemptionForm(points, amount);
    });
  });
  
  // Botões de confirmação/cancelamento
  document.getElementById('confirmRedemption')?.addEventListener('click', confirmRedemption);
  document.getElementById('cancelRedemption')?.addEventListener('click', hideRedemptionForm);
}

function showRedemptionForm(points, amount) {
  const userEmail = localStorage.getItem('betai_current_user_email');
  if (!userEmail) {
    alert('⚠️ Precisas estar logado para resgatar pontos!');
    document.getElementById('openLogin').click();
    return;
  }
  
  selectedRedemption = { points, amount };
  
  // Esconder opções e mostrar formulário
  document.getElementById('redemptionOptions').style.display = 'none';
  document.getElementById('redemptionForm').style.display = 'block';
  document.getElementById('redemptionNote').style.display = 'none';
  
  // Reset form
  document.getElementById('iban').value = '';
  document.getElementById('accountName').value = '';
}

function hideRedemptionForm() {
  selectedRedemption = null;
  document.getElementById('redemptionOptions').style.display = 'grid';
  document.getElementById('redemptionForm').style.display = 'none';
  document.getElementById('redemptionNote').style.display = 'block';
}

async function confirmRedemption() {
  const btn = document.getElementById('confirmRedemption');
  const originalText = btn.textContent;
  
  try {
    if (!selectedRedemption) {
      alert('⚠️ Erro: nenhum resgate selecionado!');
      return;
    }
    
    // Coletar detalhes de pagamento (apenas Transferência Bancária)
    const iban = document.getElementById('iban')?.value;
    const accountName = document.getElementById('accountName')?.value;
    
    if (!iban || !accountName) {
      alert('⚠️ Preenche todos os campos!');
      return;
    }
    
    if (!/^PT50[0-9]{21}$/.test(iban)) {
      alert('⚠️ IBAN inválido! Deve ser PT50 seguido de 21 dígitos.');
      return;
    }
    
    const paymentDetails = { iban, accountName };
    
    // Obter user_id e verificar pontos atuais
    const userEmail = localStorage.getItem('betai_current_user_email');
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();
    
    if (!user) {
      alert('⚠️ Erro ao identificar utilizador!');
      return;
    }
    
    // ✅ VALIDAÇÃO: Verificar se tem pontos suficientes ANTES de processar
    const { data: pointsData } = await supabase
      .from('referral_points')
      .select('points')
      .eq('user_id', user.id)
      .single();
    
    const currentPoints = pointsData ? pointsData.points : 0;
    
    if (currentPoints < selectedRedemption.points) {
      alert(`❌ Pontos insuficientes!\n\nTens: ${currentPoints} pontos\nNecessário: ${selectedRedemption.points} pontos\n\nFalta: ${selectedRedemption.points - currentPoints} pontos`);
      
      // Recarregar dados para atualizar interface
      await loadReferralData(userEmail);
      return;
    }
    
    // Desabilitar botão
    btn.disabled = true;
    btn.textContent = '⏳ Criando resgate...';
    btn.style.opacity = '0.6';
    
    // PASSO 1: Chamar função SQL para criar resgate
    const { data: redemptionId, error } = await supabase.rpc('request_redemption', {
      p_user_id: user.id,
      p_points: selectedRedemption.points,
      p_payment_method: 'Transferência Bancária',
      p_payment_details: paymentDetails
    });
    
    if (error) {
      console.error('Erro ao criar resgate:', error);
      
      // Mensagem de erro mais clara
      if (error.message.includes('Pontos insuficientes')) {
        alert(`❌ ${error.message}\n\nAtualiza a página e tenta novamente.`);
        await loadReferralData(userEmail);
      } else {
        alert('❌ Erro: ' + error.message);
      }
      
      btn.disabled = false;
      btn.textContent = originalText;
      btn.style.opacity = '1';
      return;
    }
    
    console.log('✅ Resgate criado com ID:', redemptionId);
    
    // PASSO 2: Enviar email de notificação para o admin
    btn.textContent = '📧 Enviando notificação...';
    
    try {
      await fetch('https://betai-one.vercel.app/api/send-redemption-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          redemption_id: redemptionId
        })
      });
      
      console.log('✅ Email enviado para admin');
    } catch (emailError) {
      console.error('⚠️ Erro ao enviar email (não crítico):', emailError);
      // Não bloquear o processo se o email falhar
    }
    
    // PASSO 3: Processar pagamento automático via Stripe (se configurado)
    btn.textContent = '💳 Processando pagamento...';
    
    try {
      const payoutResponse = await fetch('https://betai-one.vercel.app/api/process-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          redemption_id: redemptionId
        })
      });
      
      const payoutResult = await payoutResponse.json();
      
      if (!payoutResponse.ok) {
        throw new Error(payoutResult.error || 'Erro ao processar pagamento');
      }
      
      console.log('✅ Pagamento processado:', payoutResult);
      
      // Sucesso total!
      alert(`✅ Resgate de ${selectedRedemption.points} pontos (${selectedRedemption.amount}€) processado com sucesso!\n\n` +
            `💰 Transferência enviada para:\n` +
            `IBAN: ${iban}\n` +
            `Nome: ${accountName}\n\n` +
            `📧 Uma notificação foi enviada para o administrador.\n\n` +
            `O dinheiro deve chegar em 1-3 dias úteis.`);
      
    } catch (payoutError) {
      console.error('❌ Erro no pagamento automático:', payoutError);
      
      alert(`✅ Resgate criado com sucesso!\n\n` +
            `💰 Pontos debitados: ${selectedRedemption.points}\n` +
            `💶 Valor: ${selectedRedemption.amount}€\n\n` +
            `📧 Uma notificação foi enviada para o administrador.\n\n` +
            `⏳ O pagamento será processado manualmente em breve para:\n` +
            `IBAN: ${iban}\n` +
            `Nome: ${accountName}`);
    }
    
    // Atualizar interface
    hideRedemptionForm();
    
    // Recarregar pontos e histórico
    const userEmailReload = localStorage.getItem('betai_current_user_email');
    if (userEmailReload) {
      await loadReferralData(userEmailReload);
      await loadRedemptionHistory(user.id);
    }
    
    // Restaurar botão
    btn.disabled = false;
    btn.textContent = originalText;
    btn.style.opacity = '1';
    
  } catch (err) {
    console.error('Erro inesperado:', err);
    alert('❌ Erro inesperado ao processar resgate!');
    btn.disabled = false;
    btn.textContent = originalText;
    btn.style.opacity = '1';
  }
}

async function loadRedemptionHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('redemptions')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao carregar histórico:', error);
      return;
    }
    
    const historyDiv = document.getElementById('redemptionHistoryContent');
    
    if (!data || data.length === 0) {
      historyDiv.innerHTML = '<p style="text-align:center;color:#9fb4c8;font-size:13px">Nenhum resgate ainda</p>';
      return;
    }
    
    historyDiv.innerHTML = data.map(r => {
      const statusColors = {
        pending: { bg: 'rgba(234,179,8,0.2)', border: '#eab308', text: '#eab308', icon: '⏳', label: 'Pendente' },
        approved: { bg: 'rgba(6,182,212,0.2)', border: '#06b6d4', text: '#06b6d4', icon: '✅', label: 'Aprovado' },
        paid: { bg: 'rgba(16,185,129,0.2)', border: '#10b981', text: '#10b981', icon: '💰', label: 'Pago' },
        rejected: { bg: 'rgba(239,68,68,0.2)', border: '#ef4444', text: '#ef4444', icon: '❌', label: 'Rejeitado' }
      };
      
      const status = statusColors[r.status] || statusColors.pending;
      const date = new Date(r.requested_at).toLocaleDateString('pt-PT');
      
      return `
        <div style="background:${status.bg};border:1px solid ${status.border};border-radius:8px;padding:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div>
              <span style="font-weight:bold;color:#e6eef8">${r.points_redeemed} pontos → ${r.amount_euro}€</span>
              <span style="font-size:12px;color:#9fb4c8;margin-left:8px">${r.payment_method}</span>
            </div>
            <span style="color:${status.text};font-weight:600;font-size:14px">${status.icon} ${status.label}</span>
          </div>
          <div style="font-size:11px;color:#9fb4c8">
            Pedido em: ${date}
            ${r.processed_at ? ` • Processado em: ${new Date(r.processed_at).toLocaleDateString('pt-PT')}` : ''}
          </div>
          ${r.admin_notes ? `
            <div style="margin-top:8px;padding:8px;background:rgba(0,0,0,0.3);border-radius:4px;font-size:12px;color:#9fb4c8">
              📝 Nota: ${r.admin_notes}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    
  } catch (err) {
    console.error('Erro ao carregar histórico:', err);
  }
}

// Modificar loadReferralData para também carregar histórico de resgates
const originalLoadReferralData = loadReferralData;
async function loadReferralData(email) {
  await originalLoadReferralData(email);
  
  // Carregar histórico de resgates também
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (user) {
      await loadRedemptionHistory(user.id);
    }
  } catch (err) {
    console.error('Erro ao carregar histórico de resgates:', err);
  }
}

