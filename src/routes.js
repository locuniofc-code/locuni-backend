const express = require('express');
const router = express.Router();
const supabase = require('./supabase');
const { enviarEmailIngresso } = require('./email');
const { v4: uuidv4 } = require('uuid');
const mercadopago = require('mercadopago');

// ── Middleware admin ──
function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }
  next();
}

// ════════════════════════════════════
// AUTH
// ════════════════════════════════════
router.post('/auth/cadastro', async (req, res) => {
  try {
    const { nome, email, telefone, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ erro: 'Preencha todos os campos.' });
    if (senha.length < 6) return res.status(400).json({ erro: 'Senha mínimo 6 caracteres.' });

    const { data: existe } = await supabase.from('contas').select('id').eq('email', email).single();
    if (existe) return res.status(400).json({ erro: 'E-mail já cadastrado.' });

    const id = uuidv4();
    const { error } = await supabase.from('contas').insert([{ id, nome, email, telefone: telefone || '', senha, criado_em: new Date().toISOString() }]);
    if (error) throw error;

    res.json({ ok: true, usuario: { id, nome, email, telefone } });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const { data: user, error } = await supabase.from('contas').select('id,nome,email,telefone').eq('email', email).eq('senha', senha).single();
    if (error || !user) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    res.json({ ok: true, usuario: user });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ════════════════════════════════════
// LOTES
// ════════════════════════════════════
router.get('/lotes', async (req, res) => {
  try {
    const { data, error } = await supabase.from('lotes').select('*').order('ordem', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/admin/lote/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('lotes').update(req.body).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ════════════════════════════════════
// EVENTOS
// ════════════════════════════════════
router.get('/eventos', async (req, res) => {
  try {
    const { data, error } = await supabase.from('eventos').select('*').eq('ativo', true).order('criado_em', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/admin/evento', adminAuth, async (req, res) => {
  try {
    const { error, data } = await supabase.from('eventos').insert([{ ...req.body, id: uuidv4(), criado_em: new Date().toISOString() }]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/admin/evento/:id', adminAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('eventos').update(req.body).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/admin/evento/:id', adminAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('eventos').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ════════════════════════════════════
// ADD-ONS
// ════════════════════════════════════
router.get('/addons', async (req, res) => {
  try {
    const { data, error } = await supabase.from('addons').select('*').eq('ativo', true);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ════════════════════════════════════
// CUPONS
// ════════════════════════════════════
router.post('/cupom/validar', async (req, res) => {
  try {
    const { codigo, subtotal } = req.body;
    const { data: cupom, error } = await supabase.from('cupons').select('*').eq('codigo', codigo.toUpperCase()).eq('ativo', true).single();
    if (error || !cupom) return res.status(400).json({ erro: 'Cupom inválido ou inativo.' });
    if (cupom.usados >= cupom.limite) return res.status(400).json({ erro: 'Cupom esgotado.' });

    const desconto = cupom.tipo === '%'
      ? Math.round(subtotal * cupom.valor / 100 * 100) / 100
      : cupom.valor;

    res.json({ ok: true, codigo: cupom.codigo, desconto, tipo: cupom.tipo });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/admin/cupom', adminAuth, async (req, res) => {
  try {
    const { error, data } = await supabase.from('cupons').insert([{ ...req.body, id: uuidv4() }]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/admin/cupom/:id', adminAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('cupons').update(req.body).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/admin/cupom/:id', adminAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('cupons').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ════════════════════════════════════
// PAGAMENTO
// ════════════════════════════════════
router.post('/pagamento/criar', async (req, res) => {
  try {
    const { userId, nome, email, loteId, addonsIds, cupom, pagamento } = req.body;

    // Busca lote
    const { data: lote, error: loteErr } = await supabase.from('lotes').select('*').eq('id', loteId).single();
    if (loteErr || !lote) {
      // Fallback: busca lote ativo
      const { data: loteAtivo } = await supabase.from('lotes').select('*').eq('ativo', true).single();
      if (!loteAtivo) return res.status(400).json({ erro: 'Nenhum lote disponível.' });
    }

    const loteUsado = lote || (await supabase.from('lotes').select('*').eq('ativo', true).single()).data;
    if (!loteUsado) return res.status(400).json({ erro: 'Lote não encontrado.' });

    let total = loteUsado.preco;

    // Desconto de cupom
    let desconto = 0;
    if (cupom) {
      const { data: cupomData } = await supabase.from('cupons').select('*').eq('codigo', cupom.toUpperCase()).eq('ativo', true).single();
      if (cupomData && cupomData.usados < cupomData.limite) {
        desconto = cupomData.tipo === '%' ? total * cupomData.valor / 100 : cupomData.valor;
        await supabase.from('cupons').update({ usados: cupomData.usados + 1 }).eq('id', cupomData.id);
      }
    }

    total = Math.max(0, total - desconto);
    const codigo = 'LCP-2026-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    // Cria pedido
    const pedido = {
      id: uuidv4(),
      codigo,
      user_id: userId,
      nome,
      email,
      lote_id: loteUsado.id,
      lote_nome: loteUsado.nome,
      addons_json: addonsIds || [],
      cupom: cupom || '',
      desconto,
      total,
      pagamento: pagamento || 'pix',
      status: 'pendente',
      checkin: false,
      cortesia: false,
      criado_em: new Date().toISOString()
    };

    const { error: pedidoErr } = await supabase.from('pedidos').insert([pedido]);
    if (pedidoErr) throw pedidoErr;

    // Atualiza vendidos no lote
    await supabase.from('lotes').update({ vendidos: (loteUsado.vendidos || 0) + 1 }).eq('id', loteUsado.id);

    // Tenta criar preferência Mercado Pago
    let checkoutUrl = null;
    if (process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN !== 'nao_configurado') {
      try {
        mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });
        const preference = await mercadopago.preferences.create({
          items: [{ title: `Ingresso LOCUNI PASS — ${loteUsado.nome}`, quantity: 1, currency_id: 'BRL', unit_price: total }],
          payer: { name: nome, email },
          external_reference: codigo,
          notification_url: `${process.env.FRONTEND_URL?.replace('netlify.app', 'up.railway.app') || ''}/api/webhook/mp`,
          back_urls: { success: `${process.env.FRONTEND_URL}?status=success`, failure: `${process.env.FRONTEND_URL}?status=failure` }
        });
        checkoutUrl = preference.body.init_point;
      } catch (mpErr) {
        console.warn('MP não configurado:', mpErr.message);
      }
    } else {
      // Sem MP: aprova automaticamente
      await supabase.from('pedidos').update({ status: 'pago' }).eq('codigo', codigo);
      pedido.status = 'pago';
      // Envia email
      await enviarEmailIngresso(pedido);
    }

    res.json({ ok: true, codigo, total, checkoutUrl, status: pedido.status });
  } catch (err) {
    console.error('Erro pagamento:', err);
    res.status(500).json({ erro: err.message });
  }
});

// ════════════════════════════════════
// WEBHOOK MERCADO PAGO
// ════════════════════════════════════
router.post('/webhook/mp', async (req, res) => {
  try {
    res.sendStatus(200);
    const { type, data } = req.body;
    if (type !== 'payment') return;

    mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });
    const payment = await mercadopago.payment.findById(data.id);
    if (payment.body.status !== 'approved') return;

    const codigo = payment.body.external_reference;
    const { data: pedido } = await supabase.from('pedidos').select('*').eq('codigo', codigo).single();
    if (!pedido || pedido.status === 'pago') return;

    await supabase.from('pedidos').update({ status: 'pago' }).eq('codigo', codigo);
    await enviarEmailIngresso(pedido);

    // Virada automática de lote
    const { data: loteAtual } = await supabase.from('lotes').select('*').eq('id', pedido.lote_id).single();
    if (loteAtual && loteAtual.vendidos >= loteAtual.total) {
      await supabase.from('lotes').update({ ativo: false }).eq('id', loteAtual.id);
      const { data: proximoLote } = await supabase.from('lotes').select('*').eq('ativo', false).gt('ordem', loteAtual.ordem).order('ordem').limit(1).single();
      if (proximoLote) await supabase.from('lotes').update({ ativo: true }).eq('id', proximoLote.id);
    }
  } catch (err) {
    console.error('Webhook erro:', err.message);
  }
});

// ════════════════════════════════════
// INGRESSOS DO USUÁRIO
// ════════════════════════════════════
router.get('/meus-ingressos/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('pedidos').select('*').eq('user_id', req.params.userId).order('criado_em', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/pedido/status/:codigo', async (req, res) => {
  try {
    const { data, error } = await supabase.from('pedidos').select('*').eq('codigo', req.params.codigo).single();
    if (error || !data) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ════════════════════════════════════
// ADMIN — CORTESIAS
// ════════════════════════════════════
router.post('/admin/cortesia', adminAuth, async (req, res) => {
  try {
    const { nome, email, loteId, motivo } = req.body;
    const codigo = 'LCP-CORT-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const { data: lote } = await supabase.from('lotes').select('*').eq('id', loteId).single()
      || await supabase.from('lotes').select('*').eq('ativo', true).single();

    const pedido = {
      id: uuidv4(), codigo,
      user_id: null, nome, email,
      lote_id: lote?.id || loteId,
      lote_nome: lote?.nome || 'Cortesia',
      addons_json: [], cupom: '', desconto: 0, total: 0,
      pagamento: 'cortesia', status: 'pago',
      checkin: false, cortesia: true, motivo: motivo || '',
      criado_em: new Date().toISOString()
    };

    await supabase.from('pedidos').insert([pedido]);
    await enviarEmailIngresso(pedido);
    res.json({ ok: true, codigo });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ════════════════════════════════════
// ADMIN — CHECK-IN
// ════════════════════════════════════
router.post('/admin/checkin/:codigo', adminAuth, async (req, res) => {
  try {
    const { data: pedido } = await supabase.from('pedidos').select('*').eq('codigo', req.params.codigo).single();
    if (!pedido) return res.status(404).json({ erro: 'Ingresso não encontrado.' });
    if (pedido.status !== 'pago') return res.status(400).json({ erro: 'Ingresso não está pago.' });
    if (pedido.checkin) return res.status(400).json({ erro: 'Check-in já realizado!', pedido });

    await supabase.from('pedidos').update({ checkin: true, checkin_em: new Date().toISOString() }).eq('codigo', req.params.codigo);
    res.json({ ok: true, mensagem: '✅ Check-in realizado!', pedido });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ════════════════════════════════════
// ADMIN — DASHBOARD
// ════════════════════════════════════
router.get('/admin/dashboard', adminAuth, async (req, res) => {
  try {
    const [pedidos, lotes, contas] = await Promise.all([
      supabase.from('pedidos').select('*'),
      supabase.from('lotes').select('*'),
      supabase.from('contas').select('id')
    ]);

    const pagos = (pedidos.data || []).filter(p => p.status === 'pago');
    const receita = pagos.reduce((s, p) => s + Number(p.total), 0);
    const checkins = pagos.filter(p => p.checkin).length;

    res.json({
      totalVendas: pagos.length,
      receita: receita.toFixed(2),
      checkins,
      totalContas: (contas.data || []).length,
      lotes: lotes.data || [],
      pedidos: pedidos.data || []
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/admin/compradores', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('pedidos').select('*').order('criado_em', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
