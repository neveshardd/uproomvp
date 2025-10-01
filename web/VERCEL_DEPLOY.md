# Deploy no Vercel - UpRoom Frontend

## Problemas Identificados e Soluções

### 1. **Problema: Redirecionamento para página da Vercel**
- **Causa**: Vercel está servindo a página padrão em vez do seu app React
- **Solução**: Configuração correta do `vercel.json` e roteamento

### 2. **Problema: Imagens da Vercel aparecendo**
- **Causa**: Assets não estão sendo servidos corretamente
- **Solução**: Configuração de build e assets no Vite

### 3. **Problema: Redirecionamento incorreto para vercel.com/neves-hard**
- **Causa**: Lógica de detecção de subdomínios não funcionava com Vercel
- **Solução**: Correção da lógica de detecção e redirecionamento para Vercel

## Configurações Implementadas

### 1. **vercel.json** - Configuração do Vercel
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### 2. **vite.config.ts** - Configuração de Build
- Adicionado `base: '/'` para garantir paths corretos
- Configuração de build otimizada
- Chunks manuais para melhor performance

### 3. **middleware.ts** - Roteamento de Subdomínios
- Detecta subdomínios automaticamente
- Redireciona corretamente para o app React
- Preserva funcionalidade de workspace

### 4. **Correções de Subdomínios** - Lógica de Detecção
- ✅ Detecção correta para Vercel (`subdomain.uproomvp.vercel.app`)
- ✅ Redirecionamento correto para domínio base
- ✅ Debug integrado para identificar problemas
- ✅ Suporte a localhost e produção

## Variáveis de Ambiente Necessárias

Configure estas variáveis no painel do Vercel:

```bash
# API Configuration
VITE_API_URL=https://sua-api.railway.app
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima

# Domain Configuration  
VITE_DOMAIN=uproom.com

# Environment
NODE_ENV=production
```

## Como Fazer o Deploy

### 1. **Preparação**
```bash
cd web
npm install
npm run build
```

### 2. **Deploy no Vercel**
1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Defina o **Build Command**: `npm run build`
4. Defina o **Output Directory**: `dist`
5. Faça o deploy

### 3. **Configuração de Domínio**
1. No painel do Vercel, vá para **Settings** > **Domains**
2. Adicione seu domínio personalizado
3. Configure DNS para apontar para o Vercel

## Configuração de Subdomínios

### Para Subdomínios Funcionarem:
1. **DNS**: Configure wildcard DNS (`*.uproom.com`) para apontar para o Vercel
2. **Vercel**: Adicione o domínio principal no painel
3. **App**: O middleware detecta automaticamente subdomínios

### Exemplo de Configuração DNS:
```
Type: CNAME
Name: *
Value: cname.vercel-dns.com
```

## Estrutura de Arquivos

```
web/
├── vercel.json          # Configuração do Vercel
├── .vercelignore        # Arquivos ignorados
├── src/
│   ├── middleware.ts    # Middleware para subdomínios
│   └── lib/
│       └── subdomain.ts # Lógica de subdomínios
├── dist/                # Build de produção
└── package.json
```

## Solução de Problemas

### Se ainda aparecer página da Vercel:
1. Verifique se o `vercel.json` está correto
2. Confirme que o build está gerando arquivos em `dist/`
3. Verifique as variáveis de ambiente

### Se subdomínios não funcionarem:
1. Verifique configuração DNS
2. Confirme que o domínio está configurado no Vercel
3. Teste com `subdomain.seudominio.com`

### Se assets não carregarem:
1. Verifique se `base: '/'` está no `vite.config.ts`
2. Confirme que os arquivos estão em `dist/assets/`
3. Verifique as rotas no `vercel.json`

## Próximos Passos

1. ✅ Configure as variáveis de ambiente no Vercel
2. ✅ Faça o deploy
3. ✅ Configure o domínio personalizado
4. ✅ Teste subdomínios
5. ✅ Verifique se a landing page aparece corretamente

## Comandos Úteis

```bash
# Build local para teste
npm run build

# Preview local
npm run preview

# Verificar build
ls -la dist/
```
