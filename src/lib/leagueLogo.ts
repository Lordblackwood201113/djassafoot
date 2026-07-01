import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

// Ouvre la galerie de l'appareil et renvoie l'image choisie (carrée, compressée) :
// son Blob (à uploader) + son uri local (aperçu immédiat). null si annulé / accès refusé.
// Marche sur web (input fichier) et natif.
export async function pickSquareImage(): Promise<{ blob: Blob; uri: string } | null> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  if (res.canceled || !res.assets?.length) return null;
  const uri = res.assets[0].uri;
  const blob = await (await fetch(uri)).blob();
  return { blob, uri };
}

// POST l'image vers l'URL d'upload signée de Convex et renvoie le storageId.
export async function uploadToConvex(uploadUrl: string, blob: Blob): Promise<string> {
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'image/jpeg' },
    body: blob,
  });
  if (!res.ok) throw new Error("Échec de l'envoi de l'image");
  const { storageId } = (await res.json()) as { storageId: string };
  return storageId;
}
