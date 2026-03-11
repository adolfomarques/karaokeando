# KaraokeFactory 🎤

Sistema de karaokê social em tempo real. Crie salas, adicione músicas do YouTube, cante sozinho ou em dupla, e dispute o ranking com seus amigos!

O KaraokeFactory é uma aplicação web que transforma qualquer TV em um karaokê de festa. O host projeta a tela da TV, e os convidados usam seus celulares para adicionar músicas, escolher parceiros de dueto e acompanhar o ranking.

## 🏗️ Arquitetura

```
karaokefactory/
├── backend/          # API Node.js + TypeScript
│   ├── src/
│   │   ├── server.ts    # Servidor Fastify + WebSocket
│   │   └── lib/         # Módulos (auth, songs, etc.)
│   └── prisma/          # Schema e migrations
│
├── frontend/         # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/       # Home, RoomTV, RoomMobile, Dashboard
│   │   ├── components/  # ScoreOverlay, etc.
│   │   ├── score/       # Sistema de pontuação
│   │   └── api.ts       # Cliente API + WebSocket
│   └── public/          # Assets estáticos
│
└── docker-compose.yml   # PostgreSQL local
```

## 🚀 Quick Start

### Pré-requisitos

- Node.js 20+
- npm 10+
- Docker (para PostgreSQL) ou PostgreSQL 16+

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Servidor rodando em `http://localhost:8787`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplicação em `http://localhost:3000`

## ✨ Funcionalidades

### Implementadas ✅

- **Salas em tempo real** - Código de 5 caracteres, WebSocket para sync instantâneo
- **Busca de músicas** - Integração com YouTube via yt-dlp
- **Fila compartilhada** - Todos veem a mesma fila em tempo real
- **Solo ou Dueto** - Escolha cantar sozinho ou com um parceiro da sala
- **Ranking individual** - Pontuação acumulada por participante
- **Ranking de duplas** - Ranking separado para duetos
- **Biblioteca de músicas** - Músicas adicionadas ficam salvas no banco
- **Mais tocadas** - Lista das músicas mais populares (persistido)
- **Dashboard admin** - Painel com salas ativas e top músicas
- **Identificação persistente** - ID único por dispositivo, nome salvo
- **PostgreSQL** - Persistência robusta com Prisma ORM
- **Sistema de autenticação** - JWT para hosts e acesso TV

### Roadmap 🚧

- [ ] **Sistema de usuários completo** - Cadastro, login, perfil
- [ ] **Histórico de sessões** - Ver festas anteriores
- [ ] **Favoritos pessoais** - Cada usuário salva suas músicas
- [ ] **Conquistas/Badges** - Gamificação
- [ ] **Temas visuais** - Personalização da sala

## 🛠️ Stack Tecnológica

### Backend

| Tecnologia         | Uso                   |
| ------------------ | --------------------- |
| Node.js            | Runtime               |
| TypeScript         | Tipagem               |
| Fastify            | Framework HTTP        |
| @fastify/websocket | Comunicação real-time |
| yt-dlp             | Busca no YouTube      |
| Prisma             | ORM                   |
| PostgreSQL 16      | Banco de dados        |
| JWT                | Autenticação          |

### Frontend

| Tecnologia   | Uso        |
| ------------ | ---------- |
| React 18     | UI Library |
| TypeScript   | Tipagem    |
| Vite         | Build tool |
| React Router | Navegação  |

## 📁 Estrutura de Dados

Dados persistidos no PostgreSQL via Prisma:

```
backend/prisma/
├── schema.prisma       # Schema do banco
└── migrations/         # Histórico de migrations
```

**Entidades implementadas:**

- `User` - Usuários cadastrados (email, nome, senha)
- `Room` - Salas de karaokê (código, hostId, tvToken)
- `RoomVisit` - Histórico de visitas às salas
- `Song` - Biblioteca de músicas (videoId, título, playCount)

**Dados em memória (efêmeros por sessão):**

- Fila de músicas da sala
- Ranking da sessão (solo e duplas)
- Conexões WebSocket

## 🔧 Variáveis de Ambiente

Criar arquivo `.env` na raiz do backend:

```env
# Servidor
PORT=8787

# Banco de dados
DATABASE_URL=postgresql://karaokefactory:karaokefactory_dev_123@localhost:5433/karaokefactory

# Autenticação
JWT_SECRET=sua-chave-secreta-aqui

# Admin
ADMIN_KEY=chave-do-dashboard
```

## 📱 Rotas da Aplicação

| Rota             | Descrição                           |
| ---------------- | ----------------------------------- |
| `/`              | Home - Criar ou entrar em sala      |
| `/room/:code`    | Modo Mobile - Controle pelo celular |
| `/room/:code/tv` | Modo TV - Exibição principal        |
| `/dashboard`     | Painel administrativo               |

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

Feito com 🎤 e ❤️
