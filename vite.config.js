import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Custom plugin to handle local OG image upload and processing
function localOgUploadPlugin() {
  return {
    name: 'local-og-upload',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/upload-og-image' && req.method === 'POST') {
          try {
            // Buffer to hold request body chunks
            const chunks = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', async () => {
              try {
                const buffer = Buffer.concat(chunks);
                const bodyStr = buffer.toString('utf8');
                const json = JSON.parse(bodyStr);
                
                if (!json.image) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: 'No image provided' }));
                  return;
                }
                
                // Extract base64 data
                const base64Data = json.image.replace(/^data:image\/\w+;base64,/, "");
                const fileBuffer = Buffer.from(base64Data, 'base64');
                
                // Dynamic import jimp to process the image
                const { Jimp } = await import('jimp');
                const image = await Jimp.read(fileBuffer);
                const width = image.width;
                const height = image.height;
                
                console.log(`[Vite Upload API] Received image: ${width}x${height}`);
                
                // Detect boundaries (same logic as our script)
                let yStart = height;
                let yEnd = 0;
                for (let x of [100, Math.floor(width/2), width - 100]) {
                  if (x < 0 || x >= width) continue;
                  // Scan from top
                  for (let y = 0; y < height; y++) {
                    const color = image.getPixelColor(x, y);
                    const r = (color >> 24) & 0xff;
                    const g = (color >> 16) & 0xff;
                    const b = (color >> 8) & 0xff;
                    if (r > 30 || g > 30 || b > 30) {
                      if (y < yStart) yStart = y;
                      break;
                    }
                  }
                  // Scan from bottom
                  for (let y = height - 1; y >= 0; y--) {
                    const color = image.getPixelColor(x, y);
                    const r = (color >> 24) & 0xff;
                    const g = (color >> 16) & 0xff;
                    const b = (color >> 8) & 0xff;
                    if (r > 30 || g > 30 || b > 30) {
                      if (y > yEnd) yEnd = y;
                      break;
                    }
                  }
                }
                
                // Fallback boundary detection
                if (yStart >= yEnd || yEnd - yStart < 200) {
                  const currentRatio = width / height;
                  if (Math.abs(currentRatio - 1.91) < 0.1) {
                    yStart = 0;
                    yEnd = height;
                  } else {
                    yStart = Math.floor((height - (width / 1.91)) / 2);
                    if (yStart < 0) yStart = 0;
                    yEnd = height - yStart;
                  }
                }
                
                const cropHeight = yEnd - yStart;
                console.log(`[Vite Upload API] Cropping area: x=0, y=${yStart}, w=${width}, h=${cropHeight}`);
                image.crop({ x: 0, y: yStart, w: width, h: cropHeight });
                
                console.log('[Vite Upload API] Resizing to 1200x630...');
                image.resize({ w: 1200, h: 630 });
                
                // Save to public directory
                const publicJpgPath = path.join(process.cwd(), 'public/income_og_preview.jpg');
                const publicPngPath = path.join(process.cwd(), 'public/income_og_preview.png');
                
                await image.write(publicJpgPath, { quality: 80 });
                await image.write(publicPngPath);
                
                // Save to dist as well if it exists
                const distPath = path.join(process.cwd(), 'dist');
                if (fs.existsSync(distPath)) {
                  await image.write(path.join(distPath, 'income_og_preview.jpg'), { quality: 80 });
                  await image.write(path.join(distPath, 'income_og_preview.png'));
                }
                
                console.log(`[Vite Upload API] Successfully saved OG image to public/income_og_preview.jpg`);
                
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, message: 'OG Image successfully uploaded and updated locally!' }));
              } catch (e) {
                console.error('[Vite Upload API] Error processing image:', e);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: e.message }));
              }
            });
          } catch (e) {
            console.error('[Vite Upload API] Connection error:', e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), localOgUploadPlugin()],
})
