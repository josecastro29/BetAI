// ============================================
// STRIPE WEBHOOK HANDLER
// ============================================
// Este ficheiro precisa ser hospedado num servidor
// Opções: Vercel Functions, Netlify Functions, Cloudflare Workers
// 
// IMPORTANTE: Substitui STRIPE_WEBHOOK_SECRET pela tua chave secreta do Stripe
// ============================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Configurar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Service key para bypass RLS
);

// Endpoint principal do webhook
module.exports = async (req, res) => {
  // Apenas aceitar POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verificar assinatura do webhook
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('📨 Webhook received:', event.type);

  // Processar diferentes tipos de eventos
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// ============================================
// HANDLERS DE EVENTOS
// ============================================

async function handleCheckoutCompleted(session) {
  console.log('💳 Checkout completed:', session.id);

  const customerEmail = session.customer_email;
  const amountTotal = session.amount_total; // em centavos

  // Determinar tipo de plano baseado no valor
  const planType = amountTotal === 4500 ? 'yearly' : 'monthly'; // €45 ou €10
  const months = planType === 'yearly' ? 12 : 1;

  // Buscar utilizador
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', customerEmail)
    .single();

  if (userError || !user) {
    console.error('❌ User not found:', customerEmail);
    return;
  }

  // Calcular data de renovação
  const now = new Date();
  const subUntil = new Date(now);
  subUntil.setMonth(subUntil.getMonth() + months);

  // Atualizar subscrição do utilizador
  const { error: updateError } = await supabase
    .from('users')
    .update({
      subscribed: true,
      sub_until: subUntil.toISOString(),
      plan_type: planType,
      cancelled_at: null
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('❌ Error updating subscription:', updateError);
    return;
  }

  console.log(`✅ Subscription activated for ${customerEmail} (${planType})`);

  // Nota: Pontos removidos - apenas 1 ponto por registo, não por subscrição
}

async function handleSubscriptionCreated(subscription) {
  console.log('🆕 Subscription created:', subscription.id);
  // Já tratado em handleCheckoutCompleted
}

async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Subscription updated:', subscription.id);
  
  // Buscar utilizador pelo customer ID do Stripe
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (!user) {
    console.log('User not found for customer:', subscription.customer);
    return;
  }

  // Atualizar status baseado no estado da subscrição
  const isActive = subscription.status === 'active';
  
  await supabase
    .from('users')
    .update({
      subscribed: isActive,
      cancelled_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null
    })
    .eq('id', user.id);

  console.log(`✅ Updated subscription status for user ${user.email}`);
}

async function handleSubscriptionDeleted(subscription) {
  console.log('❌ Subscription deleted:', subscription.id);
  
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (!user) return;

  await supabase
    .from('users')
    .update({
      subscribed: false,
      cancelled_at: new Date().toISOString()
    })
    .eq('id', user.id);

  console.log(`✅ Subscription cancelled for user ${user.email}`);
}

async function handlePaymentSucceeded(invoice) {
  console.log('💰 Payment succeeded:', invoice.id);
  
  // Se for renovação, atualizar data de sub_until
  if (invoice.billing_reason === 'subscription_cycle') {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('stripe_customer_id', invoice.customer)
      .single();

    if (user) {
      const now = new Date();
      const months = user.plan_type === 'yearly' ? 12 : 1;
      const newSubUntil = new Date(now);
      newSubUntil.setMonth(newSubUntil.getMonth() + months);

      await supabase
        .from('users')
        .update({
          subscribed: true,
          sub_until: newSubUntil.toISOString(),
          cancelled_at: null
        })
        .eq('id', user.id);

      console.log(`✅ Subscription renewed for ${user.email}`);
    }
  }
}

async function handlePaymentFailed(invoice) {
  console.log('⚠️ Payment failed:', invoice.id);
  
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (user) {
    // Opcional: Enviar email ou notificação sobre falha no pagamento
    console.log(`⚠️ Payment failed for user ${user.email}`);
  }
}

// ============================================
// FUNÇÃO AUXILIAR - CONCEDER PONTOS
// ============================================

async function awardPoints(userId, points, reason, referralId = null) {
  try {
    // Usar a função RPC do Supabase
    const { error } = await supabase.rpc('add_referral_points', {
      p_user_id: userId,
      p_points: points,
      p_reason: reason,
      p_referral_id: referralId
    });

    if (error) {
      console.error('❌ Error awarding points:', error);
    } else {
      console.log(`✅ Awarded ${points} points to user ${userId}: ${reason}`);
    }
  } catch (err) {
    console.error('❌ Exception awarding points:', err);
  }
}
