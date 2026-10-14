/**
 * Compresses and resizes an image File using an off-screen HTML Canvas.
 * Returns base64 and dataUrl suitable for Gemini Vision API.
 */
export function compressImage(file, maxDimension = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Nenhum ficheiro fornecido'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];

        resolve({
          dataUrl,
          base64,
          mimeType: 'image/jpeg',
          width,
          height,
        });
      };
      img.onerror = () => reject(new Error('Falha ao carregar a imagem'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Falha ao ler o ficheiro'));
    reader.readAsDataURL(file);
  });
}
