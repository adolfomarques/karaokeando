# Guia de Deploy (GitOps)

Este projeto utiliza o fluxo de **GitOps** para deploy contínuo. Isso significa que você não deve realizar deploys manuais através da sua máquina local usando CLIs. O repositório cuida de tudo.

## O Workflow (Como fazer deploy)

Sempre que você quiser publicar novas alterações, o fluxo é um só:

1. **Validação**: Rode o checklist de qualidade localmente:
   ```bash
   python3 .agent/scripts/checklist.py .
   ```
   *(Não prossiga se houver erros de UX/SEO ou quebra de build).*

2. **Commit e Push**: Se o checklist passar 100%, envie o código para a branch `main`:
   ```bash
   git add .
   git commit -m "sua alteração"
   git push
   ```

**Pronto!** Não há necessidade de rodar nenhum comando de build na sua máquina.

---

## Como a Integração Funciona

### Frontend (Netlify)
O repositório do GitHub está conectado diretamente à plataforma Netlify. 
Ao receber um push na branch `main`, a Netlify captura o evento automaticamente, executa as instruções descritas no `netlify.toml` (`cd frontend && npm run build`) e publica a pasta `frontend/dist`.

### Backend (Render)
O GitHub Actions gerencia os avisos para o Render através do workflow `/.github/workflows/deploy-backend.yml`.
Ao receber o push na branch `main`, o Actions dispara uma requisição POST na URL secreta `RENDER_DEPLOY_HOOK_URL`, fazendo com que o servidor do Render baixe o novo código e se reinicie sozinho.

---

## ⚠️ Troubleshooting (Em caso de Falha)

**Se o Frontend não atualizou:**
- Abra o painel do Netlify e verifique os "Deploys".
- Garanta que o projeto do Netlify foi linkado a este repositório do GitHub e configurado para observar a branch `main`.
- Verifique se o `netlify.toml` na raiz não foi apagado. Ele é obrigatório para projetos monorepo como este e para evitar erro 404 em rotas do React.

**Se o Backend não atualizou:**
- A URL do Frontend (`VITE_API_URL` em `frontend/.env.production`) aponta para `https://karaokeando.onrender.com`.
- Se as mudanças do backend não aparecerem lá, olhe a aba "Actions" no GitHub. Se estiver falhando com a mensagem `Missing secret: RENDER_DEPLOY_HOOK_URL`, significa que a configuração de segurança do repositório no GitHub está faltando a URL do Hook do Render.
