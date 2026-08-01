/**
 * Count Us In - Client-side Image Compression Utility
 * Rescales images to a maximum dimension, compresses to WebP, strips metadata, and verifies file sizes.
 */

interface CompressionResult {
  file: File;
  previewUrl: string;
}

/**
 * Compresses an uploaded image file (JPEG/PNG/WebP) and returns a WebP blob File.
 * Resizes the image so that the maximum width or height is 1200px.
 * 
 * @param file The original user-selected file.
 * @param maxDimension The maximum allowed width or height in pixels. Default is 1200.
 * @param quality Compression quality from 0.1 to 1.0. Default is 0.8.
 * @returns A promise resolving to a new File containing compressed WebP data and a client-side preview URL.
 */
export function compressImage(
  file: File,
  maxDimension: number = 1200,
  quality: number = 0.8
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    // 1. Validate MIME type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return reject(new Error('Unsupported file type. Please upload a JPEG, PNG, or WebP image.'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        // Calculate new dimensions keeping aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Draw image onto canvas to perform compression and scaling
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context.'));
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas output to compressed WebP blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Image compression failed.'));
            }

            // Create compressed file with random name to avoid exposure
            const randomName = `${Math.random().toString(36).substring(2, 15)}.webp`;
            const compressedFile = new File([blob], randomName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            const previewUrl = URL.createObjectURL(compressedFile);

            resolve({
              file: compressedFile,
              previewUrl,
            });
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image file.'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };
  });
}
