# Guia de Deploy Automatizado (One-Click)

Este projeto possui um script inteligente de automação de deploy que realiza tudo para você com apenas um comando, mantendo a qualidade e sincronizando com o GitHub.

## O Workflow (Como fazer deploy)

Sempre que você quiser publicar novas alterações, abra o terminal na raiz do projeto e execute:

```bash
./deploy.sh "sua mensagem de commit aqui"
```

### O que esse script faz?
O script `deploy.sh` executa as seguintes etapas automaticamente de forma sequencial:
1. **Validação**: Roda o checklist de qualidade local (`python3 .agent/scripts/checklist.py .`). Se houver qualquer erro de programação, UX ou SEO, o deploy é imediatamente cancelado para proteger a produção.
2. **Frontend (Netlify)**: Se o checklist for aprovado 100%, ele faz o build local e envia os arquivos do React direto para a Netlify.
3. **Sincronização (Git)**: Ele pega todos os seus arquivos novos, cria um commit com a mensagem que você escreveu e faz o `git push` para o GitHub.
4. **Backend (Render)**: Assim que o código chega no GitHub (passo 3), a automação de CI/CD (GitHub Actions) notifica o Render, e seu backend é reiniciado automaticamente com a nova versão.

---

## ⚠️ Troubleshooting (Em caso de Falha)

**Se o script exibir ERRO no Passo 1 (Checklist):**
- Leia a mensagem no terminal para ver qual teste falhou (ex: UX Audit detectou uma cor proibida, ou o Lint encontrou um erro). Corrija o código e rode o `./deploy.sh` novamente.

**Se o Frontend não atualizou:**
- Verifique se a sua conexão com a internet caiu durante a etapa `[2/4]` ou se a sua CLI do Netlify não está logada (rode `npx netlify login` se for o caso).

**Se o Backend não atualizou:**
- O script completou o Passo 3 (`git push`) com sucesso? 
- Se sim, o problema está no GitHub Actions. Olhe a aba "Actions" no seu repositório no GitHub. Se o workflow `.github/workflows/deploy-backend.yml` estiver falhando, provavelmente o Segredo `RENDER_DEPLOY_HOOK_URL` está ausente ou inválido nas configurações do seu repositório.
