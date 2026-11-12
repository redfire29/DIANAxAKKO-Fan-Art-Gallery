/**
 * 作品資料與媒體 URL 處理工具函式
 */

/**
 * 取得作品的唯一識別鍵，避免無 url 的項目（如 YouTube）在列表中產生重複鍵
 * @param {object} item
 * @returns {string}
 */
export function getItemKey(item) {
  if (!item) return "";
  return item.url || (item.youtubeId ? `youtube:${item.youtubeId}` : item.date || "");
}

/**
 * 將 X (Twitter) 圖片縮圖參數轉為高畫質原圖，非 X URL 則原樣回傳
 * @param {string} url
 * @returns {string}
 */
export function getHighResUrl(url) {
  if (!url) return "";
  return url.replace(/name=\w+/, "name=large");
}

/**
 * 取得卡片與縮圖列表使用的圖片位址
 * @param {object} item
 * @returns {string}
 */
export function getThumbnailUrl(item) {
  if (!item) return "";
  if (item.type === "youtube") {
    return `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`;
  }
  return item.url || "";
}

/**
 * 取得燈箱／預覽大圖使用的媒體位址
 * @param {object} item
 * @returns {string}
 */
export function getLargeMediaUrl(item) {
  if (!item) return "";
  if (item.type === "youtube") {
    return `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`;
  }
  if (item.type === "video") {
    return item.url || "";
  }
  return getHighResUrl(item.url);
}

/**
 * 取得作品外部來源連結（YouTube Shorts 或 Twitter/X）
 * @param {object} item
 * @returns {string}
 */
export function getSourceLink(item) {
  if (!item) return "";
  if (item.type === "youtube") {
    return `https://www.youtube.com/shorts/${item.youtubeId}`;
  }
  return item.link || "";
}

/**
 * 取得作品來源按鈕顯示文字
 * @param {object} item
 * @returns {string}
 */
export function getSourceLabel(item) {
  return item?.type === "youtube" ? "YouTube Shorts" : "Twitter (X)";
}

/**
 * 解析作品日期字串（支援 YYYY/MM/DD 與未補零的 YYYY/M/D）
 * @param {string} dateStr
 * @returns {{ year: string, month: number, day: number }}
 */
export function parseGalleryDate(dateStr) {
  const parts = (dateStr || "").split("/");
  return {
    year: parts[0] || "",
    month: parts[1] ? parseInt(parts[1], 10) : 0,
    day: parts[2] ? parseInt(parts[2], 10) : 0,
  };
}

