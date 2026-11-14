import { getHighResUrl, getThumbnailUrl, parseGalleryDate } from "./galleryMedia";

/**
 * 載入圖片或影片第一幀作為 Canvas 繪製來源
 * @param {string} url
 * @returns {Promise<HTMLImageElement | HTMLVideoElement>}
 */
export function loadMediaElement(url) {
  return new Promise((resolve, reject) => {
    if (url.endsWith(".mp4") || url.includes(".mp4?")) {
      const vid = document.createElement("video");
      vid.crossOrigin = "anonymous";
      vid.muted = true;
      vid.playsInline = true;
      vid.preload = "auto";
      vid.onloadeddata = () => {
        vid.currentTime = 0.1;
      };
      vid.onseeked = () => resolve(vid);
      vid.onerror = (err) => reject(err);
      vid.src = url;
      vid.load();
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

/**
 * 繪製圓角矩形路徑
 */
export function drawRoundedRect(ctx, x, y, width, height, radius) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

/**
 * 繪製無作品或載入失敗時的佔位框
 */
function drawNoArtBox(ctx, x, y, w, h, text) {
  ctx.save();
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 12]);
  ctx.strokeRect(x + 20, y + 20, w - 40, h - 40);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "italic bold 36px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.restore();
}

/**
 * 觸發 JPG 下載
 */
function triggerCanvasJpgDownload(canvas, filename) {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/**
 * 格式化「年份.月份」標記
 */
function formatYearMonthLabel(item, defaultYear, defaultMonth) {
  if (item?.date) {
    const { year, month } = parseGalleryDate(item.date);
    if (year && month) {
      return `${year}.${month.toString().padStart(2, "0")}`;
    }
  }
  const m = (defaultMonth || 1).toString().padStart(2, "0");
  return `${defaultYear}.${m}`;
}

/**
 * 匯出年度 12 宮格回顧 JPG
 * @param {object} options
 */
export async function exportYearlySummaryCanvas({
  selectedYear,
  getMonthThumbnail,
  getImageOffset,
  onProgress,
}) {
  onProgress?.("建立畫布中...");

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const cols = 4;
  const rows = 3;
  const boxW = 490;
  const headerH = 70;
  const imgH = 490;
  const boxH = headerH + imgH;
  const gapX = 36;
  const gapY = 44;
  const startY = 190;
  const totalW = cols * boxW + (cols - 1) * gapX;
  const startX = (2400 - totalW) / 2;

  canvas.width = 2400;
  canvas.height = startY + rows * boxH + (rows - 1) * gapY + 60;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, "#f8fafc");
  bgGrad.addColorStop(1, "#f1f5f9");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 112px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(selectedYear, canvas.width / 2, 115);

  const monthNames = [
    "01 JAN", "02 FEB", "03 MAR", "04 APR",
    "05 MAY", "06 JUN", "07 JUL", "08 AUG",
    "09 SEP", "10 OCT", "11 NOV", "12 DEC",
  ];

  for (let i = 0; i < 12; i++) {
    const month = i + 1;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (boxW + gapX);
    const y = startY + row * (boxH + gapY);

    onProgress?.(`正在合成 ${month} 月作品... (${month}/12)`);

    // 卡片底色與陰影
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.beginPath();
    drawRoundedRect(ctx, x, y, boxW, boxH, 20);
    ctx.fill();
    ctx.restore();

    // 月份標頭區
    ctx.save();
    ctx.beginPath();
    drawRoundedRect(ctx, x, y, boxW, boxH, 20);
    ctx.clip();

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(x, y, boxW, headerH);

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + headerH);
    ctx.lineTo(x + boxW, y + headerH);
    ctx.stroke();

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 32px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(monthNames[i], x + boxW / 2, y + headerH / 2);
    ctx.restore();

    // 圖片內容區
    const thumbUrl = getMonthThumbnail(month, selectedYear);
    const offset = getImageOffset(month, selectedYear);
    const posX = (offset.x ?? 50) / 100;
    const posY = (offset.y ?? 50) / 100;

    ctx.save();
    ctx.beginPath();
    drawRoundedRect(ctx, x, y, boxW, boxH, 20);
    ctx.clip();

    if (thumbUrl) {
      try {
        const targetUrl = thumbUrl.includes("twimg.com") ? getHighResUrl(thumbUrl) : thumbUrl;
        const media = await loadMediaElement(targetUrl);
        const mWidth = media.videoWidth || media.naturalWidth || media.width;
        const mHeight = media.videoHeight || media.naturalHeight || media.height;

        const imgRatio = mWidth / mHeight;
        const boxRatio = boxW / imgH;
        let sW, sH, sx, sy;
        if (imgRatio > boxRatio) {
          sH = mHeight;
          sW = mHeight * boxRatio;
          sx = (mWidth - sW) * posX;
          sy = 0;
        } else {
          sW = mWidth;
          sH = mWidth / boxRatio;
          sx = 0;
          sy = (mHeight - sH) * posY;
        }

        ctx.drawImage(media, sx, sy, sW, sH, x, y + headerH, boxW, imgH);
      } catch (err) {
        console.error(`載入 ${month} 月圖片失敗:`, err);
        drawNoArtBox(ctx, x, y + headerH, boxW, imgH, "Load Error");
      }
    } else {
      drawNoArtBox(ctx, x, y + headerH, boxW, imgH, "NO ART");
    }
    ctx.restore();

    // 外邊框
    ctx.save();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    drawRoundedRect(ctx, x, y, boxW, boxH, 20);
    ctx.stroke();
    ctx.restore();
  }

  onProgress?.("下載中...");
  triggerCanvasJpgDownload(canvas, `${selectedYear}_Summary_of_Art.jpg`);
}

/**
 * 匯出跨年份雙圖對比 JPG
 * @param {object} options
 */
export async function exportCompareImageCanvas({
  imageA,
  imageB,
  yearA,
  monthA,
  yearB,
  monthB,
}) {
  const resolveMediaUrl = (item) =>
    item.type === "youtube" ? getThumbnailUrl(item) : getHighResUrl(item.url);

  const [mediaA, mediaB] = await Promise.all([
    loadMediaElement(resolveMediaUrl(imageA)),
    loadMediaElement(resolveMediaUrl(imageB)),
  ]);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const mW_A = mediaA.videoWidth || mediaA.naturalWidth || mediaA.width || 1;
  const mH_A = mediaA.videoHeight || mediaA.naturalHeight || mediaA.height || 1;
  const mW_B = mediaB.videoWidth || mediaB.naturalWidth || mediaB.width || 1;
  const mH_B = mediaB.videoHeight || mediaB.naturalHeight || mediaB.height || 1;

  const targetH = 1600;
  const imgW_A = Math.round(targetH * (mW_A / mH_A));
  const imgW_B = Math.round(targetH * (mW_B / mH_B));

  const pad = 36;
  const gap = 24;
  const labelH = 80;

  canvas.width = pad + imgW_A + gap + imgW_B + pad;
  canvas.height = pad + labelH + targetH + pad;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const labelA = formatYearMonthLabel(imageA, yearA, monthA);
  const labelB = formatYearMonthLabel(imageB, yearB, monthB);

  const columns = [
    { media: mediaA, mW: mW_A, mH: mH_A, imgW: imgW_A, x: pad, label: labelA },
    { media: mediaB, mW: mW_B, mH: mH_B, imgW: imgW_B, x: pad + imgW_A + gap, label: labelB },
  ];

  for (const col of columns) {
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 56px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(col.label, col.x + col.imgW / 2, pad + labelH / 2);

    const imgY = pad + labelH;
    ctx.drawImage(col.media, 0, 0, col.mW, col.mH, col.x, imgY, col.imgW, targetH);

    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(col.x, imgY, col.imgW, targetH);
  }

  triggerCanvasJpgDownload(canvas, `Art_Comparison_${labelA}_vs_${labelB}.jpg`);
}

