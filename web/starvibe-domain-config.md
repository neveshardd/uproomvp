# Configuração do Domínio starvibe.space

## 🚨 Problema Atual
O erro 404 em `visitala.starvibe.space` indica que o Vercel não está configurado corretamente para servir subdomínios do domínio customizado.

## 🔧 Soluções Implementadas

### 1. Configuração do Vercel
- ✅ Atualizado `vercel.json` com configuração adequada para subdomínios
- ✅ Criado `vercel-domain-config.json` com configuração específica para starvibe.space
- ✅ Configurado roteamento para SPA (Single Page Application)

### 2. Configuração de Domínio no Vercel
Para corrigir o problema, você precisa:

1. **Adicionar o domínio customizado no Vercel:**
   - Acesse o painel do Vercel
   - Vá em Settings > Domains
   - Adicione `starvibe.space` como domínio customizado
   - Configure o DNS para apontar para o Vercel

2. **Configurar wildcard subdomain:**
   - Adicione `*.starvibe.space` como alias
   - Isso permitirá que qualquer subdomínio funcione

### 3. Configuração DNS
Configure os seguintes registros DNS no seu provedor:

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

### 4. Variáveis de Ambiente
Configure estas variáveis no Vercel:

```bash
NODE_ENV=production
VITE_DOMAIN=starvibe.space
VITE_MAIN_DOMAIN=starvibe.space
VITE_API_URL=https://sua-api.railway.app
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

## 🚀 Próximos Passos

1. **Commit e push das mudanças**
2. **Configurar domínio no Vercel**
3. **Atualizar DNS**
4. **Testar o subdomínio**

## ✅ Verificação
Após implementar as correções:
- `starvibe.space` → Landing page principal
- `visitala.starvibe.space` → Workspace da empresa "visitala"
- `qualquer-outro.starvibe.space` → Funcionará automaticamente
