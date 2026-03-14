const { Resend } = require('resend');
const QRCode = require('qrcode');

const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarEmailIngresso(compra) {
  try {
    const qrDataUrl = await QRCode.toDataURL(
      `${compra.codigo}|${compra.nome}|${compra.lote_nome}`,
      { width: 200, margin: 2 }
    );

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#050505;color:#F0E8E8;font-family:Arial,sans-serif;padding:0;margin:0;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-family:Georgia,serif;font-size:2.5rem;color:#FF1111;letter-spacing:4px;margin:0;">LOCUNI PASS</h1>
      <p style="color:#555;font-size:.85rem;margin-top:6px;">Seu ingresso está confirmado</p>
    </div>

    <div style="background:#0e0e0e;border:1px solid #1c1c1c;border-top:3px solid #CC0000;padding:28px;margin-bottom:24px;">
      <h2 style="font-size:1.1rem;font-weight:700;margin:0 0 20px;">🎫 Detalhes do Ingresso</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#555;font-size:.85rem;">Código</td><td style="padding:8px 0;font-family:monospace;color:#FF1111;font-weight:700;">${compra.codigo}</td></tr>
        <tr><td style="padding:8px 0;color:#555;font-size:.85rem;">Nome</td><td style="padding:8px 0;font-weight:600;">${compra.nome}</td></tr>
        <tr><td style="padding:8px 0;color:#555;font-size:.85rem;">Lote</td><td style="padding:8px 0;">${compra.lote_nome}</td></tr>
        <tr><td style="padding:8px 0;color:#555;font-size:.85rem;">Total Pago</td><td style="padding:8px 0;font-family:Georgia,serif;font-size:1.3rem;color:#FF1111;font-weight:700;">R$ ${Number(compra.total).toFixed(2)}</td></tr>
        <tr><td style="padding:8px 0;color:#555;font-size:.85rem;">Data</td><td style="padding:8px 0;">${new Date(compra.criado_em || Date.now()).toLocaleDateString('pt-BR')}</td></tr>
      </table>
    </div>

    <div style="text-align:center;background:#0e0e0e;border:1px solid #1c1c1c;padding:28px;margin-bottom:24px;">
      <p style="color:#555;font-size:.85rem;margin-bottom:16px;">Apresente este QR Code na entrada do evento</p>
      <img src="${qrDataUrl}" alt="QR Code" style="border:6px solid #fff;padding:10px;background:#fff;">
      <p style="font-family:monospace;font-size:.9rem;color:#FF1111;margin-top:14px;letter-spacing:2px;">${compra.codigo}</p>
    </div>

    <div style="background:rgba(204,0,0,.08);border-left:3px solid #CC0000;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:.83rem;color:#aaa;">⚠️ Este ingresso é pessoal e intransferível. Guarde o código em local seguro.</p>
    </div>

    <p style="text-align:center;color:#333;font-size:.75rem;">© 2026 LOCUNI PASS — Todos os direitos reservados</p>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@resend.dev',
      to: compra.email,
      subject: `🎫 Seu ingresso LOCUNI PASS — ${compra.codigo}`,
      html
    });

    console.log('📧 Email enviado para:', compra.email);
  } catch (err) {
    console.error('❌ Erro ao enviar email:', err.message);
  }
}

module.exports = { enviarEmailIngresso };
