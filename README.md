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

	Importante: os comandos do backend precisam ser executados dentro de `backend/`, porque o `package.json` esta nessa pasta, nao na raiz do projeto.
2. Instale dependencias:

	`npm install`

	Se no PowerShell aparecer erro dizendo que `npm.ps1` nao pode ser carregado porque a execucao de scripts foi desabilitada, use:

	`npm.cmd install`

	Se voce estiver na raiz do projeto (`booksTimeline`) e nao quiser entrar na pasta, use:

	`npm.cmd --prefix .\backend install`

3. Rode em desenvolvimento:

	`npm run dev`

	Se necessario, no PowerShell use:

	`npm.cmd run dev`

	Ou, a partir da raiz do projeto:

	`npm.cmd --prefix .\backend run dev`

4. API em:

	`http://localhost:3001`

### Erro comum no Windows PowerShell

Se aparecer a mensagem informando que `C:\Program Files\nodejs\npm.ps1` nao pode ser carregado, isso significa que o PowerShell bloqueou a execucao de scripts.

Voce pode resolver de duas formas:

- Usar `npm.cmd` no lugar de `npm`
- Ou liberar scripts para o seu usuario com:

	`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

Depois disso, feche e abra o PowerShell novamente.

## Observacoes

- O frontend funciona de forma independente com base local de livros em JavaScript.
- A API backend esta pronta para evoluir para persistencia real de ranking e integracao com banco SQL.