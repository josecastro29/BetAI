// Função Serverless para processar pagamentos automáticos via Stripe
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Inicializar Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Inicializar Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { redemption_id } = req.body;

    if (!redemption_id) {
      return res.status(400).json({ error: 'redemption_id é obrigatório' });
    }

    // Buscar dados do resgate
    const { data: redemption, error: redemptionError } = await supabase
      .from('redemptions')
      .select('*, users(*)')
      .eq('id', redemption_id)
      .single();

    if (redemptionError || !redemption) {
      return res.status(404).json({ error: 'Resgate não encontrado' });
    }

    // Verificar se já foi processado
    if (redemption.status !== 'pending') {
      return res.status(400).json({ error: 'Resgate já foi processado' });
    }

    // Extrair IBAN dos payment_details
    const { iban, accountName } = redemption.payment_details;

    if (!iban) {
      return res.status(400).json({ error: 'IBAN não fornecido' });
    }

    // Converter EUR para centavos (Stripe usa centavos)
    const amountInCents = Math.round(redemption.amount_euro * 100);

    console.log('🏦 Processando transferência:', {
      redemption_id,
      amount: redemption.amount_euro,
      iban,
      accountName
    });

    // PASSO 1: Criar External Account (conta bancária do cliente)
    let bankAccount;
    try {
      // Nota: Para Portugal, o country é 'PT'
      bankAccount = await stripe.accounts.createExternalAccount(
        'acct_default', // Usar conta conectada ou criar uma
        {
          external_account: {
            object: 'bank_account',
            country: 'PT',
            currency: 'eur',
            account_holder_name: accountName,
            account_number: iban,
          }
        }
      );
    } catch (bankError) {
      console.error('❌ Erro ao criar conta bancária:', bankError);
      
      // Marcar como rejeitado
      await supabase
        .from('redemptions')
        .update({
          status: 'rejected',
          admin_notes: `Erro ao criar conta bancária: ${bankError.message}`,
          processed_at: new Date().toISOString()
        })
        .eq('id', redemption_id);

      // Reembolsar pontos
      await supabase.rpc('process_redemption', {
        p_redemption_id: redemption_id,
        p_new_status: 'rejected',
        p_admin_notes: `IBAN inválido: ${bankError.message}`
      });

      return res.status(400).json({ 
        error: 'IBAN inválido ou erro ao criar conta bancária',
        details: bankError.message 
      });
    }

    // PASSO 2: Criar Payout (transferência)
    let payout;
    try {
      payout = await stripe.payouts.create({
        amount: amountInCents,
        currency: 'eur',
        destination: bankAccount.id,
        description: `Resgate de ${redemption.points_redeemed} pontos - ${redemption.users.name}`,
        statement_descriptor: 'BETAI PONTOS',
        metadata: {
          redemption_id: redemption_id,
          user_id: redemption.user_id,
          points: redemption.points_redeemed
        }
      });

      console.log('✅ Payout criado:', payout.id);

    } catch (payoutError) {
      console.error('❌ Erro ao criar payout:', payoutError);

      // Remover conta bancária criada
      if (bankAccount?.id) {
        try {
          await stripe.accounts.deleteExternalAccount('acct_default', bankAccount.id);
        } catch (e) {
          console.error('Erro ao remover conta:', e);
        }
      }

      // Marcar como rejeitado e reembolsar
      await supabase.rpc('process_redemption', {
        p_redemption_id: redemption_id,
        p_new_status: 'rejected',
        p_admin_notes: `Erro ao processar pagamento: ${payoutError.message}`
      });

      return res.status(400).json({ 
        error: 'Erro ao processar pagamento',
        details: payoutError.message 
      });
    }

    // PASSO 3: Atualizar status para "paid" no Supabase
    const { error: updateError } = await supabase
      .from('redemptions')
      .update({
        status: 'paid',
        admin_notes: `Payout automático via Stripe: ${payout.id}`,
        processed_at: new Date().toISOString()
      })
      .eq('id', redemption_id);

    if (updateError) {
      console.error('❌ Erro ao atualizar status:', updateError);
    }

    // PASSO 4: Limpar conta bancária (opcional, para segurança)
    if (bankAccount?.id) {
      try {
        await stripe.accounts.deleteExternalAccount('acct_default', bankAccount.id);
        console.log('🗑️ Conta bancária removida após transferência');
      } catch (e) {
        console.error('⚠️ Erro ao remover conta (não crítico):', e);
      }
    }

    // Sucesso!
    return res.status(200).json({
      success: true,
      payout_id: payout.id,
      amount: redemption.amount_euro,
      status: 'paid',
      message: 'Transferência processada com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
};
