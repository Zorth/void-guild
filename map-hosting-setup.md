# Self-Hosted Map Processor & Hosting Setup Guide

This guide provides step-by-step instructions to deploy a self-hosted **Map Processor & Static Tile Server** on your personal home server using **Docker Compose** and **Nginx**.

The map service provides:
1. **Web Upload UI**: A simple web UI for Game Masters to drag-and-drop high-resolution map images (PNG, JPEG, TIFF).
2. **Automatic Processing**:
   - Converts uploaded images to optimized **WebP** format.
   - Generates DeepZoom / Leaflet map tile pyramids (`{z}/{x}/{y}.webp`).
3. **CORS-Enabled Nginx Tile Server**: Serves processed map tiles and images directly to Void Guild with zero bandwidth limits or external storage costs.

---

## Architecture Overview

```
+-------------------------------------------------------------------------+
|                              Personal Server                            |
|                                                                         |
|   +-----------------------+                 +-----------------------+   |
|   | Map Processing UI     |  Upload Image   | Docker Container      |   |
|   | (Node.js + Express)   | --------------> | Sharp / VIPS Engine   |   |
|   | Port 3000 (Internal)  |                 | Generates WebP & Tiles|   |
|   +-----------------------+                 +-----------------------+   |
|               |                                         |               |
|               +-------------------+---------------------+               |
|                                   | Writes to shared volume             |
|                                   v                                     |
|                       +-----------------------+                         |
|                       | Shared Storage Volume |                         |
|                       |  /var/www/void-maps   |                         |
|                       +-----------------------+                         |
|                                   |                                     |
|                                   v                                     |
|                       +-----------------------+                         |
|                       |  Nginx Reverse Proxy  |                         |
|                       |  CORS Enabled (SSL)   |                         |
|                       +-----------------------+                         |
|                                   |                                     |
+-----------------------------------|-------------------------------------+
                                    | Serves https://maps.tarragon.be
                                    v
                        +-----------------------+
                        |  Void Guild Web App   |
                        |  (Leaflet Map Viewer) |
                        +-----------------------+
```

---

## Step 1: Set Up Directory & Files on Server

On your home server, create a dedicated project folder:

```bash
mkdir -p ~/void-map-processor
cd ~/void-map-processor
```

Create the following 4 files in `~/void-map-processor`:

### File 1: `package.json`

```json
{
  "name": "void-map-processor",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.3"
  }
}
```

### File 2: `server.js`

```javascript
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/data/public';
const UPLOAD_DIR = '/tmp/uploads';

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

app.use(cors());
app.use(express.static('public'));

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 250 * 1024 * 1024 } // 250 MB max file size
});

// Process Image & Convert to WebP / Tile Pyramid
app.post('/api/upload', upload.single('mapImage'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }

  const slug = (req.body.slug || 'map-' + Date.now())
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-');

  const mapFolder = path.join(OUTPUT_DIR, slug);
  const webpPath = path.join(OUTPUT_DIR, `${slug}.webp`);
  const tilePath = path.join(OUTPUT_DIR, `${slug}_tiles`);

  try {
    console.log(`[Processing] Starting image conversion for: ${slug}`);

    // 1. Convert main image to optimized WebP
    await sharp(req.file.path)
      .webp({ quality: 85 })
      .toFile(webpPath);

    // 2. Generate Leaflet/DeepZoom Tile Pyramid in WebP
    await sharp(req.file.path)
      .tile({
        size: 256,
        layout: 'dz', // DeepZoom format
        format: 'webp',
        quality: 80
      })
      .toFile(tilePath);

    // Clean up temporary upload file
    fs.unlinkSync(req.file.path);

    const baseUrl = process.env.BASE_URL || 'http://localhost';
    const imageUrl = `${baseUrl}/${slug}.webp`;
    const tilesUrl = `${baseUrl}/${slug}_tiles_files/{z}/{x}_{y}.webp`;

    console.log(`[Success] Processed ${slug}`);
    res.json({
      success: true,
      slug,
      imageUrl,
      tilesUrl,
      message: 'Map image converted to WebP and tiled successfully!'
    });
  } catch (err) {
    console.error('[Error] Image processing failed:', err);
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to process map image: ' + err.message });
  }
});

// List Processed Maps
app.get('/api/maps', (req, res) => {
  try {
    const files = fs.readdirSync(OUTPUT_DIR);
    const maps = files
      .filter(f => f.endsWith('.webp') && !f.includes('_files'))
      .map(f => {
        const slug = f.replace('.webp', '');
        const baseUrl = process.env.BASE_URL || 'http://localhost';
        return {
          slug,
          imageUrl: `${baseUrl}/${f}`,
          tilesUrl: `${baseUrl}/${slug}_tiles_files/{z}/{x}_{y}.webp`
        };
      });
    res.json({ maps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Map Processor running on port ${PORT}`);
});
```

### File 3: `public/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Void Guild Map Processor</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; max-width: 800px; margin: 0 auto; }
    h1 { color: #a855f7; border-bottom: 1px solid #334155; padding-bottom: 10px; }
    .card { background: #1e293b; border-radius: 8px; padding: 20px; border: 1px solid #334155; margin-bottom: 20px; }
    label { font-weight: bold; display: block; margin-bottom: 5px; color: #94a3b8; font-size: 14px; }
    input[type="text"], input[type="file"] { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #fff; margin-bottom: 15px; box-sizing: border-box; }
    button { background: #9333ea; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%; transition: background 0.2s; }
    button:hover { background: #7e22ce; }
    .status { margin-top: 15px; padding: 12px; border-radius: 6px; font-size: 14px; display: none; }
    .status.success { background: #064e3b; color: #6ee7b7; border: 1px solid #047857; }
    .status.error { background: #7f1d1d; color: #fca5a5; border: 1px solid #b91c1c; }
    .url-box { background: #0f172a; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px; word-break: break-all; border: 1px solid #334155; margin-top: 5px; color: #c084fc; }
    .map-list-item { border-bottom: 1px solid #334155; padding: 10px 0; }
    .map-list-item:last-child { border: none; }
  </style>
</head>
<body>

  <h1>🌌 Void Guild Map Processor</h1>

  <div class="card">
    <h2>Upload & Convert World Map</h2>
    <form id="uploadForm">
      <div>
        <label>Map Identifier / Slug (e.g. overworld, capital-city)</label>
        <input type="text" id="slugInput" placeholder="capital-city" required />
      </div>
      <div>
        <label>Select High-Res Map Image (PNG, JPG, TIFF - Max 250MB)</label>
        <input type="file" id="fileInput" accept="image/*" required />
      </div>
      <button type="submit" id="submitBtn">Upload & Convert to WebP / Tiles</button>
    </form>
    <div id="statusBox" class="status"></div>
  </div>

  <div class="card">
    <h2>Processed Maps</h2>
    <div id="mapList">Loading maps...</div>
  </div>

  <script>
    const form = document.getElementById('uploadForm');
    const statusBox = document.getElementById('statusBox');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const slug = document.getElementById('slugInput').value;
      const file = document.getElementById('fileInput').files[0];

      if (!file) return;

      const formData = new FormData();
      formData.append('slug', slug);
      formData.append('mapImage', file);

      submitBtn.disabled = true;
      submitBtn.innerText = 'Converting & Tiling... (Please wait)';
      statusBox.style.display = 'none';

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (data.success) {
          statusBox.className = 'status success';
          statusBox.innerHTML = `
            <strong>✅ Processing Complete!</strong><br>
            Copy this URL into Void Guild Map Settings:<br>
            <div class="url-box">${data.imageUrl}</div>
          `;
          statusBox.style.display = 'block';
          loadMaps();
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      } catch (err) {
        statusBox.className = 'status error';
        statusBox.innerText = '❌ Error: ' + err.message;
        statusBox.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Upload & Convert to WebP / Tiles';
      }
    });

    async function loadMaps() {
      const container = document.getElementById('mapList');
      try {
        const res = await fetch('/api/maps');
        const data = await res.json();
        if (data.maps.length === 0) {
          container.innerHTML = '<p style="color:#94a3b8; font-style:italic;">No processed maps yet.</p>';
          return;
        }
        container.innerHTML = data.maps.map(m => `
          <div class="map-list-item">
            <strong>${m.slug}</strong>
            <div class="url-box">${m.imageUrl}</div>
          </div>
        `).join('');
      } catch (err) {
        container.innerHTML = '<p style="color:#ef4444;">Failed to load map list.</p>';
      }
    }

    loadMaps();
  </script>
</body>
</html>
```

### File 4: `Dockerfile`

```dockerfile
FROM node:20-alpine

# Install libvips for fast C-level WebP and DeepZoom image tiling
RUN apk add --no-coache vips-dev build-base python3

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### File 5: `docker-compose.yml`

```yaml
version: '3.8'
services:
  map-processor:
    build: .
    container_name: void-map-processor
    restart: always
    environment:
      - PORT=3000
      - OUTPUT_DIR=/data/public
      - BASE_URL=https://maps.tarragon.be  # Replace with your domain
    volumes:
      - map-data:/data/public
    ports:
      - "3000:3000"

volumes:
  map-data:
    driver: local
```

---

## Step 2: Build & Start Docker Container

Run Docker Compose from `~/void-map-processor`:

```bash
docker-compose up -d --build
```

Verify that the container is running:
```bash
docker ps
```

---

## Step 3: Configure Nginx & SSL (Reverse Proxy)

On your host machine, set up Nginx to route `https://maps.tarragon.be` to the container and serve the static WebP images directly with CORS headers enabled.

Create `/etc/nginx/sites-available/maps.conf`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name maps.tarragon.be; # Replace with your domain

    # Increase max upload size to 250MB for raw map files
    client_max_body_size 250M;

    # Static file serving for processed WebP images & tiles
    location / {
        # Allow Void Guild browser canvas to fetch map images without CORS blocks
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;

        # Forward upload UI & API requests to Docker container
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the config and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/maps.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Obtain a free SSL Certificate with Certbot:
```bash
sudo certbot --nginx -d maps.tarragon.be
```

---

## Step 4: Using the Map Processor

1. Open **`https://maps.tarragon.be`** in your web browser.
2. Enter a **Map Slug** (e.g. `overworld` or `capital-city`).
3. Select your high-res map file and click **Upload & Convert**.
4. Once conversion finishes, copy the generated WebP image URL (`https://maps.tarragon.be/capital-city.webp`).
5. Open **Void Guild**, navigate to your World map, open **Map Settings**, and paste the URL into **Background Image URL**!
