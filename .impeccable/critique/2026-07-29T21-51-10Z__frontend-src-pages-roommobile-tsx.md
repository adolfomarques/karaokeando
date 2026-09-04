---
target: pagina Room (mobile)
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-07-29T21-51-10Z
slug: frontend-src-pages-roommobile-tsx
---
# Crítica: RoomMobile (página da sala, mobile)

Method: dual-agent (A: ses_050382409ffeIF6k7x5BRm1gKL · B: ses_05037ea9effeS3QnC2cpkhi8nZ)

## Design Health Score — 19/40 (Poor)

| # | Heurística | Nota | Achado-chave |
|---|-----------|-------|-----------|
| 1 | Visibilidade de status | 2 | Busca tem skeletons e aviso de fila; reações dão zero feedback; add confirma em silêncio |
| 2 | Sistema ↔ mundo real | 2 | PT/EN misturado: "SOLO OU DUETO?" hardcoded, "Up next::" dois-pontos duplo |
| 3 | Controle e liberdade | 1 | Ícone de usuário substitui a sala por "Change Name" sem Cancel; modal com Cancel (l.1124) é código morto |
| 4 | Consistência | 2 | "+" em 3 cores (pink busca/Most Played, roxo Library); dois modais de nome |
| 5 | Prevenção de erros | 2 | Cooldown+debounce ok; lixeira = delete instantâneo sem confirm/undo |
| 6 | Reconhecimento | 2 | 12 botões sem nome acessível; resultados de busca idênticos truncados |
| 7 | Flexibilidade | 2 | Colar link e Top Songs bons; cooldown vs debounce inconsistente |
| 8 | Estética minimalista | 2 | queue[0] duplicado (caixa + item 01); copy de vazio dupla; pill de reações sobrepõe "+" |
| 9 | Recuperação de erros | 2 | Sala-não-encontrada boa; registro de convidado falha em silêncio |
| 10 | Ajuda/docs | 1 | Nada explica sala, emojis, cooldown, Solo/Dueto |

## Veredito de especificidade
LLM: pele inconfundível (neon/glass/glow), mas jornada intercambiável com qualquer app de fila — select cinza nativo, empty states apagados, beats emocionais do karaokê ausentes no telefone do convidado.
Detector (65 findings): 46 cores fora do DESIGN.md (#888 ×9, #2ecc71 ×5, #ff4444 ×5, #FFD700 ×3, #e74c3c ×3...), 18 raios fora da escala (16px ×7, 10px ×6, 8px ×4, 32px ×1), bounce-easing no press de reações (l.2134, aceitável em 100ms). Sem falsos positivos duros.
Overlay: injeção src falhou (PNA); fallback inline ok mas só na join gate — contraste 4.2:1 botão Facebook, gradient-text, hierarchy flat. Sem overlay persistente.

## Impressão geral
Infra de busca de categoria rara; mas tocar no ícone e perder a sala, e adicionar música ao silêncio, quebram "a festa é a interface". Maior oportunidade: celebrar o pico (música adicionada) com confirmação explícita.

## O que funciona
1. Tabs pill (icon+label, ~110×44px, glow pink ativo) — thumb-friendly, 3 escolhas certas.
2. Infra de status da busca — rotating messages, shimmer, aviso de fila com posição.
3. Modal solo/dueto a 1 tap de qualquer "+", default Solo.

## Issues prioritários
- [P0] Modal de nome é armadilha de tela cheia (early-return l.880). Fix: deletar early-return, usar modal glass com Cancel (l.1124), preencher nickname. → /impeccable harden
- [P0] Adicionar música confirma em silêncio. Fix: toast "🎤 Adicionada! Você é #2 na fila" + ✓ verde até WS confirmar. → /impeccable delight
- [P1] Nomes ilegíveis: #888/pink-gradient = 1.06:1; #7928CA/preto = 2.8:1. Fix: branco no herói, ~#B983FF na fila, promover paleta semântica ao DESIGN.md. → /impeccable audit
- [P1] "Up next" duplicado + botão morto "Waiting for Host…". Fix: tirar queue[0] da lista, corrigir "::", espera-do-host como texto. → /impeccable distill
- [P2] Reações sem feedback + sobrepõem "+". Fix: burst local, padding inferior, esconder com busca aberta. → /impeccable delight

## Red flags por persona
- Casey (polegar só): "+" 38–42px, ícone 42px (<44px); pill cobre "+" do 5º resultado; interrupção limpa busca; header sticky rouba toques.
- Jordan (1ª vez): ícones sem label; "+" = "button" no VoiceOver; botão de host morto parece clicável; join exige email+telefone sem motivo.
- Marina (bêbada): nomes invisíveis (1.06:1); PT/EN misturado; títulos truncados; "Up next::" duplo; um toque errado = sala some.

## Observações menores
- logo.png 1.1 MB refetchado — ruim em 3G.
- Ranking vazio sem CTA "cante primeiro!".
- Cooldown bloqueia botão mas debounce continua buscando.
- TruncatedText tooltip hover não funciona em touch.
- "Test Song"/"Tester" visível em produção.
- Resiliência boa: polling 10s + reconexão WS.

## Perguntas provocativas
1. Se o trabalho da página é música na fila em <10s, por que o input está sob herói + up-next duplicada + botão morto?
2. Reações: o mobile está desenhado para o deleite da TV à custa de quem segura o telefone?
3. Qual a taxa de escape aceitável para modais à 1h da manhã?
