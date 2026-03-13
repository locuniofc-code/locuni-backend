// src/email.js — Serviço de e-mail com Resend
const { Resend } = require('resend')
const QRCode = require('qrcode')
require('dotenv').config()

const resend = new Resend(process.env.RESEND_API_KEY)

// Gera QR Code como base64 para embutir no e-mail
async function gerarQRBase64(texto) {
  try {
    return await QRCode.toDataURL(texto, {
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })
  } catch (e) {
    console.error('Erro ao gerar QR Code:', e)
    return null
  }
}

// E-mail de confirmação de compra
async function enviarConfirmacao(pedido) {
  const qrBase64 = await gerarQRBase64(
    `${pedido.codigo}|${pedido.nome}|${pedido.lote_nome}`
  )

  const addonsHtml = pedido.addons_json && pedido.addons_json.length > 0
    ? `<tr>
        <td style="padding:12px 20px;border-bottom:1px solid #222;">
          <strong style="color:#aaa;font-size:13px;">EXTRAS</strong><br>
          <span style="color:#fff;">${pedido.addons_json.map(a => `${a.emoji} ${a.nome} ×${a.qty}`).join(', ')}</span>
        </td>
       </tr>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;overflow:hidden;border:1px solid #222;">
        
        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#CC0000,#FF2020);padding:32px;text-align:center;">
            <div style="font-family:'Bebas Neue',Impact,sans-serif;font-size:42px;letter-spacing:4px;color:#fff;line-height:1;">LOCUNI PASS</div>
            <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:6px;letter-spacing:2px;text-transform:uppercase;">Ingresso Confirmado</div>
          </td>
        </tr>

        <!-- MENSAGEM -->
        <tr>
          <td style="padding:32px 32px 16px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🎉</div>
            <h1 style="color:#fff;font-size:24px;margin:0 0 8px;">Compra confirmada, ${pedido.nome.split(' ')[0]}!</h1>
            <p style="color:#888;font-size:15px;margin:0;line-height:1.6;">Seu ingresso foi gerado com sucesso. Apresente o QR Code abaixo na entrada do evento.</p>
          </td>
        </tr>

        <!-- QR CODE -->
        <tr>
          <td style="padding:24px;text-align:center;">
            <div style="display:inline-block;background:#fff;padding:16px;border-radius:12px;">
              ${qrBase64 ? `<img src="${qrBase64}" width="200" height="200" alt="QR Code" style="display:block;">` : ''}
            </div>
            <div style="margin-top:16px;background:#1a1a1a;border:1px dashed #CC0000;border-radius:6px;padding:12px 24px;display:inline-block;">
              <span style="font-family:monospace;font-size:18px;color:#FF2020;letter-spacing:3px;">${pedido.codigo}</span>
            </div>
          </td>
        </tr>

        <!-- DETALHES -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:8px;overflow:hidden;border:1px solid #222;">
              <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #222;">
                  <strong style="color:#aaa;font-size:13px;">NOME</strong><br>
                  <span style="color:#fff;">${pedido.nome}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #222;">
                  <strong style="color:#aaa;font-size:13px;">INGRESSO</strong><br>
                  <span style="color:#fff;">${pedido.lote_nome}</span>
                </td>
              </tr>
              ${addonsHtml}
              <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #222;">
                  <strong style="color:#aaa;font-size:13px;">PAGAMENTO</strong><br>
                  <span style="color:#fff;">${pedido.pagamento.toUpperCase()} ✅</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 20px;">
                  <strong style="color:#aaa;font-size:13px;">TOTAL PAGO</strong><br>
                  <span style="color:#FF2020;font-size:22px;font-weight:700;">R$${Number(pedido.total).toFixed(2)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- AVISO -->
        <tr>
          <td style="padding:0 32px 24px;">
            <div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.3);border-radius:8px;padding:16px;">
              <p style="margin:0;color:#FFD700;font-size:13px;line-height:1.7;">
                ⚠️ <strong>Guarde este e-mail!</strong> O QR Code acima é seu ingresso. Não compartilhe com ninguém — ele é de uso único e pessoal.
              </p>
            </div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #222;text-align:center;">
            <p style="color:#444;font-size:12px;margin:0;">© 2026 LOCUNI PASS · Todos os direitos reservados</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'LOCUNI PASS <ingressos@seudominio.com.br>',
      to: pedido.email,
      subject: `🎫 Seu ingresso LOCUNI FEST 2026 — ${pedido.codigo}`,
      html
    })
    if (error) console.error('Erro Resend:', error)
    else console.log('E-mail enviado:', data.id)
    return !error
  } catch (e) {
    console.error('Falha no envio de e-mail:', e)
    return false
  }
}

// E-mail de cortesia
async function enviarCortesia(pedido) {
  pedido.pagamento = 'CORTESIA'
  pedido.total = 0
  return enviarConfirmacao(pedido)
}

module.exports = { enviarConfirmacao, enviarCortesia }
