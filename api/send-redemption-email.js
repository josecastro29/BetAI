// ============================================
// 📧 ENVIO DE EMAIL PARA NOTIFICAÇÃO DE RESGATE
// ============================================
// Este endpoint envia um email para o admin quando
// um utilizador solicita um resgate de pontos

const { createClient } = require('@supabase/supabase-js');

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { redemption_id } = req.body;
    
    if (!redemption_id) {
      return res.status(400).json({ error: 'redemption_id é obrigatório' });
    }
    
    // Buscar detalhes do resgate
    const { data: redemption, error: redemptionError } = await supabase
      .from('redemptions')
      .select(`
        *,
        users (
          name,
          email,
          phone
        )
      `)
      .eq('id', redemption_id)
      .single();
    
    if (redemptionError || !redemption) {
      console.error('Erro ao buscar resgate:', redemptionError);
      return res.status(404).json({ error: 'Resgate não encontrado' });
    }
    
    // Extrair informações
    const userName = redemption.users.name || 'Utilizador';
    const userEmail = redemption.users.email;
    const userPhone = redemption.users.phone || 'Não fornecido';
    const points = redemption.points_redeemed;
    const amount = redemption.amount_euro;
    const iban = redemption.payment_details.iban;
    const accountName = redemption.payment_details.accountName;
    const requestedAt = new Date(redemption.requested_at).toLocaleString('pt-PT', {
      dateStyle: 'full',
      timeStyle: 'short'
    });
    
    // ============================================
    // OPÇÃO 1: Usar Resend (recomendado)
    // ============================================
    // Descomenta este bloco se usares Resend.com
    // É grátis até 3000 emails/mês
    
    /*
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: 'BetAI Resgates <noreply@betai.pt>', // Configura domínio no Resend
      to: ['josecastro29@gmail.com'], // Teu email
      subject: `🔔 Novo Resgate de Pontos - ${userName} (${amount}€)`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; padding: 24px; text-align: center; }
            .content { padding: 32px; }
            .info-box { background: #f9fafb; border-left: 4px solid #06b6d4; padding: 16px; margin: 16px 0; border-radius: 4px; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .label { font-weight: bold; color: #374151; }
            .value { color: #1f2937; }
            .highlight { background: #dbeafe; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .amount { font-size: 32px; font-weight: bold; color: #0891b2; }
            .footer { background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; }
            .button { display: inline-block; background: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">💰 Novo Resgate de Pontos</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">BetAI - Sistema de Recompensas</p>
            </div>
            
            <div class="content">
              <p>Olá! Um utilizador solicitou um resgate de pontos.</p>
              
              <div class="highlight">
                <div class="amount">${amount}€</div>
                <div style="color: #6b7280; margin-top: 4px;">${points} pontos convertidos</div>
              </div>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #0891b2;">👤 Informações do Utilizador</h3>
                <div class="info-row">
                  <span class="label">Nome:</span>
                  <span class="value">${userName}</span>
                </div>
                <div class="info-row">
                  <span class="label">Email:</span>
                  <span class="value">${userEmail}</span>
                </div>
                <div class="info-row">
                  <span class="label">Telemóvel:</span>
                  <span class="value">${userPhone}</span>
                </div>
                <div class="info-row">
                  <span class="label">Data do pedido:</span>
                  <span class="value">${requestedAt}</span>
                </div>
              </div>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #0891b2;">💳 Informações de Pagamento</h3>
                <div class="info-row">
                  <span class="label">IBAN:</span>
                  <span class="value" style="font-family: monospace; font-size: 14px;">${iban}</span>
                </div>
                <div class="info-row">
                  <span class="label">Nome da conta:</span>
                  <span class="value">${accountName}</span>
                </div>
                <div class="info-row">
                  <span class="label">Método:</span>
                  <span class="value">Transferência Bancária</span>
                </div>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #eab308; padding: 12px; border-radius: 4px; margin-top: 20px;">
                <strong style="color: #92400e;">⚠️ Ação necessária:</strong>
                <p style="margin: 8px 0 0 0; color: #78350f;">
                  Acede ao painel de administração para processar este resgate.
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="https://josecastro29.github.io/BetAI/admin.html" class="button">
                  🔧 Ir para o Painel Admin
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">Este é um email automático do sistema BetAI</p>
              <p style="margin: 4px 0 0 0;">ID do resgate: ${redemption_id}</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    
    if (error) {
      console.error('Erro ao enviar email via Resend:', error);
      return res.status(500).json({ error: 'Erro ao enviar email', details: error });
    }
    */
    
    // ============================================
    // OPÇÃO 2: Usar Nodemailer com Gmail (temporário)
    // ============================================
    // Usa isto para desenvolvimento rápido
    
    const nodemailer = require('nodemailer');
    
    // Configurar transporter (Gmail)
    // IMPORTANTE: Precisas ativar "Acesso de apps menos seguras" ou usar App Password
    // https://myaccount.google.com/apppasswords
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'teu-email@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || 'tua-senha-app'
      }
    });
    
    const mailOptions = {
      from: '"BetAI Resgates" <noreply@betai.pt>',
      to: 'josecastro29@gmail.com', // Teu email
      subject: `🔔 Novo Resgate de Pontos - ${userName} (${amount}€)`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; padding: 24px; text-align: center; }
            .content { padding: 32px; }
            .info-box { background: #f9fafb; border-left: 4px solid #06b6d4; padding: 16px; margin: 16px 0; border-radius: 4px; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .label { font-weight: bold; color: #374151; }
            .value { color: #1f2937; }
            .highlight { background: #dbeafe; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .amount { font-size: 32px; font-weight: bold; color: #0891b2; }
            .footer { background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; }
            .button { display: inline-block; background: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">💰 Novo Resgate de Pontos</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">BetAI - Sistema de Recompensas</p>
            </div>
            
            <div class="content">
              <p>Olá! Um utilizador solicitou um resgate de pontos.</p>
              
              <div class="highlight">
                <div class="amount">${amount}€</div>
                <div style="color: #6b7280; margin-top: 4px;">${points} pontos convertidos</div>
              </div>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #0891b2;">👤 Informações do Utilizador</h3>
                <div class="info-row">
                  <span class="label">Nome:</span>
                  <span class="value">${userName}</span>
                </div>
                <div class="info-row">
                  <span class="label">Email:</span>
                  <span class="value">${userEmail}</span>
                </div>
                <div class="info-row">
                  <span class="label">Telemóvel:</span>
                  <span class="value">${userPhone}</span>
                </div>
                <div class="info-row">
                  <span class="label">Data do pedido:</span>
                  <span class="value">${requestedAt}</span>
                </div>
              </div>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #0891b2;">💳 Informações de Pagamento</h3>
                <div class="info-row">
                  <span class="label">IBAN:</span>
                  <span class="value" style="font-family: monospace; font-size: 14px;">${iban}</span>
                </div>
                <div class="info-row">
                  <span class="label">Nome da conta:</span>
                  <span class="value">${accountName}</span>
                </div>
                <div class="info-row">
                  <span class="label">Método:</span>
                  <span class="value">Transferência Bancária</span>
                </div>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #eab308; padding: 12px; border-radius: 4px; margin-top: 20px;">
                <strong style="color: #92400e;">⚠️ Ação necessária:</strong>
                <p style="margin: 8px 0 0 0; color: #78350f;">
                  ${process.env.STRIPE_PAYOUTS_ENABLED === 'true' 
                    ? 'O pagamento foi processado automaticamente via Stripe Payouts.' 
                    : 'Acede ao painel de administração para processar este resgate manualmente.'}
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="https://josecastro29.github.io/BetAI/admin.html" class="button">
                  🔧 Ir para o Painel Admin
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">Este é um email automático do sistema BetAI</p>
              <p style="margin: 4px 0 0 0;">ID do resgate: ${redemption_id}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado com sucesso para admin');
    
    return res.status(200).json({ 
      success: true,
      message: 'Email enviado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return res.status(500).json({ 
      error: 'Erro ao enviar email',
      details: error.message 
    });
  }
};
