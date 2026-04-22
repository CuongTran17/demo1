/**
 * Downloads Be Vietnam Pro fonts for PDF certificate generation.
 * Run once: node scripts/download-fonts.js
 *
 * Fonts are saved to backend/fonts/ (git-ignored — download on each deployment).
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const FONTS_DIR = path.join(__dirname, '..', 'fonts');
const FONTS = [
  {
    name: 'BeVietnamPro-Regular.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/bevietnampro/BeVietnamPro-Regular.ttf',
  },
  {
    name: 'BeVietnamPro-Bold.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/bevietnampro/BeVietnamPro-Bold.ttf',
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, (res) => {
      // Follow redirect (GitHub raw returns 302)
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    req.on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function main() {
  if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR, { recursive: true });

  for (const font of FONTS) {
    const dest = path.join(FONTS_DIR, font.name);
    if (fs.existsSync(dest)) {
      console.log(`✓ ${font.name} already exists`);
      continue;
    }
    process.stdout.write(`⬇  Downloading ${font.name} ...`);
    try {
      await download(font.url, dest);
      console.log(' done');
    } catch (err) {
      console.log(` FAILED: ${err.message}`);
    }
  }
  console.log('✅ Font setup complete');
}

main();
