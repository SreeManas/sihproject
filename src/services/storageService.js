// src/services/storageService.js
// Firebase Storage upload with client-side thumbnail generation for images.
// Uses crypto.randomUUID() to avoid extra dependencies.

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function isImage(file) {
  return /^image\//i.test(file?.type || '');
}

async function createImageThumbnail(file, { maxW = 480, quality = 0.7 } = {}) {
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

export async function uploadFile(file, pathPrefix = 'reports') {
  if (!file) return { fileUrl: null, thumbUrl: null };
  const storage = getStorage();
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID().slice(0, 10) : String(Date.now());
  const cleanName = file.name?.replace(/\s+/g, '_') || `file_${id}`;
  const mainPath = `${pathPrefix}/${id}_${cleanName}`;
  const fileRef = ref(storage, mainPath);
  await uploadBytes(fileRef, file);
  const fileUrl = await getDownloadURL(fileRef);

  let thumbUrl = null;
  if (isImage(file)) {
    const thumb = await createImageThumbnail(file);
    const thumbRef = ref(storage, `${pathPrefix}/thumb_${id}_${cleanName}.jpg`);
    await uploadBytes(thumbRef, thumb);
    thumbUrl = await getDownloadURL(thumbRef);
  }

  return { fileUrl, thumbUrl };
}

export default { uploadFile };
