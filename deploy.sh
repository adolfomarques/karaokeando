#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check if a commit message was provided
COMMIT_MSG="$1"
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="chore: deploy e atualizacoes"
    echo -e "${YELLOW}Nenhuma mensagem de commit fornecida. Usando o padrao: '${COMMIT_MSG}'${NC}"
fi

echo -e "\n${GREEN}=== INICIANDO DEPLOY AUTOMATIZADO ===${NC}"

# 2. Run the quality checklist
echo -e "\n${YELLOW}[1/4] Executando checklist de qualidade (UX, SEO, Segurança, Testes)...${NC}"
python3 .agent/scripts/checklist.py .
if [ $? -ne 0 ]; then
    echo -e "${RED}ERRO: O checklist falhou. O deploy foi abortado para proteger a producao.${NC}"
    echo -e "${RED}Por favor, corrija os erros listados acima e tente novamente.${NC}"
    exit 1
fi
echo -e "${GREEN}Checklist aprovado!${NC}"

# 3. Deploy Frontend to Netlify
echo -e "\n${YELLOW}[2/4] Fazendo o build e deploy do Frontend na Netlify...${NC}"
npx netlify-cli deploy --prod --build
if [ $? -ne 0 ]; then
    echo -e "${RED}ERRO: Falha ao enviar o Frontend para a Netlify.${NC}"
    exit 1
fi
echo -e "${GREEN}Deploy do Frontend concluido com sucesso!${NC}"

# 4. Commit and Push to GitHub (Triggers Backend on Render)
echo -e "\n${YELLOW}[3/4] Sincronizando com GitHub (Isso ira disparar o deploy do Backend no Render)...${NC}"
git add .
git commit -m "$COMMIT_MSG"

# We don't exit if there's nothing to commit, because we still want to push
git push
if [ $? -ne 0 ]; then
    echo -e "${RED}ERRO: Falha ao enviar o codigo para o GitHub. O Backend pode nao ter sido atualizado.${NC}"
    exit 1
fi
echo -e "${GREEN}Sincronizacao concluida! Backend esta sendo atualizado no Render.${NC}"

# 5. Success
echo -e "\n${GREEN}=== DEPLOY COMPLETO! 🚀 ===${NC}"
echo -e "Frontend: https://karaokefactory.org"
echo -e "Backend: (Em andamento automaticamente pelo Render)"
