# 🔧 Configuração DNS para Corrigir Redirecionamentos Infinitos

## 🚨 Problema Identificado
O erro `ERR_TOO_MANY_REDIRECTS` está acontecendo porque há um loop entre `www.starvibe.space` e `starvibe.space`.

## ✅ Solução Implementada

### 1. **Correção no Código**
- ✅ Criado `lib/redirect-fix.ts` para detectar e corrigir redirecionamentos
- ✅ Adicionado ao `main.tsx` para auto-inicialização
- ✅ Criado `vercel-redirect-fix.json` com configuração otimizada

### 2. **Configuração DNS Necessária**

No seu provedor de DNS (onde está registrado `starvibe.space`), configure:

```dns
# Registro A para domínio principal
Tipo: A
Nome: @
Valor: 76.76.19.61
TTL: 3600

# Registro A para www (aponta para o mesmo IP)
Tipo: A  
Nome: www
Valor: 76.76.19.61
TTL: 3600

# CNAME para subdomínios wildcard
Tipo: CNAME
Nome: *
Valor: cname.vercel-dns.com
TTL: 3600
```

### 3. **Configuração no Vercel**

1. **Acesse o Vercel Dashboard**
2. **Vá em Settings > Domains**
3. **Adicione os domínios:**
   - `starvibe.space`
   - `www.starvibe.space` 
   - `*.starvibe.space`

### 4. **Variáveis de Ambiente no Vercel**

```bash
NODE_ENV=production
VITE_DOMAIN=starvibe.space
VITE_MAIN_DOMAIN=starvibe.space
VITE_WWW_DOMAIN=www.starvibe.space
VITE_API_URL=https://sua-api.railway.app
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

## 🚀 Passos para Implementar

### 1. **Commit das Correções**
```bash
git add .
git commit -m "fix: corrigir redirecionamentos infinitos entre www e domínio principal"
git push origin main
```

### 2. **Configurar DNS**
- Acesse o painel do seu provedor de DNS
- Configure os registros conforme mostrado acima
- Aguarde a propagação (pode levar até 24h)

### 3. **Configurar Vercel**
- Adicione os domínios no Vercel Dashboard
- Configure as variáveis de ambiente
- Faça redeploy da aplicação

### 4. **Testar**
Após implementar:
- ✅ `https://starvibe.space` → Funciona
- ✅ `https://www.starvibe.space` → Redireciona para `starvibe.space`
- ✅ `https://empresa.starvibe.space` → Funciona
- ✅ `https://www.empresa.starvibe.space` → Redireciona para `empresa.starvibe.space`

## 🔍 Verificação

### Comandos para testar:
```bash
# Verificar DNS
nslookup starvibe.space
nslookup www.starvibe.space

# Verificar redirecionamento
curl -I https://www.starvibe.space
curl -I https://starvibe.space
```

### Resultado esperado:
- `www.starvibe.space` deve retornar `301/302` para `starvibe.space`
- `starvibe.space` deve retornar `200 OK`

## ⚠️ Importante

1. **Aguarde a propagação DNS** (até 24h)
2. **Limpe o cache do navegador** após as mudanças
3. **Teste em modo incógnito** para evitar cache
4. **Verifique os logs do Vercel** se houver problemas

## 🆘 Troubleshooting

Se ainda houver problemas:

1. **Verifique se o DNS está correto:**
   ```bash
   dig starvibe.space
   dig www.starvibe.space
   ```

2. **Verifique se o Vercel está configurado:**
   - Domínios adicionados
   - Variáveis de ambiente configuradas
   - Deployment funcionando

3. **Limpe cache:**
   - Navegador: Ctrl+Shift+R
   - DNS: `ipconfig /flushdns` (Windows) ou `sudo dscacheutil -flushcache` (Mac)

4. **Teste em diferentes navegadores** para confirmar que é um problema de cache
