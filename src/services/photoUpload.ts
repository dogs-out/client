import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Longest edge a photo is downscaled to before it leaves the phone.
 *
 * Deliberately 2x the server's 1080px feed rendition rather than equal to it. The
 * server owns the final sizes, and giving it headroom means its resize is a real
 * downscale — matching the target exactly would hand it an already-compressed image
 * to re-encode, which costs a generation of quality for no size saving.
 *
 * The point of resizing here at all is the upload: a modern phone photo is 3000x4000
 * and several MB, and sending that over mobile data is what made saving a profile
 * feel broken.
 */
const MAX_UPLOAD_EDGE = 2160;

/** High quality — the server re-compresses, so being stingy here just compounds. */
const UPLOAD_QUALITY = 0.9;

/**
 * Downscales a picked image and returns a file reference ready for multipart upload.
 *
 * Also normalises format: the picker hands back HEIC on iOS, which the server's
 * decoder cannot read, and re-saving as JPEG here is the cheapest place to fix that.
 */
export async function prepareForUpload(uri: string): Promise<FormData> {
  const context = ImageManipulator.manipulate(uri);
  const source = await context.renderAsync();

  // Resize the longer edge so portrait and landscape both land under the cap.
  const longestEdge = Math.max(source.width, source.height);
  if (longestEdge > MAX_UPLOAD_EDGE) {
    const scale = MAX_UPLOAD_EDGE / longestEdge;
    context.resize({
      width: Math.round(source.width * scale),
      height: Math.round(source.height * scale),
    });
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: UPLOAD_QUALITY, format: SaveFormat.JPEG });

  const form = new FormData();
  // React Native's FormData takes this {uri, name, type} shape rather than a Blob.
  form.append('file', {
    uri: saved.uri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  return form;
}

/**
 * Axios config for a multipart POST.
 *
 * The type is named without a boundary here; React Native's networking layer builds
 * the body and rewrites the header with the boundary it generated. Axios passes
 * FormData through its default transform untouched, so nothing else is needed.
 */
export const MULTIPART_CONFIG = {
  headers: { 'Content-Type': 'multipart/form-data' },
};
