# Procedência da mídia de referência dos exercícios

Fotos usadas na "animação" do detalhe do exercício (duas poses alternando). Elas **não estão no git**: ficam em `assets/exercicios-ref/` (no `.gitignore`) e são preparadas localmente por `scripts/preparar-fotos-exercicios.mjs`. Só o mapeamento (`src/data/exerciseStills.js`) é versionado.

## Estado da confirmação

CONFIRMADO: não

> Este é o campo lido por `scripts/check-media-provenance.mjs`. Com `RELEASE_BUILD=true` (build de loja) o script **falha** se houver fotos em `assets/exercicios-ref/` e o campo não for `sim`. Só mude para `sim` depois de confirmar a procedência (veja abaixo). Builds de CI não têm as fotos (a pasta não é versionada), então o portão só pesa em builds feitos com as fotos presentes.

## Fonte e licença

| Item | Valor |
|---|---|
| Fonte | **free-exercise-db**, de yuhonas: https://github.com/yuhonas/free-exercise-db |
| Licença do projeto | **Unlicense** (domínio público) |
| Data do uso | 2026-10-30 (cópia local do banco; só as 34 fotos de confiança "alta" em `docs/musculos-exercicios.md`, duas por exercício) |
| Uso no app | Detalhe do exercício, abaixo de "Como fazer": alternância da posição inicial e final, com a legenda "Imagens ilustrativas" |

## Ressalva (leia antes de confirmar)

**A origem original das fotos NÃO foi verificada.** A licença Unlicense vale para o repositório do free-exercise-db, mas o projeto reúne imagens de terceiros e **não garante, por si só, quem fotografou cada imagem nem se havia autorização**. Por isso as fotos não vão para o git e há o portão acima. Confirmar a procedência é um passo humano: verificar a autoria/licença das imagens (por exemplo, a história do repositório e a fonte original que o projeto cita) e, se necessário, substituir por fotos próprias antes de qualquer build de loja.

## Passos para liberar (Victor)

1. Verificar a origem e o direito de uso das 68 fotos (34 exercícios x 2 poses), ou trocar por fotos próprias.
2. Registrar aqui o que foi verificado (data, quem, como).
3. Mudar o campo `CONFIRMADO:` acima para `sim`.
4. Só então definir `RELEASE_BUILD=true` nos builds de loja com as fotos.

Mais detalhes em `docs/pendencias-usuario.md`.
