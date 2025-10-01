# Environment Variables Configuration

## Required Environment Variables

### Domain Configuration
```bash
# Main production domain
VITE_DOMAIN=starvibe.space
VITE_MAIN_DOMAIN=starvibe.space

# Vercel deployment domain (for fallback)
VITE_VERCEL_DOMAIN=uproomvp.vercel.app

# Development domain
VITE_DEV_DOMAIN=localhost:8080
```

### API Configuration
```bash
# Production API URL
VITE_API_URL=https://sua-api.railway.app

# Development API URL
VITE_DEV_API_URL=http://localhost:3001
```

### Supabase Configuration
```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

## Environment Setup

### 1. Local Development
Create a `.env.local` file in the `web/` directory:
```bash
# Copy from env.example and update values
cp env.example .env.local
```

### 2. Production Deployment
Set these variables in your deployment platform (Vercel, Railway, etc.):

#### Vercel Environment Variables:
- `VITE_DOMAIN=starvibe.space`
- `VITE_MAIN_DOMAIN=starvibe.space`
- `VITE_VERCEL_DOMAIN=uproomvp.vercel.app`
- `VITE_API_URL=https://sua-api.railway.app`
- `VITE_SUPABASE_URL=https://seu-projeto.supabase.co`
- `VITE_SUPABASE_ANON_KEY=sua-chave-anonima`

## Domain Change Process

To change the domain in the future:

1. Update the environment variables:
   ```bash
   VITE_DOMAIN=novo-dominio.com
   VITE_MAIN_DOMAIN=novo-dominio.com
   ```

2. Update the CORS configuration in `vite.config.ts`:
   ```typescript
   origin: [
     /^https:\/\/.*\.novo-dominio\.com$/,
     /^http:\/\/.*\.novo-dominio\.com$/,
     // ... other origins
   ]
   ```

3. Update the server CORS configuration in `server.js`:
   ```javascript
   origin: [
     /^https:\/\/.*\.novo-dominio\.com$/,
     /^http:\/\/.*\.novo-dominio\.com$/,
     // ... other origins
   ]
   ```

4. Redeploy the application

## Default Values

If environment variables are not set, the system will use these defaults:
- `VITE_DOMAIN`: `starvibe.space`
- `VITE_MAIN_DOMAIN`: `starvibe.space`
- `VITE_VERCEL_DOMAIN`: `uproomvp.vercel.app`
- `VITE_DEV_DOMAIN`: `localhost:8080`
