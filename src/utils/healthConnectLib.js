// Carrega a biblioteca do Health Connect (react-native-health-connect) SÓ quando ela existe no build: o pacote NÃO está no package.json do
// repositório (scripts/install-healthconnect-deps.mjs o instala no CI com HEALTH_INTEGRATION_ENABLED=true). Sem ele devolve null e o app segue
// com o registro manual. O require fica DENTRO de um try/catch direto: é o formato que o Metro aceita como dependência opcional (o bundle não
// quebra se o pacote não existir). Não troque por uma função auxiliar. Só roda no Android (quem chama já filtra por plataforma).
export default function loadHealthConnectLib() {
  let lib = null;
  try { lib = require('react-native-health-connect'); } catch (e) { lib = null; }
  return lib;
}
