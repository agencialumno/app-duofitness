// Carrega a biblioteca do HealthKit (@kingstinct/react-native-healthkit) SÓ quando ela existe no build: o pacote NÃO está no package.json do
// repositório (scripts/install-healthkit-deps.mjs o instala no CI com HEALTH_INTEGRATION_ENABLED=true). Sem ele devolve null e o app segue
// com o registro manual. O require fica DENTRO de um try/catch direto: é o formato que o Metro aceita como dependência opcional (o bundle não
// quebra se o pacote não existir). Não troque por uma função auxiliar. Nunca roda no Android nem na web (quem chama já filtra por plataforma).
export default function loadHealthKitLib() {
  let lib = null;
  try { lib = require('@kingstinct/react-native-healthkit'); } catch (e) { lib = null; }
  return lib;
}
