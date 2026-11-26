// Utilitário para seleção e captura de foto de perfil
let ImagePicker = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  // ambiente de testes / Node.js
}

export async function pickImageFromGallery() {
  if (!ImagePicker || !ImagePicker.requestMediaLibraryPermissionsAsync) {
    return { cancelled: true, error: 'unavailable' };
  }
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return { cancelled: true, error: 'permission_denied' };
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets || !result.assets.length) {
      return { cancelled: true };
    }
    return { cancelled: false, uri: result.assets[0].uri };
  } catch (err) {
    console.warn('Erro ao selecionar foto da galeria:', err);
    return { cancelled: true, error: err?.message || 'unknown' };
  }
}

export async function pickImageFromCamera() {
  if (!ImagePicker || !ImagePicker.requestCameraPermissionsAsync) {
    return { cancelled: true, error: 'unavailable' };
  }
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return { cancelled: true, error: 'permission_denied' };
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets || !result.assets.length) {
      return { cancelled: true };
    }
    return { cancelled: false, uri: result.assets[0].uri };
  } catch (err) {
    console.warn('Erro ao tirar foto:', err);
    return { cancelled: true, error: err?.message || 'unknown' };
  }
}
