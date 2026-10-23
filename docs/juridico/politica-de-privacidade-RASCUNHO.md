# Política de Privacidade do app Duo Fitness (RASCUNHO)

> **RASCUNHO PARA REVISÃO JURÍDICA. NÃO PUBLICAR NEM LIGAR AO APP ANTES DA REVISÃO DO ADVOGADO.**
> Escrito por engenharia a partir do que o app faz hoje (ver `docs/plano-conta.md`). Os trechos em **[DECIDIR]** dependem de você e do advogado.
> Última revisão do rascunho: 23/10/2026. Versão do documento: 0.1 (rascunho).

## 1. Quem somos e quem decide sobre os seus dados (controlador)

**[DECIDIR: controlador]** O controlador dos dados pessoais tratados pela conta do app é **[Duo Fitness (razão social, CNPJ, endereço)] OU [Lumno (razão social, CNPJ, endereço)]**.
A decisão cabe a você e ao advogado, e deve considerar quem opera o app, quem contrata o Google/Firebase e quem responde perante a ANPD.
Canal de contato do controlador e do encarregado (DPO): **[DECIDIR: e-mail, ex.: privacidade@...]**.

## 2. Para quem é a conta

A **conta é só para maiores de 18 anos**. Quem tem menos de 18 anos pode usar o app **sem conta**, no modo local: nesse caso nada é enviado a servidores nossos.
Não coletamos de propósito dados de menores de 18 anos para a conta. Se soubermos que uma conta foi criada por menor, ela será excluída. **[REVISAR: base legal e eventual tratamento de dados de adolescentes (LGPD, art. 14).]**

## 3. Quais dados tratamos

| Dado | Quando | Onde fica |
|---|---|---|
| E-mail, nome, identificador da conta (UID), métodos de entrada usados (e-mail e senha, Google, Apple) e se o e-mail foi verificado | só se você criar conta | Firebase Authentication (Google) |
| Senha | só se você entrar por e-mail e senha | guardada pelo Firebase de forma protegida (não temos acesso à senha em texto) |
| E-mail "privado" da Apple (relay), se você escolher | só com "Continuar com Apple" | Firebase Authentication |
| Dados de treino, perfil físico (peso, altura, faixa etária, nível, objetivos), séries, sessões, XP, conquistas, saúde (água e peso) | sempre que você usa o app | **somente no seu aparelho** (armazenamento local). **[CONFIRMAR]** Hoje não há sincronização com a nuvem. |
| Registros técnicos de erro | quando o app falha | apenas no console do aparelho; **nada é enviado** |

O app **não usa** anúncios, rastreamento entre apps nem análise de uso **[CONFIRMAR antes de publicar]**.
Dados de saúde (peso, hábitos) são dados pessoais sensíveis: ficam no aparelho e **não são enviados** pela conta.

## 4. Para que usamos (finalidades) e em qual base legal

- Criar e manter a sua conta, autenticar você e proteger o acesso: **execução de contrato / procedimentos preliminares** **[REVISAR: base legal exata, LGPD art. 7º]**.
- Enviar e-mails de verificação e de redefinição de senha: **execução de contrato** e **legítimo interesse de segurança** **[REVISAR]**.
- Prevenir fraude e abuso (limites de tentativa, App Check): **legítimo interesse** **[REVISAR e documentar o teste de proporcionalidade]**.
- Cumprir obrigações legais e responder à ANPD: **obrigação legal**.

Não vendemos dados pessoais.

## 5. Com quem compartilhamos (operadores e terceiros)

- **Google (Firebase Authentication)**: opera a autenticação em nosso nome. **[CONFIRMAR: papel de operador, cláusulas e local de armazenamento]**.
- **Apple** e **Google**: apenas quando você escolhe entrar com a Apple ou com o Google, conforme as políticas deles.
- Autoridades, quando houver obrigação legal.

**Transferência internacional:** os servidores do Google podem estar fora do Brasil. **[REVISAR: mecanismo de transferência (LGPD, arts. 33 e seguintes)]**.

## 6. Por quanto tempo guardamos

- Dados da conta: enquanto a conta existir. **Ao excluir a conta no app (Perfil > Conta > Excluir conta), a conta e os dados de autenticação são apagados.** **[CONFIRMAR prazos de backup do Google]**.
- Dados no aparelho: ficam até você apagar o app ou usar "Resetar todos os dados". **Sair da conta não apaga os dados do aparelho.**
- Registros de segurança do servidor: **[DECIDIR/CONFIRMAR prazo]**.

## 7. Os seus direitos (LGPD, art. 18)

Você pode pedir: confirmação de tratamento, acesso, correção, anonimização, bloqueio ou eliminação, portabilidade, informação sobre compartilhamento, revogação de consentimento e revisão de decisões automatizadas.
A **exclusão da conta** é feita no próprio app. Para os demais pedidos: **[DECIDIR: e-mail do encarregado]**. Respondemos no prazo da lei **[CONFIRMAR]**.
Você também pode reclamar à **ANPD**.

## 8. Segurança

Usamos a autenticação do Firebase (senha protegida, verificação de e-mail, proteção contra tentativas em excesso, limite de tentativas) e mantemos o repositório do app sem segredos.
Nenhum sistema é totalmente seguro. Em caso de incidente que possa causar risco ou dano relevante, comunicaremos a ANPD e os titulares **no prazo da regulamentação vigente (3 dias úteis, Resolução CD/ANPD nº 15/2024 [CONFIRMAR])**.

## 9. Aviso de saúde

O app oferece informação geral de treino e hábitos. **Não é aconselhamento médico** e não substitui avaliação profissional. Converse com um profissional de saúde antes de iniciar um programa de exercícios.

## 10. Mudanças nesta política

Quando mudarmos esta política, avisaremos no app e mostraremos a versão e a data. **[DECIDIR: como registrar o aceite e a versão aceita]**.

## 11. Contato

**[DECIDIR: controlador, endereço, e-mail do encarregado]**

---

### Notas para o advogado (não fazem parte do texto)

1. Hoje **não há** Firestore nem Storage: só autenticação. Se houver sincronização no futuro, esta política muda (dados de saúde, base legal, retenção).
2. Conta só 18+: confirmar a estratégia de verificação de idade (hoje: autodeclaração no cadastro).
3. Fornecedores: Google (Firebase), Apple, Vercel (backend de IA **não está em uso** hoje; se ligado, cobrir o envio de mensagens do chat para a Anthropic).
4. Marketplace: vitrine de parceiros, sem pagamento no app; o contato é direto com o parceiro (WhatsApp ou site). Avaliar se isso cria tratamento de dados.
5. Apple exige URL da política no App Store Connect e a "ficha de privacidade" coerente com este texto (`docs/plano-conta.md`, seção 10).
