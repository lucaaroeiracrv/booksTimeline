# Books Timeline

Jogo educativo inspirado em WikiTrivia para comparar anos de lancamento de livros.

## Estrutura

- `frontend/`: jogo em HTML, CSS e JavaScript (3 telas, ranking local, dificuldade progressiva)
- `backend/`: API opcional em Node.js/Express (`/api/books` e `/api/scores`)
- `database/`: base de livros em JSON e scripts SQL (`schema.sql` e `seed.sql`)

## Funcionalidades implementadas

- Tela inicial, tela de jogo e tela de game over
- Cartas com titulo, autor, capa e ano do livro confirmado
- Escolha entre "antes" e "depois"
- Validacao automatica da resposta
- Sistema de vidas (3 erros)
- Sistema de pontuacao progressiva com bonus de sequencia
- Dificuldade progressiva (facil, medio, dificil)
- Ranking local salvo no `localStorage`
- Botao de reiniciar partida
- Tema claro/escuro
- Animacoes suaves e efeitos sonoros simples
- Layout responsivo

## Como executar (frontend)

Abra `frontend/index.html` com uma extensao de servidor local no VS Code (por exemplo Live Server) para evitar restricoes de `file://` no navegador.

## Como executar (backend opcional)

1. Entre na pasta `backend`
2. Instale dependencias:

	`npm install`

3. Rode em desenvolvimento:

	`npm run dev`

4. API em:

	`http://localhost:3001`

## Observacoes

- O frontend funciona de forma independente com base local de livros em JavaScript.
- A API backend esta pronta para evoluir para persistencia real de ranking e integracao com banco SQL.