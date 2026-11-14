import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { LocalPhoto } from './composer-screen';

// Adapter supplies POL limits from packages/contracts; no duplicated domain policy.
export async function pickPhoto(camera: boolean, limits: {maxEdge: number; maxBytes: number}): Promise<LocalPhoto | null> {
  if (camera) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw { code: 'FORBIDDEN' };
  }
  const options: ImagePicker.ImagePickerOptions = {mediaTypes: ['images'], exif: false, quality: 1};
  const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  // Re-encode pixels to a new JPEG; never retain or upload the original file/EXIF.
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > limits.maxEdge) context.resize(asset.width >= asset.height ? {width: limits.maxEdge} : {height: limits.maxEdge});
  const rendered = await context.renderAsync();
  try {
    for (const compress of [0.8, 0.6, 0.4]) {
      const output = await rendered.saveAsync({format: SaveFormat.JPEG, compress, base64: true});
      const encoded = output.base64;
      if (!encoded) throw {code: 'VALIDATION_FAILED'};
      const bytes = Math.floor(encoded.length * 3 / 4) - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
      if (bytes <= limits.maxBytes) return {uri: output.uri, width: output.width, height: output.height, bytes};
    }
    throw {code: 'LIMIT_EXCEEDED'};
  } finally { rendered.release(); context.release(); }
}
