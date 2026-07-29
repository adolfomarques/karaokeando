# Como Implementar Embed do YouTube sem API no React

Use as instruções abaixo para pedir a outra Inteligência Artificial (IA) que implemente o player de vídeo do YouTube sem carregar scripts pesados da API oficial.

---

## Prompt de Instruções para a IA

> **Contexto:** Quero adicionar um player de vídeo do YouTube em uma aplicação React sem carregar a biblioteca/script oficial do YouTube (`https://www.youtube.com/iframe_api`). Quero uma solução leve usando apenas um `<iframe>` do HTML5.
>
> **Requisitos de Implementação:**
> 1. **URL de Incorporação:** Deve usar o formato de URL `https://www.youtube.com/embed/{videoId}`.
> 2. **Autoplay Dinâmico:** Se o autoplay for ativado, adicione a query string `?autoplay=1`.
> 3. **Permissões do IFrame (Essencial):** Adicione obrigatoriamente os atributos `allow="autoplay; encrypted-media"` e `allowFullScreen` no `<iframe>` para garantir que o navegador permita a reprodução automática e o modo tela cheia.
> 4. **Responsividade (Aspect Ratio 16:9):** O player deve ser responsivo. Envolva o `<iframe>` em uma `div` com `aspect-ratio: 16/9` e use posicionamento absoluto para que o player ocupe 100% de largura e altura do container pai.
> 5. **Interface TypeScript:** Defina os tipos apropriados para as propriedades do componente (Props).
>
> **Código de Referência Esperado:**
> 
> ```tsx
> import React from 'react';
> 
> interface YouTubeEmbedProps {
>   videoId: string;
>   autoplay?: boolean;
> }
> 
> export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ videoId, autoplay = true }) => {
>   if (!videoId) return null;
> 
>   const embedUrl = `https://www.youtube.com/embed/${videoId}${autoplay ? '?autoplay=1' : ''}`;
> 
>   return (
>     <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: "12px", overflow: "hidden" }}>
>       <iframe
>         src={embedUrl}
>         style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
>         allow="autoplay; encrypted-media" 
>         allowFullScreen
>         title="YouTube video player"
>       />
>     </div>
>   );
> };
> 
> export default YouTubeEmbed;
> ```
>
> Implemente esse componente e adapte-o ao layout atual mantendo os estilos consistentes.

---

## Por que essa abordagem funciona?

1. **Leveza:** Evita o download de scripts adicionais e latência na inicialização do player.
2. **Propriedade `allow`:** Sem declarar explicitamente `allow="autoplay; encrypted-media"`, a maioria dos navegadores modernos bloqueará a execução do vídeo por políticas de segurança.
3. **Aspect Ratio moderno:** O uso da propriedade CSS `aspectRatio: "16/9"` elimina hacks antigos (como padding-bottom de 56.25%) e mantém o player proporcional em qualquer tela.
