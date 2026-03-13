// src/server.js — Servidor principal LOCUNI PASS
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const routes = require('./routes')

const app = express()
const PORT = process.env.PORT || 3000

// ─── MIDDLEWARES ───
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000'
  ],
  credentials: true
}))

// Rate limit geral
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { erro: 'Muitas requisições. Tente novamente em 15 minutos.' }
}))

// Rate limit mais apertado para pagamento
app.use('/api/pagamento', rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { erro: 'Limite de tentativas atingido. Aguarde 1 minuto.' }
}))

app.use(express.json())

// ─── ROTAS ───
app.use('/api', routes)

// Health check
app.get('/health', (req, res) => res.json({ ok: true, versao: '3.0.0', env: process.env.NODE_ENV }))

// ─── START ───
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║      LOCUNI PASS — Backend v3.0       ║
╠═══════════════════════════════════════╣
║  🚀 Rodando na porta ${PORT}             ║
║  🌍 Env: ${(process.env.NODE_ENV||'development').padEnd(28)}║
║  💾 Supabase: conectado               ║
╚═══════════════════════════════════════╝
  `)
})

module.exports = app
