# 🚀 Script de Correção do Erro 404

## 📋 Passos para Corrigir o Erro

### 1. **Commit das Mudanças**
```bash
git add .
git commit -m "fix: corrigir configuração de subdomínios para starvibe.space"
git push origin main
```

### 2. **Configuração no Vercel Dashboard**

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto `uproomvp`
3. Vá em **Settings** > **Domains**
4. Adicione os seguintes domínios:
   - `starvibe.space`
   - `*.starvibe.space` (wildcard para subdomínios)

### 3. **Configuração DNS**

Configure no seu provedor de DNS (onde está registrado starvibe.space):

```
Tipo: A
Nome: @
Valor: 76.76.19.61

Tipo: CNAME
Nome: www  
Valor: cname.vercel-dns.com

Tipo: CNAME
Nome: *
Valor: cname.vercel-dns.com
```

### 4. **Variáveis de Ambiente no Vercel**

No painel do Vercel, vá em **Settings** > **Environment Variables** e adicione:

```bash
NODE_ENV=production
VITE_DOMAIN=starvibe.space
VITE_MAIN_DOMAIN=starvibe.space
VITE_PRODUCTION_DOMAIN=starvibe.space
VITE_WILDCARD_SUPPORT=true
VITE_API_URL=https://sua-api.railway.app
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

### 5. **Redeploy**

Após configurar tudo:
1. Vá em **Deployments** no Vercel
2. Clique nos três pontos do último deployment
3. Selecione **Redeploy**

## ✅ Verificação

Após implementar todas as correções:

1. **Domínio principal**: `https://starvibe.space` → Landing page
2. **Subdomínio**: `https://visitala.starvibe.space` → Workspace da empresa
3. **Outros subdomínios**: Qualquer `*.starvibe.space` funcionará

## 🔍 Troubleshooting

Se ainda houver problemas:

1. **Verifique o DNS**: Use `nslookup starvibe.space`
2. **Aguarde propagação**: DNS pode levar até 24h
3. **Verifique logs**: No Vercel Dashboard > Functions > View Function Logs
4. **Teste local**: `npm run build && npm run preview`

## 📞 Suporte

Se o problema persistir, verifique:
- Configuração DNS está correta
- Domínio está adicionado no Vercel
- Variáveis de ambiente estão configuradas
- Build está funcionando localmente
