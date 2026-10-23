import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const GALLERY_FILE = path.join(projectRoot, 'src', 'data', 'gallery.js');
const OUTPUT_DIR = path.join(projectRoot, 'public', 'gallery');
const BASE_PATH = '/DIANAxAKKO-Fan-Art-Gallery';

// 確保 public/gallery 資料夾存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 格式化日期：2026/10/1 -> 20261001
function formatDate(dateStr) {
  if (!dateStr) return 'unknown';
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}${m}${d}`;
  }
  return dateStr.replace(/[^0-9]/g, '');
}

// 下載圖片並取得 Buffer
async function fetchImageBuffer(mediaId) {
  const urls = [
    `https://pbs.twimg.com/media/${mediaId}?format=jpg&name=orig`,
    `https://pbs.twimg.com/media/${mediaId}?format=jpg&name=large`,
    `https://pbs.twimg.com/media/${mediaId}?format=png&name=orig`,
    `https://pbs.twimg.com/media/${mediaId}?format=png&name=large`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    } catch {
      // 嘗試下一個 URL
    }
  }
  throw new Error(`無法從 X 下載圖片 ID: ${mediaId}`);
}

async function main() {
  console.log('🚀 開始檢查並同步 X 圖片到本地 WebP...');

  let content = fs.readFileSync(GALLERY_FILE, 'utf-8');

  // 解析 gallery.js 內容
  // 匹配每個項目物件中的 date 與 url
  const itemRegex = /\{\s*date:\s*['"]([^'"]+)['"],\s*url:\s*['"](https:\/\/pbs\.twimg\.com\/media\/([^?'"]+)[^'"]*)['"]/g;

  const matches = [];
  let match;
  while ((match = itemRegex.exec(content)) !== null) {
    matches.push({
      fullMatch: match[0],
      date: match[1],
      oldUrl: match[2],
      mediaId: match[3]
    });
  }

  console.log(`📊 找到 ${matches.length} 筆尚未轉換的 X 圖片資料。`);

  if (matches.length === 0) {
    console.log('✅ 所有圖片皆已完成本地化轉換，無需更新！');
    return;
  }

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  // 控制同時下載數量（最多 5 個）
  const CONCURRENCY = 5;
  for (let i = 0; i < matches.length; i += CONCURRENCY) {
    const chunk = matches.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (item) => {
        const dateCode = formatDate(item.date);
        const fileName = `${dateCode}-${item.mediaId}.webp`;
        const localFilePath = path.join(OUTPUT_DIR, fileName);
        const newWebpUrl = `${BASE_PATH}/gallery/${fileName}`;

        try {
          // 如果檔案已存在則直接跳過下載
          if (!fs.existsSync(localFilePath)) {
            const rawBuffer = await fetchImageBuffer(item.mediaId);
            await sharp(rawBuffer)
              .webp({ quality: 90 })
              .toFile(localFilePath);
            console.log(`✨ [已下載並轉檔 WebP] ${fileName}`);
          } else {
            console.log(`⏩ [檔案已存在，更新路徑] ${fileName}`);
            skipCount++;
          }

          // 替換檔案內容中的 URL
          content = content.replace(item.oldUrl, newWebpUrl);
          successCount++;
        } catch (err) {
          console.error(`❌ [下載失敗] ${item.mediaId}:`, err.message);
          failCount++;
        }
      })
    );
  }

  // 寫回 gallery.js
  fs.writeFileSync(GALLERY_FILE, content, 'utf-8');

  // 計算 public/gallery 總容量
  const files = fs.readdirSync(OUTPUT_DIR);
  let totalBytes = 0;
  for (const f of files) {
    totalBytes += fs.statSync(path.join(OUTPUT_DIR, f)).size;
  }
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

  console.log('\n=======================================');
  console.log(`🎉 圖片同步與轉檔完成！`);
  console.log(`- 成功處理: ${successCount} 張`);
  if (skipCount > 0) console.log(`- 已存在跳過: ${skipCount} 張`);
  if (failCount > 0) console.log(`- 失敗: ${failCount} 張`);
  console.log(`- 本地 WebP 總檔案數: ${files.length} 張`);
  console.log(`- public/gallery 總大小: ${totalMB} MB`);
  console.log(`- gallery.js 已自動更新為本地路徑！`);
  console.log('=======================================\n');
}

main().catch((err) => {
  console.error('執行過程中發生錯誤:', err);
  process.exit(1);
});
