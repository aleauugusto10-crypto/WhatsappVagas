# RendaJá Web API Layer

Este ZIP é a camada visual + conexão com Supabase para substituir/evoluir o ZIP visual anterior.

## Como instalar

```bash
cd rendaja_web_api_layer
npm install
cp .env.example .env
npm run dev
```

## O que já vem preparado

- Landing page
- Vagas
- Profissionais
- Missões
- Empresas
- Planos
- Busca real no Supabase quando `.env` estiver preenchido
- Fallback com dados mockados quando não houver Supabase configurado
- Criação visual de missão/vaga/perfil com payload pronto para tabela
- Links de WhatsApp funcionais

## Tabelas consideradas

- `vagas`
- `servicos`
- `missoes`
- `usuarios`
- `planos_precos`

## Observação

Esse projeto usa `VITE_SUPABASE_ANON_KEY`, nunca use `SERVICE_ROLE_KEY` no front-end.
