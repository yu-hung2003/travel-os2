/**
 * Client-side photo compression for sync-friendly storage.
 * Firestore documents cap at 1MB, so photos are resized (max 1024px)
 * and JPEG-compressed before being stored as base64 data URLs.
 * Typical output: 100–300KB. Falls back to harder compression if large.
 */
export function compressImage(file: File, maxDim = 1024, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        let out = canvas.toDataURL('image/jpeg', quality);
        if (out.length > 700_000) out = canvas.toDataURL('image/jpeg', 0.55);
        if (out.length > 900_000) {
          const c2 = document.createElement('canvas');
          c2.width = Math.max(1, Math.round(w * 0.7));
          c2.height = Math.max(1, Math.round(h * 0.7));
          c2.getContext('2d')!.drawImage(img, 0, 0, c2.width, c2.height);
          out = c2.toDataURL('image/jpeg', 0.55);
        }
        URL.revokeObjectURL(url);
        resolve(out);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image load failed'));
    };
    img.src = url;
  });
}
