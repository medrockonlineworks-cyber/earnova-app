/**
 * Utility function to compress and resize images on the client side
 * to prevent Firestore's 1MB document size limit from being exceeded.
 * 
 * @param file The uploaded file
 * @param maxWidth The maximum width of the output image
 * @param maxHeight The maximum height of the output image
 * @param quality Visual quality from 0.0 to 1.0 (defaults to 0.75)
 * @returns Promise resolving to a base64 encoded data URL (image/jpeg)
 */
export function compressImage(
  file: File, 
  maxWidth = 1000, 
  maxHeight = 1000, 
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If browser doesn't support reading or canvas operations, resolve immediately with FileReader
    if (!window.FileReader || !window.HTMLCanvasElement) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate scaled dimensions maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string); // Fallback to raw data url
            return;
          }

          // Fill with white background to cleanly support transparent PNGs/GIFs
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // Draw image onto the scaled canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Export as compressed JPEG format (quality 0.75 offers incredible space savings with near-zero visual loss)
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          console.warn("Error during canvas image compression, using fallback:", err);
          resolve(e.target?.result as string); // Fallback
        }
      };

      img.onerror = (err) => {
        console.warn("Error loading image for compression, using fallback:", err);
        resolve(e.target?.result as string); // Fallback
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = (err) => {
      reject(err);
    };

    reader.readAsDataURL(file);
  });
}
