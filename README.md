# Drunk Race

Jogo de corrida no navegador em que todos os pilotos estão bêbados. Three.js, estilo neon low-poly.

## Rodando

```bash
npm install
npm run dev        # servidor local com hot reload
npm test           # testes
npm run build      # build de produção em dist/
npm run screenshot # tira um screenshot do build (precisa do Chromium)
```

## Controles

| Ação | Teclado | Controle |
|---|---|---|
| Acelerar | W ou ↑ | RT |
| Frear / ré | S ou ↓ | LT |
| Virar | A/D ou ←/→ | analógico esquerdo |
| Freio de mão | Espaço | A |
| Voltar para a pista | R | X |

Adicione `?autopilot` à URL para ver o carro dar voltas sozinho.

## Estrutura

```
src/
  assets/   lista de modelos e carregamento de GLB
  core/     laço do jogo e input (teclado e controle)
  track/    pista gerada a partir de uma curva
  vehicle/  física arcade do carro e colisão com os muros
  race/     sessão de corrida e cronômetro de voltas
  ai/       piloto que segue a pista (usado no ?autopilot)
  hud/      HUD em HTML por cima do canvas
  render/   cena, câmera, pista, cenário, carro, pós-processamento
public/models/  modelos Kenney (CC0), ver CREDITS.md
```

Cada push na `main` roda lint, typecheck, testes e build, e publica no GitHub Pages.
