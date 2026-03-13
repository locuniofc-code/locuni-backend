// src/routes.js — Todas as rotas da API
const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const supabase = require('./supabase')
const { enviarConfirmacao, enviarCortesia } = require('./email')
require('dotenv').config()

// ─── HELPER ───
const mp = () => {
  const { MercadoPagoConfig, Preference, Payment } = require('mercadopago')
  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  return { Preference, Payment, client }
}

// ══════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════

// POST /api/auth/cadastro
router.post('/auth/cadastro', async (req, res) => {
  const { nome, email, cpf, senha } = req.body
  if (!nome || !email || !cpf || !senha)
    return res.status(400).json({ erro: 'Preencha todos os campos.' })
  if (senha.length < 6)
    return res.status(400).json({ erro: 'Senha mínimo 6 caracteres.' })

  const { data: existe } = await supabase
    .from('contas').select('id').eq('email', email).single()
  if (existe) return res.status(409).json({ erro: 'E-mail já cadastrado.' })

  // Hash simples com btoa (em produção use bcrypt!)
  const senha_hash = Buffer.from(senha).toString('base64')

  const { data, error } = await supabase
    .from('contas').insert({ nome, email, cpf, senha_hash }).select().single()

  if (error) return res.status(500).json({ erro: error.message })
  res.json({ ok: true, usuario: { id: data.id, nome: data.nome, email: data.email } })
})

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  const { email, senha } = req.body
  const senha_hash = Buffer.from(senha).toString('base64')

  const { data, error } = await supabase
    .from('contas').select('id,nome,email,cpf')
    .eq('email', email).eq('senha_hash', senha_hash).single()

  if (error || !data)
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' })

  res.json({ ok: true, usuario: data })
})

// ══════════════════════════════════════════
//  DADOS PÚBLICOS
// ══════════════════════════════════════════

// GET /api/eventos
router.get('/eventos', async (req, res) => {
  const { data, error } = await supabase
    .from('eventos').select('*').eq('ativo', true).order('featured', { ascending: false })
  if (error) return res.status(500).json({ erro: error.message })
  res.json(data)
})

// GET /api/lotes
router.get('/lotes', async (req, res) => {
  const { data, error } = await supabase
    .from('lotes').select('*').order('ordem')
  if (error) return res.status(500).json({ erro: error.message })
  res.json(data)
})

// GET /api/addons
router.get('/addons', async (req, res) => {
  const { data, error } = await supabase
    .from('addons').select('*').eq('ativo', true)
  if (error) return res.status(500).json({ erro: error.message })
  res.json(data)
})

// POST /api/cupom/validar
router.post('/cupom/validar', async (req, res) => {
  const { codigo, subtotal } = req.body
  const { data, error } = await supabase
    .from('cupons').select('*').eq('codigo', codigo.toUpperCase()).eq('ativo', true).single()
  if (error || !data) return res.status(404).json({ erro: 'Cupom inválido.' })
  if (data.usados >= data.limite) return res.status(400).json({ erro: 'Cupom esgotado.' })
  const desconto = data.tipo === '%' ? (subtotal * data.valor / 100) : data.valor
  res.json({ ok: true, desconto, codigo: data.codigo, tipo: data.tipo, valor: data.valor })
})

// ══════════════════════════════════════════
//  MERCADO PAGO — CRIAR PREFERÊNCIA
// ══════════════════════════════════════════

// POST /api/pagamento/criar
router.post('/pagamento/criar', async (req, res) => {
  const { userId, nome, email, loteId, addonsIds, cupom } = req.body

  // Buscar lote
  const { data: lote } = await supabase.from('lotes').select('*').eq('id', loteId).single()
  if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' })
  if (!lote.ativo) return res.status(400).json({ erro: 'Este lote não está ativo.' })
  if (lote.vendidos >= lote.total) return res.status(400).json({ erro: 'Lote esgotado!' })

  // Calcular addons
  let addonsTotal = 0
  let addonsData = []
  if (addonsIds && addonsIds.length > 0) {
    const { data: addons } = await supabase.from('addons').select('*').in('id', addonsIds.map(a => a.id))
    addons && addons.forEach(a => {
      const item = addonsIds.find(x => x.id === a.id)
      const qty = item ? item.qty : 1
      addonsTotal += a.preco * qty
      addonsData.push({ id: a.id, emoji: a.emoji, nome: a.nome, qty, preco: a.preco })
    })
  }

  // Cupom
  let desconto = 0
  let cupomCod = ''
  if (cupom) {
    const { data: c } = await supabase.from('cupons').select('*').eq('codigo', cupom.toUpperCase()).eq('ativo', true).single()
    if (c && c.usados < c.limite) {
      desconto = c.tipo === '%' ? ((lote.preco + addonsTotal) * c.valor / 100) : c.valor
      cupomCod = c.codigo
    }
  }

  const subtotal = lote.preco + addonsTotal
  const total = Math.max(0, subtotal - desconto)
  const codigo = 'LCP-2026-' + Math.random().toString(36).substring(2, 7).toUpperCase()

  // Criar pedido como pendente
  const { data: pedido, error: pedidoErr } = await supabase.from('pedidos').insert({
    codigo,
    user_id: userId || null,
    nome,
    email,
    lote_id: lote.id,
    lote_nome: lote.nome,
    preco_ingresso: lote.preco,
    addons_json: addonsData,
    cupom: cupomCod,
    desconto,
    total,
    pagamento: 'pix',
    status: 'pendente'
  }).select().single()

  if (pedidoErr) return res.status(500).json({ erro: pedidoErr.message })

  // Criar preferência Mercado Pago
  try {
    const { Preference, client } = mp()
    const preference = new Preference(client)

    const itens = [
      {
        id: lote.id,
        title: `LOCUNI FEST 2026 — ${lote.nome}`,
        quantity: 1,
        unit_price: Number(lote.preco),
        currency_id: 'BRL'
      },
      ...addonsData.map(a => ({
        id: a.id,
        title: `${a.emoji} ${a.nome}`,
        quantity: a.qty,
        unit_price: Number(a.preco),
        currency_id: 'BRL'
      }))
    ]

    if (desconto > 0) {
      itens.push({ id: 'desconto', title: `Desconto (${cupomCod})`, quantity: 1, unit_price: -Number(desconto.toFixed(2)), currency_id: 'BRL' })
    }

    const result = await preference.create({
      body: {
        items: itens,
        payer: { name: nome, email },
        external_reference: pedido.id,
        notification_url: `${process.env.FRONTEND_URL}/api/webhook/mp`,
        back_urls: {
          success: `${process.env.FRONTEND_URL}/sucesso?codigo=${codigo}`,
          failure: `${process.env.FRONTEND_URL}/falha`,
          pending: `${process.env.FRONTEND_URL}/pendente`
        },
        auto_return: 'approved',
        statement_descriptor: 'LOCUNI PASS',
        expires: true,
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30min
      }
    })

    // Salvar preference_id no pedido
    await supabase.from('pedidos').update({ mp_preference_id: result.id }).eq('id', pedido.id)

    res.json({
      ok: true,
      pedidoId: pedido.id,
      codigo,
      checkoutUrl: result.init_point,       // URL completa MP
      checkoutUrlSandbox: result.sandbox_init_point  // Para testes
    })
  } catch (e) {
    console.error('Erro MP:', e)
    res.status(500).json({ erro: 'Erro ao criar pagamento. Tente novamente.' })
  }
})

// ══════════════════════════════════════════
//  WEBHOOK MERCADO PAGO
// ══════════════════════════════════════════

// POST /api/webhook/mp
router.post('/webhook/mp', async (req, res) => {
  const { type, data } = req.body
  console.log('Webhook MP recebido:', type, data)

  if (type === 'payment' && data && data.id) {
    try {
      const { Payment, client } = mp()
      const payment = new Payment(client)
      const pagamento = await payment.get({ id: data.id })

      if (pagamento.status === 'approved') {
        const pedidoId = pagamento.external_reference

        // Buscar pedido
        const { data: pedido } = await supabase.from('pedidos').select('*').eq('id', pedidoId).single()
        if (!pedido || pedido.status === 'pago') return res.sendStatus(200)

        // Marcar como pago
        await supabase.from('pedidos').update({
          status: 'pago',
          mp_payment_id: String(data.id),
          pagamento: pagamento.payment_type_id || 'pix'
        }).eq('id', pedidoId)

        // Atualizar lote vendidos
        const { data: lote } = await supabase.from('lotes').select('*').eq('id', pedido.lote_id).single()
        if (lote) {
          const novosVendidos = lote.vendidos + 1
          const novoStatus = novosVendidos >= lote.total ? 'esgotado' : lote.status
          await supabase.from('lotes').update({ vendidos: novosVendidos, status: novoStatus }).eq('id', lote.id)

          // Virada automática de lote!
          if (novosVendidos >= lote.total) {
            const { data: proxLote } = await supabase.from('lotes')
              .select('*').eq('status', 'em breve').order('ordem').limit(1).single()
            if (proxLote) {
              await supabase.from('lotes').update({ ativo: false }).eq('id', lote.id)
              await supabase.from('lotes').update({ ativo: true, status: 'ativo' }).eq('id', proxLote.id)
              console.log(`✅ Lote virado automaticamente: ${lote.nome} → ${proxLote.nome}`)
            }
          }
        }

        // Atualizar cupom usado
        if (pedido.cupom) {
          await supabase.from('cupons').update({ usados: supabase.raw('usados + 1') }).eq('codigo', pedido.cupom)
        }

        // Enviar e-mail de confirmação
        await enviarConfirmacao(pedido)
        console.log(`✅ Pedido ${pedido.codigo} pago e e-mail enviado!`)
      }
    } catch (e) {
      console.error('Erro no webhook:', e)
    }
  }

  res.sendStatus(200)
})

// GET /api/pedido/status/:codigo
router.get('/pedido/status/:codigo', async (req, res) => {
  const { data, error } = await supabase
    .from('pedidos').select('codigo,status,lote_nome,total,criado_em').eq('codigo', req.params.codigo).single()
  if (error || !data) return res.status(404).json({ erro: 'Pedido não encontrado.' })
  res.json(data)
})

// GET /api/meus-ingressos/:userId
router.get('/meus-ingressos/:userId', async (req, res) => {
  const { data, error } = await supabase
    .from('pedidos').select('*').eq('user_id', req.params.userId).order('criado_em', { ascending: false })
  if (error) return res.status(500).json({ erro: error.message })
  res.json(data)
})

// ══════════════════════════════════════════
//  ADMIN — autenticação simples por header
// ══════════════════════════════════════════

function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret']
  if (secret !== process.env.ADMIN_SECRET)
    return res.status(401).json({ erro: 'Não autorizado.' })
  next()
}

// GET /api/admin/dashboard
router.get('/admin/dashboard', adminAuth, async (req, res) => {
  const [lotes, pedidos, cupons, cortesias] = await Promise.all([
    supabase.from('lotes').select('*'),
    supabase.from('pedidos').select('*').eq('status', 'pago'),
    supabase.from('cupons').select('*'),
    supabase.from('cortesias').select('*')
  ])
  const p = pedidos.data || []
  const l = lotes.data || []
  res.json({
    lotes: l,
    pedidos: p,
    cupons: cupons.data || [],
    cortesias: cortesias.data || [],
    kpis: {
      totalVendidos: p.length,
      receita: p.reduce((s, x) => s + Number(x.total), 0),
      ticketMedio: p.length > 0 ? p.reduce((s, x) => s + Number(x.total), 0) / p.length : 0,
      totalIngressos: l.reduce((s, x) => s + x.total, 0),
      disponivel: l.reduce((s, x) => s + (x.total - x.vendidos), 0),
      checkinFeito: p.filter(x => x.checkin).length,
    }
  })
})

// PUT /api/admin/lote/:id
router.put('/admin/lote/:id', adminAuth, async (req, res) => {
  const { nome, preco, total, vendidos, status, ativo } = req.body
  if (ativo) {
    // Desativar todos os outros antes
    await supabase.from('lotes').update({ ativo: false }).neq('id', req.params.id)
  }
  const { data, error } = await supabase
    .from('lotes').update({ nome, preco, total, vendidos, status, ativo }).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ erro: error.message })
  res.json(data)
})

// POST /api/admin/evento
router.post('/admin/evento', adminAuth, async (req, res) => {
  const { data, error } = await supabase.from('eventos').insert(req.body).select().single()
  if (error) return res.status(500).json({ erro: error.message })
  res.json(data)
})

// PUT /api/admin/evento/:id
router.put('/admin/evento/:id', adminAuth, async (req, res) => {
  const { data, error } = await supabase.from('eventos').update(req.body).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ erro: error.message })
  res.json(data)
})

// DELETE /api/admin/evento/:id
router.delete('/admin/evento/:id', adminAuth, async (req, res) => {
  await supabase.from('eventos').delete().eq('id', req.params.id)
  res.json({ ok: true })
})

// POST /api/admin/cupom
router.post('/admin/cupom', adminAuth, async (req, res) => {
  const { data, error } = await supabase.from('cupons').insert(req.body).select().single()
  if (error) return res.status(500).json({ erro: error.message })
  res.json(data)
})

// PUT /api/admin/cupom/:id
router.put('/admin/cupom/:id', adminAuth, async (req, res) => {
  const { data, error } = await supabase.from('cupons').update(req.body).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ erro: error.message })
  res.json(data)
})

// DELETE /api/admin/cupom/:id
router.delete('/admin/cupom/:id', adminAuth, async (req, res) => {
  await supabase.from('cupons').delete().eq('id', req.params.id)
  res.json({ ok: true })
})

// POST /api/admin/addon
router.post('/admin/addon', adminAuth, async (req, res) => {
  const { data, error } = await supabase.from('addons').insert(req.body).select().single()
  if (error) return res.status(500).json({ erro: error.message })
  res.json(data)
})

// PUT /api/admin/addon/:id
router.put('/admin/addon/:id', adminAuth, async (req, res) => {
  const { data, error } = await supabase.from('addons').update(req.body).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ erro: error.message })
  res.json(data)
})

// POST /api/admin/cortesia
router.post('/admin/cortesia', adminAuth, async (req, res) => {
  const { nome, email, loteId, motivo, observacao } = req.body
  if (!nome || !email || !loteId) return res.status(400).json({ erro: 'Preencha nome, email e lote.' })

  const { data: lote } = await supabase.from('lotes').select('*').eq('id', loteId).single()
  if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' })

  const codigo = 'LCP-CORT-' + Math.random().toString(36).substring(2, 7).toUpperCase()

  // Criar pedido cortesia
  const { data: pedido, error: pe } = await supabase.from('pedidos').insert({
    codigo,
    user_id: null,
    nome, email,
    lote_id: lote.id,
    lote_nome: lote.nome,
    preco_ingresso: lote.preco,
    addons_json: [],
    cupom: 'CORTESIA',
    desconto: lote.preco,
    total: 0,
    pagamento: 'cortesia',
    status: 'pago',
    cortesia: true,
    motivo_cortesia: motivo
  }).select().single()

  if (pe) return res.status(500).json({ erro: pe.message })

  // Criar registro de cortesia
  await supabase.from('cortesias').insert({
    pedido_id: pedido.id,
    nome, email,
    lote_nome: lote.nome,
    motivo,
    observacao: observacao || ''
  })

  // Enviar e-mail
  await enviarCortesia(pedido)

  res.json({ ok: true, codigo, pedido })
})

// POST /api/admin/checkin/:codigo
router.post('/admin/checkin/:codigo', adminAuth, async (req, res) => {
  const { data: pedido } = await supabase
    .from('pedidos').select('*').eq('codigo', req.params.codigo.toUpperCase()).single()
  if (!pedido) return res.status(404).json({ erro: 'Código não encontrado.' })
  if (pedido.status !== 'pago') return res.status(400).json({ erro: 'Ingresso não está pago/válido.' })
  if (pedido.checkin) return res.json({ ok: true, jaFeito: true, nome: pedido.nome, lote: pedido.lote_nome })

  await supabase.from('pedidos').update({ checkin: true, checkin_hora: new Date().toISOString() }).eq('id', pedido.id)
  res.json({ ok: true, jaFeito: false, nome: pedido.nome, lote: pedido.lote_nome, codigo: pedido.codigo })
})

// GET /api/admin/compradores
router.get('/admin/compradores', adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('pedidos').select('*').eq('status', 'pago').order('criado_em', { ascending: false })
  if (error) return res.status(500).json({ erro: error.message })
  res.json(data)
})

module.exports = router
