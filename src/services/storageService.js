// src/services/storageService.js
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function isImage(file) {
  return /^image\//i.test(file?.type || '');
}

async function createImageThumbnail(file, { maxW = 480, quality = 0.7 } = {}) {
  // This function creates a thumbnail from an image file in the browser.
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = URL.createObjectURL(file);
  });
  const scale = Math.min(maxW / img.width, 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(img.width * scale);
  canvas.height = Math.floor(img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));
  return new File([blob], `thumb_${file.name?.replace(/\s+/g, '_') || 'file'}.jpg`, { type: 'image/jpeg' });
}

// ✅ CHANGED: The function now accepts 'userId' instead of 'pathPrefix'.
export async function uploadFile(file, userId) {
  if (!file) return { fileUrl: null, thumbUrl: null };
  if (!userId) throw new Error('User ID is required for file uploads.');

  const storage = getStorage();
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID().slice(0, 10) : String(Date.now());
  const cleanName = file.name?.replace(/\s+/g, '_') || `file_${id}`;

  // ✅ CHANGED: The path now follows the "reports/{userId}/{fileName}" structure.
  const mainPath = `reports/${userId}/${id}_${cleanName}`;
  const fileRef = ref(storage, mainPath);
  await uploadBytes(fileRef, file);
  const fileUrl = await getDownloadURL(fileRef);

  let thumbUrl = null;
  // The thumbnail logic is preserved but uses the new path structure.
  if (isImage(file)) {
    try {
      const thumb = await createImageThumbnail(file);
      // ✅ CHANGED: The thumbnail path also includes the userId.
      const thumbPath = `reports/${userId}/thumb_${id}_${cleanName}.jpg`;
      const thumbRef = ref(storage, thumbPath);
      await uploadBytes(thumbRef, thumb);
      thumbUrl = await getDownloadURL(thumbRef);
    } catch (thumbError) {
      // Could not create or upload thumbnail
      // If thumbnail fails, proceed with the main file URL.
      thumbUrl = fileUrl; // Fallback to the main image URL
    }
  }

  return { fileUrl, thumbUrl };
}

export default { uploadFile };