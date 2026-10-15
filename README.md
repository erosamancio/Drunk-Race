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

## Estrutura

```
src/
  assets/   lista de modelos e carregamento de GLB
  core/     laço do jogo
  render/   cena, renderer, pós-processamento, paleta neon
public/models/  modelos Kenney (CC0), ver CREDITS.md
```

Cada push na `main` roda lint, typecheck, testes e build, e publica no GitHub Pages.
