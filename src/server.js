require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || '*',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ],
  credentials: true
}));

app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { erro: 'Muitas requisições. Tente novamente em 15 minutos.' }
});
app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({ ok: true, versao: '3.0.0', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use((err, req, res, next) => {
  console.error('Erro:', err.message);
  res.status(500).json({ erro: err.message || 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 LOCUNI PASS Backend rodando na porta ${PORT}`);
});
