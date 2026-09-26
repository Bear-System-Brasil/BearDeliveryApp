# CLAUDE.md

Convenções deste repositório. Siga sem precisar de lembrete.

---

## Escopo de trabalho

- Uma subtask por vez, do começo ao fim. Só comece a próxima quando a
  anterior estiver completa e verificada.
- Quantos commits a subtask precisar, mas todos sobre ela. Não misture
  mudanças de subtasks diferentes no mesmo commit.
- Se encontrar algo fora do escopo, relate e pergunte antes de corrigir
  — não desvie no meio.
- Abra o PR só quando o card inteiro estiver pronto e testado.

## Git e PRs

- **Branch sempre a partir da `dev`.** Nunca da `prod`.
- **PR sempre com base na `dev`.** A `prod` recebe só por merge da `dev`, pelo fluxo normal de release.
- **Nome da branch:** use o ticket do Jira como prefixo, no formato `LDMF-000/descricao-curta`. Se o ticket não for informado, pergunte antes de criar. Nunca use o prefixo `claude/`.
- **PR mergeado é porta fechada.** Commit novo depois do merge exige branch nova a partir da `dev` atualizada — empurrar na branch antiga deixa o commit órfão.
- Antes de empurrar, verifique se a `dev` avançou. Se avançou, traga por merge (nunca rebase nem force-push em branch compartilhada).

## Mensagem de commit

Conventional Commits, em português:

  tipo(escopo): descrição no imperativo

Tipos: feat, fix, refactor, chore, test, docs
Escopo: a área tocada — cart, entregador, cozinha, checkout, types

Exemplos:
  fix(cart): corrige overflow horizontal no mobile
  feat(entregador): adiciona quantidade por complemento
  chore: remove componentes de navegacao mortos

Uma mudança por commit. Se a descrição precisa de "e", provavelmente
são dois commits.

## Antes de commitar

Rode sempre, e só commite com os três limpos:

```
next lint
next build
vitest run
```

Ao reportar warnings, distinga os que vieram da sua mudança dos pré-existentes — confirme com `git stash` se necessário.

## Backend

- **Não invente contrato.** Se a doc não cobre, diga que não cobre e pergunte. Não deduza formato de resposta, nome de campo ou comportamento de rota.
- O backend é repositório separado e não está acessível daqui.
- Quando a doc do backend divergir do comportamento observado, **relate a divergência** em vez de escolher um dos dois em silêncio.
- Envelope paginado: `apiRequest` não desembrulha `{data, meta}`. Use `toPaginated`, que tolera array cru e envelope.

## Investigação

- Quando o pedido for investigar, **investigue e pare**. Não altere nada até a confirmação.
- Meça em vez de deduzir quando for possível. Leitura de código já levou ao diagnóstico errado neste projeto mais de uma vez.
- Ao propor correção, diga o que foi descartado e o que não foi verificado.
- Nunca "corrija" comportamento que possa ser intencional sem perguntar.

## Imagens

⚠️ **Não converta `<img>` para `<Image>` do Next.**

As imagens do projeto vêm de R2 e S3. O `next/image` exige o host declarado em `remotePatterns` no `next.config`, e host não declarado **derruba a página em runtime** — tela branca, não imagem quebrada.

`<img>` é escolha deliberada em: foto do cliente, logo do restaurante, imagem do prato e miniaturas da tela do entregador.

Use `<Image>` apenas para hosts já declarados.

## Componentes

- `<Link>` para navegação interna. `<a>` continua correto para link externo, `tel:` e `mailto:`.
- Server Components são o default, mas este app é fortemente client-side: Zustand, TanStack Query e socket.io. Quando o componente precisa de hook, estado ou socket, `"use client"` é o correto — não é exceção a evitar.
- Não adicione `"use client"` em componente que não precisa.

## Segurança

- Nunca coloque token, chave ou credencial no código. Use `process.env`.
- `NEXT_PUBLIC_` expõe a variável no navegador. Nunca use para segredo de backend.
- Evite `dangerouslySetInnerHTML`. Se for inevitável com HTML vindo da API, avise e sanitize.

## Armadilhas conhecidas

- **Mock com identidade nova a cada chamada causa laço infinito de render** nos testes deste projeto. Estabilize as referências dos mocks de hook.
- **Campo que a tela promete e não chega ao backend** já apareceu quatro vezes aqui (`specialInstructions`, `changeAmount`, endereço padrão, `fulfillmentType`). Ao mexer em formulário, confirme que o campo sai na requisição.
- Tipo que declara campo obrigatório que o backend não devolve compila limpo e quebra em produção. Prefira opcional ao que é opcional de fato.

## Idioma

Responda em português. Comentários de código em português, sem acento em identificador.
