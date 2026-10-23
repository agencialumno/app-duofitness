# Progresso da noite (modo autônomo, orçamento de 2 horas)

Início: **07:18** (`date`: Fri Oct 23 07:18:30 2026). Limites: 09:03 (1h45, parar trabalho novo) e 09:18 (2h, entregar o commitado).

Regras seguidas: sem push, sem `gh`, sem workflows, sem tags, `main` intocada; nenhum segredo nem arquivo do Firebase lido ou versionado;
chaves `@duo_*`, `workoutGenerator.js` e comportamento de adultos intactos (hashes de `imc.js` e `planForAge.js` iguais).

## Etapa 1: ajuda-textos

- (c) Frase para menores de 18 ("Para menores de 18 anos, a série foca em hábitos e técnica.") em `infoContent.js` (`MINOR_FOCUS_NOTE`, `getObjetivosBlocks`) e na tela dos objetivos da série guiada, só para `under18`. Decisão: o onboarding (`ProfileSetupScreen`) pergunta o objetivo ANTES da faixa etária, então a frase não aparece lá (não há como saber a idade ainda); aparece na série guiada, onde o objetivo é editável e a idade já é conhecida.
- (b) Smoke do player: causa provável da intermitência = o vídeo de teste gravado no navegador (MediaRecorder) às vezes sai vazio/lento com a máquina ocupada. Correção: o teste só segue depois de um `<video>` de prova disparar `loadeddata` (grava de novo, até 4 vezes, se não ficar pronto). Nada de repetir o passo.
- (a) Suíte completa e smoke: ver resultados ao fim desta seção (atualizado no fechamento).

