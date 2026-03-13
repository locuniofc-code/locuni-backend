# LOCUNI PASS — Guia Completo de Deploy
## Para Windows, do zero ao ar 🚀

---

## VISÃO GERAL DO QUE VAMOS FAZER

```
[Seu HTML] ←→ [Backend no Railway] ←→ [Supabase (banco)]
                      ↕                       
             [Mercado Pago (pagamento)]        
                      ↕                       
               [Resend (e-mail)]               
```

Custo total: **R$ 0** (todos têm plano gratuito suficiente)

---

## PARTE 1 — INSTALAR AS FERRAMENTAS NO WINDOWS

### Passo 1.1 — Instalar Node.js

1. Acesse: **https://nodejs.org**
2. Clique no botão verde grande **"LTS"** (versão recomendada)
3. Baixe o instalador `.msi`
4. Execute o instalador e clique **Next > Next > Install**
5. Quando terminar, **reinicie o computador**

**Verificar instalação:**
- Aperte `Windows + R`
- Digite `cmd` e pressione Enter
- No terminal preto que abrir, digite:
```
node --version
```
- Deve aparecer algo como `v20.0.0` ✅

### Passo 1.2 — Instalar Git

1. Acesse: **https://git-scm.com/download/win**
2. Baixe e instale com todas as opções padrão
3. Após instalar, feche e abra o terminal novamente

---

## PARTE 2 — CONFIGURAR O SUPABASE (Banco de Dados)

### Passo 2.1 — Criar conta e projeto

1. Acesse **https://supabase.com** e clique em **"Start your project"**
2. Entre com sua conta Google ou crie uma conta nova
3. Clique em **"New project"**
4. Preencha:
   - **Name:** locuni-pass
   - **Database Password:** anote essa senha! (ex: MinhaSenh@123)
   - **Region:** South America (São Paulo)
5. Clique **"Create new project"** — vai levar ~2 minutos para criar

### Passo 2.2 — Criar as tabelas

1. No menu esquerdo, clique em **"SQL Editor"**
2. Clique em **"New query"**
3. Abra o arquivo `supabase_schema.sql` com o Bloco de Notas
4. Selecione todo o conteúdo (`Ctrl+A`) e copie (`Ctrl+C`)
5. Cole no editor do Supabase (`Ctrl+V`)
6. Clique no botão **"Run"** (ou `Ctrl+Enter`)
7. Deve aparecer "Success. No rows returned" ✅

### Passo 2.3 — Pegar as chaves de API

1. No menu esquerdo, clique em **"Project Settings"** (ícone de engrenagem)
2. Clique em **"API"**
3. Anote esses dois valores (vai precisar deles depois):
   - **URL:** algo como `https://abcdefgh.supabase.co`
   - **service_role key:** uma chave longa que começa com `eyJ...`
   
   ⚠️ A `service_role` é secreta — nunca coloque no frontend!

---

## PARTE 3 — CONFIGURAR O MERCADO PAGO

### Passo 3.1 — Criar conta de desenvolvedor

1. Acesse **https://www.mercadopago.com.br/developers**
2. Faça login ou crie sua conta
3. Clique em **"Suas integrações"** > **"Criar aplicação"**
4. Preencha o nome: `LOCUNI PASS`
5. Selecione **"Checkout Pro"**
6. Clique em **"Criar aplicação"**

### Passo 3.2 — Pegar o Access Token

1. Na sua aplicação criada, clique em **"Credenciais de produção"**
2. Anote o **Access Token** (começa com `APP_USR-...`)

   🔧 Para testar sem dinheiro real, use **"Credenciais de teste"**
   e use o token que começa com `TEST-...`

---

## PARTE 4 — CONFIGURAR O RESEND (E-mails)

### Passo 4.1 — Criar conta

1. Acesse **https://resend.com** e clique em **"Sign Up"**
2. Crie conta com e-mail

### Passo 4.2 — Pegar API Key

1. No menu, clique em **"API Keys"**
2. Clique em **"Create API Key"**
3. Nome: `locuni-pass`
4. Permission: **Full access**
5. Copie a chave que começa com `re_...`

### Passo 4.3 — Configurar domínio (opcional mas recomendado)

Se você tiver um domínio (ex: locunipass.com.br):
1. Clique em **"Domains"** > **"Add Domain"**
2. Siga as instruções para adicionar os registros DNS

Se não tiver domínio, use o domínio padrão do Resend por enquanto.

---

## PARTE 5 — SUBIR O BACKEND NO RAILWAY

### Passo 5.1 — Preparar a pasta do backend

1. Crie uma pasta chamada `locuni-backend` na sua Área de Trabalho
2. Copie todos os arquivos que vieram neste pacote para dentro dela:
   ```
   locuni-backend/
   ├── src/
   │   ├── server.js
   │   ├── routes.js
   │   ├── email.js
   │   └── supabase.js
   ├── package.json
   ├── railway.json
   ├── .gitignore
   └── .env.example
   ```

3. Dentro da pasta `locuni-backend`, crie um arquivo chamado `.env`
   (exatamente assim, com o ponto no começo)

   ⚠️ No Windows Explorer, para criar um arquivo que começa com ponto:
   - Abra o Bloco de Notas
   - File > Save As
   - No campo "Nome do arquivo" digite: `.env`
   - Em "Tipo" selecione: "Todos os arquivos (*.*)"
   - Navegue até a pasta `locuni-backend` e salve

4. Abra o `.env` e preencha com suas chaves:
   ```
   SUPABASE_URL=https://SEU_PROJETO.supabase.co
   SUPABASE_SERVICE_KEY=eyJ...sua_service_role_key...
   
   MP_ACCESS_TOKEN=APP_USR-...seu_token_mp...
   MP_WEBHOOK_SECRET=uma_senha_qualquer_ex_locuni123
   
   RESEND_API_KEY=re_...sua_chave_resend...
   EMAIL_FROM=ingressos@seudominio.com.br
   
   PORT=3000
   FRONTEND_URL=https://seusite.netlify.app
   NODE_ENV=production
   
   ADMIN_SECRET=escolha_uma_senha_forte_aqui
   ```

### Passo 5.2 — Criar conta no Railway

1. Acesse **https://railway.app**
2. Clique em **"Login"** > **"Login with GitHub"**
3. Se não tiver GitHub, crie em **https://github.com** primeiro (é grátis)

### Passo 5.3 — Subir o projeto

1. No terminal (`cmd`), navegue até a pasta:
   ```
   cd Desktop\locuni-backend
   ```
2. Instale as dependências:
   ```
   npm install
   ```
3. Inicie o Git no projeto:
   ```
   git init
   git add .
   git commit -m "locuni backend inicial"
   ```
4. Crie um repositório no GitHub:
   - Acesse **https://github.com/new**
   - Nome: `locuni-backend`
   - Deixe **Privado** (Private)
   - Clique **"Create repository"**
   - Copie os comandos que ele mostrar para "push an existing repository"
   - Cole e execute no terminal

5. No Railway, clique em **"New Project"** > **"Deploy from GitHub repo"**
6. Selecione o repositório `locuni-backend`
7. O Railway vai detectar automaticamente que é Node.js e fazer o deploy

### Passo 5.4 — Adicionar as variáveis de ambiente no Railway

1. No painel do seu projeto no Railway, clique na aba **"Variables"**
2. Clique em **"New Variable"** para cada linha do seu `.env`:
   - `SUPABASE_URL` = sua url
   - `SUPABASE_SERVICE_KEY` = sua chave
   - `MP_ACCESS_TOKEN` = seu token
   - `RESEND_API_KEY` = sua chave
   - `EMAIL_FROM` = seu email
   - `FRONTEND_URL` = url do seu site
   - `NODE_ENV` = production
   - `ADMIN_SECRET` = sua senha admin
3. Após adicionar todas, o Railway vai reiniciar automaticamente

### Passo 5.5 — Pegar a URL do backend

1. No Railway, clique em **"Settings"** > **"Domains"**
2. Clique em **"Generate Domain"**
3. Vai aparecer algo como: `locuni-backend-production.up.railway.app`
4. Anote essa URL — é o endereço do seu backend!

---

## PARTE 6 — CONFIGURAR O WEBHOOK DO MERCADO PAGO

1. No Mercado Pago Developer, vá em sua aplicação
2. Clique em **"Webhooks"** > **"Configurar notificações"**
3. Em URL, coloque:
   ```
   https://SEU-BACKEND.up.railway.app/api/webhook/mp
   ```
4. Marque o evento **"Pagamentos"**
5. Salve

---

## PARTE 7 — CONECTAR O FRONTEND AO BACKEND

Abra o arquivo `LOCUNI_PASS_v3.html` e adicione esta linha logo após a tag `<script>`:

```javascript
const API_URL = 'https://SEU-BACKEND.up.railway.app'
```

Depois substitua as chamadas de localStorage por chamadas à API.
(O arquivo `LOCUNI_PASS_v4.html` já faz isso automaticamente)

---

## PARTE 8 — SUBIR O FRONTEND NO NETLIFY

1. Acesse **https://netlify.com** e crie conta grátis
2. Clique em **"Add new site"** > **"Deploy manually"**
3. Arraste o arquivo `LOCUNI_PASS_v4.html` para a área indicada
4. Em segundos seu site estará no ar!
5. Copie a URL do site (ex: `meufest.netlify.app`)
6. Volte ao Railway e atualize a variável `FRONTEND_URL` com essa URL

---

## TESTAR TUDO

### Teste 1 — Backend funcionando
Abra no navegador:
```
https://SEU-BACKEND.up.railway.app/health
```
Deve aparecer: `{"ok":true,"versao":"3.0.0"}`

### Teste 2 — Banco conectado
```
https://SEU-BACKEND.up.railway.app/api/lotes
```
Deve aparecer os 5 lotes em JSON

### Teste 3 — Pagamento (modo teste MP)
1. No site, cadastre uma conta e tente comprar
2. Use cartão de teste: `4009 1753 3280 6176` / validade: qualquer data futura / CVV: 123
3. Deve processar e enviar e-mail

---

## PROBLEMAS COMUNS

**"node não é reconhecido como comando"**
→ Reinicie o computador após instalar o Node.js

**"Erro de CORS"**
→ Atualize a variável FRONTEND_URL no Railway com a URL exata do seu site

**"Payment not found" no webhook**
→ Confirme que a URL do webhook no Mercado Pago está correta

**E-mail não chega**
→ Verifique a API Key do Resend e se o domínio está verificado

---

## CUSTOS (tudo grátis no início)

| Serviço    | Plano Grátis         | Limite              |
|------------|----------------------|---------------------|
| Railway    | $5 crédito/mês       | ~500h rodando       |
| Supabase   | Free tier            | 500MB banco, 50k req/mês |
| Resend     | Free tier            | 3.000 e-mails/mês   |
| Netlify    | Free tier            | 100GB banda/mês     |
| Mercado Pago | Sem mensalidade   | Taxa por transação  |

Para um evento universitário médio, esses limites são mais que suficientes.

---

## PRECISA DE AJUDA?

Se travar em qualquer passo, volte ao Claude e diga:
"Travei no passo X do guia" — com o erro que apareceu no terminal.
