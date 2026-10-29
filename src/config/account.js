// Regras de conta. Fácil de mudar: a idade mínima para criar conta vale para TODOS os métodos de entrada (e-mail, Google, Apple).
// A idade mínima e o texto de autorização do responsável precisam de revisão jurídica (docs/pendencias-usuario.md).
export const MIN_ACCOUNT_AGE = 13;

// A partir desta idade a pessoa é adulta no app; abaixo dela (e a partir da mínima) precisa da autorização do responsável.
export const ADULT_AGE = 18;

// Maior idade aceita no campo (acima disso o valor é considerado inválido).
export const MAX_AGE = 119;

export const GUARDIAN_CONSENT_TEXT = 'Confirmo que tenho autorização do meu responsável legal para usar o app';
