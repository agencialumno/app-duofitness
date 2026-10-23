# Ajuda ("i") do app

Ícone "i" em círculo que abre uma folha de explicação (cartão na parte de baixo da tela). **Todo o texto fica em
`src/data/infoContent.js`**, um objeto por tema, para revisão por um profissional de saúde sem mexer em telas.

## Componentes

- `src/components/InfoButton.js`: o "i" (área de toque de 44x44, `accessibilityRole="button"`, rótulo "Saiba mais sobre
  <tema>"). Uso: `<InfoButton tema="nivelXp" />`. Aceita `blocks` para conteúdo calculado na hora (IMC).
- `src/components/InfoSheet.js`: `Modal` do React Native (sem dependência nova): título, texto rolável, botão **Fechar**,
  fecha ao tocar fora e no botão voltar do Android (`onRequestClose`), foco do leitor de tela no título, área segura,
  fonte dinâmica (sem alturas fixas de texto) e sem animação com "Reduzir movimento".
- Não coloque o `InfoButton` dentro de outro botão (cartão tocável): use em linhas de título.

## Temas e onde aparecem

| Tema | Onde |
|---|---|
| `imc` | IMC na Home, no Perfil, em Editar dados físicos e no onboarding (dados físicos) |
| `nivelXp` | cartão de nível da Home |
| `sequencia` | ao lado do contador de sequência da Home |
| `duoScore` | cartão do Duo Score na Saúde (aponta para "Por que este número?", sem repetir a fórmula) |
| `saude` | cartões "Evolução do peso" e "Água de hoje" |
| `academiaAgora` | tela Academia agora |
| `combos` | pergunta de combo da série guiada e do gerador rápido (a lista vem de `combosEquipment.js`) |
| `objetivos` | editor de objetivos da série guiada |
| `limitacao` | pergunta de limitação da série guiada e do gerador rápido |
| `montandoSerie` | tela "Montando sua série" e carregamento do gerador rápido |
| `seriesRepsDescanso` | detalhe do exercício |
| `marketplace` | tela do marketplace |

Um teste confere que todo `<InfoButton tema="...">` existe em `infoContent.js` e que todo tema é usado.

## IMC (`src/utils/imcInfo.js`)

Só **lê e reutiliza** `calculateIMC` e `getIMCCategory` de `imc.js`. A folha mostra: o que é; o cálculo **passo a passo com
os valores da pessoa** (peso, altura em metros, altura ao quadrado, divisão, resultado com 1 casa); a escala de faixas
**em texto** com a posição marcada; o que o IMC não mostra; sugestões **só de hábitos**; e o aviso
"Informação geral. Não substitui avaliação profissional.". O app classifica pelo valor **exato**; se o valor arredondado
cair em outra faixa, a folha avisa.

**Menores de 18 anos (`ageGroup: "under18"`):** número e passo a passo, **sem** categoria, escala nem sugestões, com o aviso
de que a idade pede curvas de percentil e conversa com um profissional. Na interface, a categoria (rótulo, dica, cor e
ícone de faixa) e a tabela de referência de adultos ficam escondidas em: Home, Perfil, Editar dados físicos e onboarding
(dados físicos). **O gerador recebe o mesmo `imcCategory` de sempre.**

## Regras dos textos

Neutros, só hábitos, sem dieta, caloria, déficit, meta de peso, prazo, dose, suplemento nem promessa de resultado. Um teste
(`backend/test/infohelp.test.ts`) varre todos os textos e todas as sugestões do IMC.

## Pontos já existentes que merecem revisão (não alterados)

- O contador "Sequência" da Home soma 1 a cada treino e nunca zera; a Saúde conta dias seguidos pelas datas. O texto de
  ajuda explica a diferença com honestidade; unificar os dois é uma decisão de produto.
- `imc.js` tem a nota "Déficit calórico + treino = resultado mais rápido" (objetivo de emagrecer), exibida em
  "Recomendações para você" no gerador rápido. Contraria a regra de nunca sugerir déficit calórico; precisa de revisão
  de texto por um profissional de saúde.
