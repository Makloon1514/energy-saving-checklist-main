import { useState, useEffect } from 'react';

export default function Avatar({ src, alt, className }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!src) return;

    // Create an Image object to read the original file via browser
    const img = new window.Image();
    // Allow reading image data for same-origin or CORS-enabled images
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      // If the image is large, resize it using Canvas to avoid CSS aliasing bug
      if (img.width > 256 || img.height > 256) {
        const size = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        
        // We set the output canvas to 300x300, which is perfectly sharp for an 80x80 UI element
        canvas.width = 300; 
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        
        // Force high quality smoothing during downscale
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Top-crop to a square (to align face at the top)
        const sx = (img.width - size) / 2;
        const sy = 0;
        
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 300, 300);
        
        if (isMounted) {
          setDataUrl(canvas.toDataURL('image/jpeg', 0.9));
        }
      } else {
        if (isMounted) {
          setDataUrl(src);
        }
      }
    };
    
    // Fallback if image fails to process
    img.onerror = () => {
       if (isMounted) setDataUrl(src);
    };

    // Trigger image load
    img.src = src;

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!dataUrl) {
    return <div className={`animate-pulse bg-gray-200 ${className}`}></div>;
  }

  return <img src={dataUrl} alt={alt || ""} className={className} />;
}
