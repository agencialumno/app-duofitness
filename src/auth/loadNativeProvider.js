// Carrega o provedor real (iOS e Android). Os módulos de conta NÃO estão no package.json: só existem no build quando o
// workflow os instala (FIREBASE_ENABLED=true). Sem eles, ou sem o arquivo de configuração do Firebase, devolve null e o app
// segue em modo convidado ("Conta indisponível nesta versão").
// Cada require fica DENTRO de um try/catch direto: é o formato que o Metro aceita como dependência opcional (o bundle não
// quebra se o pacote não existir). Não troque por uma função auxiliar.
import { Platform } from 'react-native';
import FirebaseAuthProvider from './FirebaseAuthProvider';

export default function loadNativeProvider() {
  let authApi = null;
  let appApi = null;
  let googleSignin = null;
  let appleAuth = null;
  let crypto = null;
  try { authApi = require('@react-native-firebase/auth'); } catch (e) { authApi = null; }
  try { appApi = require('@react-native-firebase/app'); } catch (e) { appApi = null; }
  if (!authApi || !appApi) return null;
  // sem o arquivo de configuração (ou sem o módulo nativo) isto lança: vira "indisponível"
  const getApp = appApi.getApp || appApi.default;
  try { getApp(); } catch (e) { return null; }
  try { googleSignin = require('@react-native-google-signin/google-signin'); } catch (e) { googleSignin = null; }
  try { appleAuth = require('expo-apple-authentication'); } catch (e) { appleAuth = null; }
  try { crypto = require('expo-crypto'); } catch (e) { crypto = null; }
  return new FirebaseAuthProvider({ authApi, googleSignin, appleAuth, crypto, os: Platform.OS });
}
