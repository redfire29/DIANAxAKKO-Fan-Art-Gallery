<script>
    import { onMount } from "svelte";
    import { galleryImages } from "../data/gallery";

    const availableYears = [
        ...new Set(galleryImages.map((img) => img.date.split("/")[0])),
    ].sort((a, b) => a - b);

    let selectedYear = $state(availableYears.length > 0 ? availableYears[availableYears.length - 1] : new Date().getFullYear().toString());
    let userIndices = $state({});

    // Load persisted indices from localStorage & check secret mode
    let isSecretUnlocked = $state(false);

    onMount(() => {
        const saved = localStorage.getItem("yearly-gallery-indices");
        if (saved) {
            try {
                userIndices = JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved indices", e);
            }
        }

        const savedOffsets = localStorage.getItem("yearly-image-offsets");
        if (savedOffsets) {
            try {
                imageOffsets = JSON.parse(savedOffsets);
            } catch (e) {
                console.error("Failed to parse saved offsets", e);
            }
        }

        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            if (params.get("pint") === "0701" || params.get("print") === "0701") {
                isSecretUnlocked = true;
            }
        }
    });

    // --- 圖片位置微調功能 ---
    let isRepositionMode = $state(false);
    let imageOffsets = $state({});
    let activeDrag = $state(null);

    $effect(() => {
        if (typeof localStorage !== "undefined") {
            localStorage.setItem("yearly-image-offsets", JSON.stringify(imageOffsets));
        }
    });

    const getImageOffset = (month, year = selectedYear) => {
        const key = `${year}-${month}`;
        return imageOffsets[key] || { x: 50, y: 50 };
    };

    const updateImageOffset = (month, year, x, y) => {
        const key = `${year}-${month}`;
        const clampedX = Math.max(0, Math.min(100, Math.round(x)));
        const clampedY = Math.max(0, Math.min(100, Math.round(y)));
        imageOffsets = {
            ...imageOffsets,
            [key]: { x: clampedX, y: clampedY },
        };
    };

    const resetImageOffset = (month, year = selectedYear) => {
        const key = `${year}-${month}`;
        const updated = { ...imageOffsets };
        delete updated[key];
        imageOffsets = updated;
    };

    const handleDragStart = (e, month) => {
        if (!isRepositionMode) return;
        e.preventDefault();
        e.stopPropagation();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        const current = getImageOffset(month, selectedYear);
        const rect = e.currentTarget.getBoundingClientRect();
        activeDrag = {
            month,
            startX: clientX,
            startY: clientY,
            initialX: current.x,
            initialY: current.y,
            width: rect.width || 300,
            height: rect.height || 300,
        };
    };

    const handleDragMove = (e) => {
        if (!activeDrag) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        const deltaX = clientX - activeDrag.startX;
        const deltaY = clientY - activeDrag.startY;

        // 反向直覺拖曳：滑鼠往下拉，想要看到上方內容（Y 變小）
        const percentX = activeDrag.initialX - (deltaX / activeDrag.width) * 100;
        const percentY = activeDrag.initialY - (deltaY / activeDrag.height) * 100;

        updateImageOffset(activeDrag.month, selectedYear, percentX, percentY);
    };

    const handleDragEnd = () => {
        activeDrag = null;
    };

    // --- 秘密功能一：年度回顧 12 宮格 JPG 導出 ---
    let isExportingSummary = $state(false);
    let exportSummaryProgress = $state("");

    const loadMediaElement = (url) => {
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
            } else {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = (err) => reject(err);
                img.src = url;
            }
        });
    };

    const drawRoundedRect = (ctx, x, y, width, height, radius) => {
        if (ctx.roundRect) {
            ctx.roundRect(x, y, width, height, radius);
        } else {
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
    };

    const drawNoArtBox = (ctx, x, y, w, h, text) => {
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
    };

    const exportYearlySummary = async () => {
        if (isExportingSummary) return;
        isExportingSummary = true;
        exportSummaryProgress = "建立畫布中...";

        try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            
            // 4 欄 x 3 列
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

            // 背景：優雅簡約淡灰漸層
            const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            bgGrad.addColorStop(0, "#f8fafc");
            bgGrad.addColorStop(1, "#f1f5f9");
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 頂部只顯示大年份，其他文字全部不顯示
            ctx.fillStyle = "#0f172a";
            ctx.font = "bold 112px 'Inter', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(selectedYear, canvas.width / 2, 115);

            const monthNames = [
                "01 JAN", "02 FEB", "03 MAR", "04 APR",
                "05 MAY", "06 JUN", "07 JUL", "08 AUG",
                "09 SEP", "10 OCT", "11 NOV", "12 DEC"
            ];

            for (let i = 0; i < 12; i++) {
                const month = i + 1;
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = startX + col * (boxW + gapX);
                const y = startY + row * (boxH + gapY);

                exportSummaryProgress = `正在合成 ${month} 月作品... (${month}/12)`;

                // 卡片本體白色底與柔和陰影
                ctx.save();
                ctx.fillStyle = "#ffffff";
                ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
                ctx.shadowBlur = 24;
                ctx.shadowOffsetY = 10;
                ctx.beginPath();
                drawRoundedRect(ctx, x, y, boxW, boxH, 20);
                ctx.fill();
                ctx.restore();

                // 標頭區（獨立在圖片上方，維持字卡感，寫 01 JAN）
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

                // 圖片區域（位於 y + headerH，正方形 490x490）
                const thumbUrl = getMonthThumbnail(month, selectedYear, userIndices);
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

                // 卡片外邊框
                ctx.save();
                ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                drawRoundedRect(ctx, x, y, boxW, boxH, 20);
                ctx.stroke();
                ctx.restore();
            }

            exportSummaryProgress = "下載中...";
            const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
            const link = document.createElement("a");
            link.download = `${selectedYear}_Summary_of_Art.jpg`;
            link.href = dataUrl;
            link.click();
        } catch (e) {
            console.error("導出年度回顧失敗", e);
            alert("導出年度回顧圖失敗，請檢查網路連線或稍後再試！");
        } finally {
            isExportingSummary = false;
            exportSummaryProgress = "";
        }
    };

    // --- 秘密功能二：跨年份雙圖對比 ---
    let isCompareModalOpen = $state(false);
    let compareYearA = $state(availableYears[0] || selectedYear);
    let compareYearB = $state(availableYears[availableYears.length - 1] || selectedYear);
    let compareMonthA = $state(null);
    let compareMonthB = $state(null);
    let compareImageA = $state(null);
    let compareImageB = $state(null);
    let isExportingCompare = $state(false);

    // 取得某年份中有作品的所有月份清單（含該月作品數）
    const getAvailableMonthsForYear = (year) => {
        const monthCounts = {};
        galleryImages
            .filter((img) => img.date.startsWith(year))
            .forEach((img) => {
                const parts = img.date.split("/");
                if (parts.length >= 2) {
                    const m = parseInt(parts[1], 10);
                    monthCounts[m] = (monthCounts[m] || 0) + 1;
                }
            });
        return Object.keys(monthCounts)
            .map((m) => parseInt(m, 10))
            .sort((a, b) => a - b)
            .map((m) => ({ month: m, count: monthCounts[m] }));
    };

    let availableMonthsA = $derived(getAvailableMonthsForYear(compareYearA));
    let availableMonthsB = $derived(getAvailableMonthsForYear(compareYearB));

    // 取得指定年份與月份的所有作品列表
    const getImagesForYearMonth = (year, month) => {
        if (!month) return [];
        const mStr = month.toString().padStart(2, "0");
        return galleryImages.filter((img) => img.date.startsWith(`${year}/${mStr}`)).reverse();
    };

    let imagesForSelectionA = $derived(getImagesForYearMonth(compareYearA, compareMonthA));
    let imagesForSelectionB = $derived(getImagesForYearMonth(compareYearB, compareMonthB));

    const openCompareModal = () => {
        compareYearA = availableYears[0] || selectedYear;
        compareYearB = availableYears[availableYears.length - 1] || selectedYear;

        const monthsA = getAvailableMonthsForYear(compareYearA);
        if (monthsA.length > 0) {
            compareMonthA = monthsA[0].month;
            const imgsA = getImagesForYearMonth(compareYearA, compareMonthA);
            compareImageA = imgsA.length > 0 ? imgsA[0] : null;
        } else {
            compareMonthA = null;
            compareImageA = null;
        }

        const monthsB = getAvailableMonthsForYear(compareYearB);
        if (monthsB.length > 0) {
            compareMonthB = monthsB[monthsB.length - 1].month;
            const imgsB = getImagesForYearMonth(compareYearB, compareMonthB);
            compareImageB = imgsB.length > 0 ? imgsB[0] : null;
        } else {
            compareMonthB = null;
            compareImageB = null;
        }

        isCompareModalOpen = true;
        if (typeof document !== "undefined") {
            document.body.style.overflow = "hidden";
        }
    };

    const closeCompareModal = () => {
        isCompareModalOpen = false;
        if (typeof document !== "undefined") {
            document.body.style.overflow = "auto";
        }
    };

    const handleYearAChange = (newYear) => {
        compareYearA = newYear;
        const months = getAvailableMonthsForYear(newYear);
        if (months.length > 0) {
            compareMonthA = months[0].month;
            const images = getImagesForYearMonth(newYear, compareMonthA);
            compareImageA = images.length > 0 ? images[0] : null;
        } else {
            compareMonthA = null;
            compareImageA = null;
        }
    };

    const handleMonthAChange = (month) => {
        compareMonthA = month;
        const images = getImagesForYearMonth(compareYearA, month);
        compareImageA = images.length > 0 ? images[0] : null;
    };

    const handleYearBChange = (newYear) => {
        compareYearB = newYear;
        const months = getAvailableMonthsForYear(newYear);
        if (months.length > 0) {
            compareMonthB = months[months.length - 1].month;
            const images = getImagesForYearMonth(newYear, compareMonthB);
            compareImageB = images.length > 0 ? images[0] : null;
        } else {
            compareMonthB = null;
            compareImageB = null;
        }
    };

    const handleMonthBChange = (month) => {
        compareMonthB = month;
        const images = getImagesForYearMonth(compareYearB, month);
        compareImageB = images.length > 0 ? images[0] : null;
    };

    const getFormattedYearMonth = (item, defaultYear, defaultMonth) => {
        if (item && item.date) {
            const parts = item.date.split("/");
            if (parts.length >= 2) {
                const y = parts[0];
                const m = parts[1].padStart(2, "0");
                return `${y}.${m}`;
            }
        }
        const m = (defaultMonth || 1).toString().padStart(2, "0");
        return `${defaultYear}.${m}`;
    };

    const exportCompareImage = async () => {
        if (!compareImageA || !compareImageB || isExportingCompare) return;
        isExportingCompare = true;

        try {
            const urlA = compareImageA.type === "youtube"
                ? `https://img.youtube.com/vi/${compareImageA.youtubeId}/hqdefault.jpg`
                : getHighResUrl(compareImageA.url);
            const urlB = compareImageB.type === "youtube"
                ? `https://img.youtube.com/vi/${compareImageB.youtubeId}/hqdefault.jpg`
                : getHighResUrl(compareImageB.url);

            const [mediaA, mediaB] = await Promise.all([
                loadMediaElement(urlA),
                loadMediaElement(urlB),
            ]);

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // 原始圖片尺寸
            const mW_A = mediaA.videoWidth || mediaA.naturalWidth || mediaA.width || 1;
            const mH_A = mediaA.videoHeight || mediaA.naturalHeight || mediaA.height || 1;
            const mW_B = mediaB.videoWidth || mediaB.naturalWidth || mediaB.width || 1;
            const mH_B = mediaB.videoHeight || mediaB.naturalHeight || mediaB.height || 1;

            // 緊湊等高排版：以 1600px 高度為基準等比例縮放，完整保留構圖
            const targetH = 1600;
            const imgW_A = Math.round(targetH * (mW_A / mH_A));
            const imgW_B = Math.round(targetH * (mW_B / mH_B));

            // 邊距與標籤列高度
            const pad = 36;
            const gap = 24;
            const labelH = 80;

            canvas.width = pad + imgW_A + gap + imgW_B + pad;
            canvas.height = pad + labelH + targetH + pad;

            // 畫布背景：乾淨純白
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 取得「年份.月份」標籤
            const labelA = getFormattedYearMonth(compareImageA, compareYearA, compareMonthA);
            const labelB = getFormattedYearMonth(compareImageB, compareYearB, compareMonthB);

            // --- 繪製左圖 (A) ---
            // 頂部年份.月份文字
            ctx.fillStyle = "#1e293b";
            ctx.font = "bold 56px 'Inter', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(labelA, pad + imgW_A / 2, pad + labelH / 2);

            // 左圖本體
            const leftImgX = pad;
            const leftImgY = pad + labelH;
            ctx.drawImage(mediaA, 0, 0, mW_A, mH_A, leftImgX, leftImgY, imgW_A, targetH);

            // 圖片細緻邊框
            ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
            ctx.lineWidth = 2;
            ctx.strokeRect(leftImgX, leftImgY, imgW_A, targetH);

            // --- 繪製右圖 (B) ---
            const rightImgX = pad + imgW_A + gap;
            const rightImgY = pad + labelH;

            // 頂部年份.月份文字
            ctx.fillStyle = "#1e293b";
            ctx.font = "bold 56px 'Inter', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(labelB, rightImgX + imgW_B / 2, pad + labelH / 2);

            // 右圖本體
            ctx.drawImage(mediaB, 0, 0, mW_B, mH_B, rightImgX, rightImgY, imgW_B, targetH);

            // 圖片細緻邊框
            ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
            ctx.lineWidth = 2;
            ctx.strokeRect(rightImgX, rightImgY, imgW_B, targetH);

            // 下載 JPG
            const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
            const link = document.createElement("a");
            link.download = `Art_Comparison_${labelA}_vs_${labelB}.jpg`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("導出對比圖失敗", err);
            alert("導出對比圖失敗，請檢查圖片載入或稍後再試！");
        } finally {
            isExportingCompare = false;
        }
    };


    // Update localStorage when indices change - handled via reactive statement below
    $effect(() => {
        if (typeof localStorage !== "undefined") {
            localStorage.setItem(
                "yearly-gallery-indices",
                JSON.stringify(userIndices),
            );
        }
    });

    let yearlyTotalCount = $derived(galleryImages.filter((img) =>
        img.date.startsWith(selectedYear),
    ).length);

    const getMonthData = (month, year = selectedYear) => {
        const monthStr = month.toString().padStart(2, "0");
        // Vue version reversed it, matching that logic
        return galleryImages
            .filter((img) => img.date.startsWith(`${year}/${monthStr}`))
            .reverse();
    };

    const getMonthCount = (month, year = selectedYear) => {
        return getMonthData(month, year).length;
    };

    const getMonthThumbnail = (
        month,
        year = selectedYear,
        indices = userIndices,
    ) => {
        const data = getMonthData(month, year);
        if (data.length === 0) return null;

        const key = `${year}-${month}`;
        const index = indices[key] || 0;

        // Ensure index is within bounds if data changed
        const safeIndex = index % data.length;
        const img = data[safeIndex];
        return img.type === 'youtube' ? `https://img.youtube.com/vi/${img.youtubeId}/hqdefault.jpg` : img.url;
    };

    const cycleImage = (month) => {
        const count = getMonthCount(month);
        if (count <= 1) return;

        const key = `${selectedYear}-${month}`;
        const currentIndex = userIndices[key] || 0;
        // Svelte reactivity: assign new object to trigger updates
        userIndices = {
            ...userIndices,
            [key]: (currentIndex + 1) % count,
        };
    };

    const getUserIndex = (
        month,
        year = selectedYear,
        indices = userIndices,
    ) => {
        const key = `${year}-${month}`;
        return (indices[key] || 0) + 1;
    };

    const cycleImagePrev = (month) => {
        const count = getMonthCount(month);
        if (count <= 1) return;

        const key = `${selectedYear}-${month}`;
        const currentIndex = userIndices[key] || 0;
        userIndices = {
            ...userIndices,
            [key]: (currentIndex - 1 + count) % count,
        };
    };

    // Lightbox Logic for Yearly Gallery
    import { fade, fly } from 'svelte/transition';
    let isModalOpen = $state(false);
    let selectedModalImageIndex = $state(0);
    let modalImages = $state([]);

    const getHighResUrl = (url) => {
        if (!url) return "";
        return url.replace(/name=\w+/, 'name=large');
    };

    const openModalForMonth = (month) => {
        const data = getMonthData(month, selectedYear);
        if (data.length === 0) return;
        
        modalImages = data;
        const key = `${selectedYear}-${month}`;
        const currentIdx = userIndices[key] || 0;
        selectedModalImageIndex = currentIdx % data.length;
        isModalOpen = true;
        
        if (typeof document !== 'undefined') {
            document.body.style.overflow = 'hidden';
        }
    };

    const closeModal = () => {
        isModalOpen = false;
        if (typeof document !== 'undefined') {
            document.body.style.overflow = 'auto';
        }
    };

    const nextImage = () => {
        if (modalImages.length === 0) return;
        selectedModalImageIndex = (selectedModalImageIndex + 1) % modalImages.length;
    };

    const prevImage = () => {
        if (modalImages.length === 0) return;
        selectedModalImageIndex = (selectedModalImageIndex - 1 + modalImages.length) % modalImages.length;
    };

    // 行動端滑動手勢
    let touchStartX = $state(0);
    let touchStartY = $state(0);
    let touchEndX = $state(0);
    let touchEndY = $state(0);
    
    let imageLoadStatus = $state({});

    const handleTouchStart = (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    };

    const handleSwipe = () => {
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 50) {
                prevImage();
            } else if (diffX < -50) {
                nextImage();
            }
        } else {
            if (diffY > 100) {
                closeModal();
            }
        }
    };

    const handleKeydown = (event) => {
        if (!isModalOpen) return;
        if (event.key === 'Escape') closeModal();
        if (event.key === 'ArrowRight') nextImage();
        if (event.key === 'ArrowLeft') prevImage();
    };
</script>

<svelte:window 
    on:keydown={handleKeydown} 
    on:mousemove={handleDragMove} 
    on:mouseup={handleDragEnd} 
    on:touchmove={handleDragMove} 
    on:touchend={handleDragEnd} 
/>

<div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto 2xl:max-w-[1920px]">
        <div class="text-center mb-4">
            <div class="mb-6 flex justify-center gap-4 flex-wrap items-center">
                {#each availableYears as year (year)}
                    <button
                        on:click={() => (selectedYear = year)}
                        class="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 transition-colors {selectedYear ===
                        year
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'}"
                    >
                        {year}
                    </button>
                {/each}

                {#if isSecretUnlocked}
                    <button
                        on:click={() => (isRepositionMode = !isRepositionMode)}
                        class="px-4 py-2 rounded-md text-sm font-medium border transition-colors flex items-center gap-2 cursor-pointer {isRepositionMode ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}"
                    >
                        {#if isRepositionMode}
                            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            <span>完成微調</span>
                        {:else}
                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                            </svg>
                            <span>微調圖片位置</span>
                        {/if}
                    </button>

                    <button
                        on:click={exportYearlySummary}
                        disabled={isExportingSummary}
                        class="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 transition-colors bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {#if isExportingSummary}
                            <svg class="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{exportSummaryProgress || '導出中...'}</span>
                        {:else}
                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            <span>匯出 {selectedYear} 年度回顧</span>
                        {/if}
                    </button>

                    <button
                        on:click={openCompareModal}
                        class="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 transition-colors bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                    >
                        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                        </svg>
                        <span>雙年份比對</span>
                    </button>
                {/if}
            </div>
            <h1
                class="text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl"
            >
                {selectedYear} 年度表
            </h1>
            <p
                class="mt-2 text-sm font-medium text-blue-600 bg-blue-50 inline-block px-4 py-1 rounded-full"
            >
                今年總計：{yearlyTotalCount} 張作品
            </p>
        </div>

        {#if isRepositionMode}
            <div class="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div class="flex items-center gap-2.5">
                    <svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span><strong>微調模式已開啟</strong>：直接在下方各月份圖片上<strong>按住滑鼠拖曳</strong>即可調整上下/左右裁切位置，畫面將即時反映並自動保存，輸出年度回顧時會精確採用此視角。</span>
                </div>
                <button
                    on:click={() => (isRepositionMode = false)}
                    class="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold shrink-0 cursor-pointer shadow-sm transition-colors"
                >
                    完成微調
                </button>
            </div>
        {/if}

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {#each Array(12) as _, i}
                {@const month = i + 1}
                <div
                    class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 group flex flex-col"
                >
                    <!-- Month Header -->
                    <div
                        class="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center"
                    >
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-gray-900">{month} 月</span>
                            {#if isRepositionMode && getMonthCount(month, selectedYear) > 0}
                                <button
                                    type="button"
                                    on:click|stopPropagation={() => resetImageOffset(month, selectedYear)}
                                    title="重設裁切位置為置中"
                                    class="text-[11px] text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded border border-amber-300 font-medium cursor-pointer transition-colors"
                                >
                                    重設
                                </button>
                            {/if}
                        </div>
                        {#if getMonthCount(month, selectedYear) > 0}
                            <span class="text-xs text-gray-400 font-medium">
                                {getUserIndex(month, selectedYear, userIndices)} /
                                {getMonthCount(month, selectedYear)}
                            </span>
                        {/if}
                    </div>

                    <!-- Image Container -->
                    <div
                        class="aspect-square relative overflow-hidden bg-gray-100 group/img border-t border-gray-100/50 {isRepositionMode ? 'cursor-grab active:cursor-grabbing select-none' : ''}"
                        on:mousedown={(e) => handleDragStart(e, month)}
                        on:touchstart={(e) => handleDragStart(e, month)}
                    >
                        {#if getMonthThumbnail(month, selectedYear, userIndices)}
                            {#if !imageLoadStatus[`${selectedYear}-${month}`]}
                                <div class="absolute inset-0 bg-gray-200 animate-pulse z-0 pointer-events-none"></div>
                            {/if}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                            <div 
                                class="w-full h-full relative" 
                                on:click={() => { if (!isRepositionMode) openModalForMonth(month); }}
                            >
                                {#if getMonthData(month, selectedYear)[(userIndices[`${selectedYear}-${month}`] || 0) % getMonthData(month, selectedYear).length].type === 'video'}
                                    <video
                                        src={getMonthThumbnail(month, selectedYear, userIndices)}
                                        class="w-full h-full object-cover transition-transform duration-300 relative z-10 {imageLoadStatus[`${selectedYear}-${month}`] ? 'opacity-100' : 'opacity-0'} {isRepositionMode ? 'pointer-events-none' : 'group-hover/img:scale-105 cursor-pointer'}"
                                        style="object-position: {getImageOffset(month, selectedYear).x}% {getImageOffset(month, selectedYear).y}%;"
                                        autoplay loop muted playsinline
                                        on:loadeddata={() => imageLoadStatus[`${selectedYear}-${month}`] = true}
                                    ></video>
                                {:else}
                                    <img
                                        src={getMonthThumbnail(
                                            month,
                                            selectedYear,
                                            userIndices,
                                        )}
                                        alt="{month}月"
                                        class="w-full h-full object-cover transition-transform duration-300 relative z-10 {imageLoadStatus[`${selectedYear}-${month}`] ? 'opacity-100' : 'opacity-0'} {isRepositionMode ? 'pointer-events-none' : 'group-hover/img:scale-105 cursor-pointer'}"
                                        style="object-position: {getImageOffset(month, selectedYear).x}% {getImageOffset(month, selectedYear).y}%;"
                                        loading="lazy"
                                        on:load={() => imageLoadStatus[`${selectedYear}-${month}`] = true}
                                    />
                                {/if}
                                {#if getMonthData(month, selectedYear)[(userIndices[`${selectedYear}-${month}`] || 0) % getMonthData(month, selectedYear).length].type === 'youtube'}
                                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                        <div class="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm group-hover/img:bg-red-600 transition-colors shadow-lg">
                                            <svg class="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                            
                            <!-- 左右輪播微型按鈕 (當圖片張數 > 1 時) -->
                            {#if getMonthCount(month, selectedYear) > 1}
                                <button
                                    class="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all opacity-0 group-hover/img:opacity-100 cursor-pointer z-10 border border-white/10"
                                    on:click|stopPropagation={() => cycleImagePrev(month)}
                                    aria-label="Previous image"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all opacity-0 group-hover/img:opacity-100 cursor-pointer z-10 border border-white/10"
                                    on:click|stopPropagation={() => cycleImage(month)}
                                    aria-label="Next image"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            {/if}
                        {:else}
                            <div
                                class="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 p-4"
                            >
                                <svg class="w-10 h-10 text-gray-300/80 mb-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                <span class="text-xs font-semibold text-gray-400 italic">No Art</span>
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>

{#if isModalOpen}
    <!-- Modal Overlay -->
    <div 
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm transition-all select-none"
        transition:fade={{ duration: 200 }}
        on:click={closeModal}
        on:touchstart={handleTouchStart}
        on:touchend={handleTouchEnd}
    >
        <!-- Close Button -->
        <button 
            class="absolute top-6 right-6 p-2 text-white/70 hover:text-white transition-colors z-[60]"
            on:click|stopPropagation={closeModal}
        >
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        <!-- Navigation Buttons -->
        {#if modalImages.length > 1}
            <button 
                class="absolute left-4 md:left-8 p-3 text-white/50 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full z-[60]"
                on:click|stopPropagation={prevImage}
            >
                <svg class="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            <button 
                class="absolute right-4 md:right-8 p-3 text-white/50 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full z-[60]"
                on:click|stopPropagation={nextImage}
            >
                <svg class="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </button>
        {/if}

        <!-- Content Area -->
        <div 
            class="relative max-w-[95vw] max-h-[90vh] flex flex-col items-center justify-center"
            on:click|stopPropagation
        >
            {#key selectedModalImageIndex}
                <div 
                    class="relative"
                    in:fly={{ y: 20, duration: 300, delay: 100 }}
                    out:fade={{ duration: 200 }}
                >
                    <div class="relative">
                        <!-- Navigation Click Areas -->
                        {#if modalImages.length > 1 && modalImages[selectedModalImageIndex].type !== 'youtube'}
                            <div class="absolute inset-y-0 left-0 w-1/2 z-20 cursor-pointer" on:click|stopPropagation={prevImage} aria-label="Previous image"></div>
                            <div class="absolute inset-y-0 right-0 w-1/2 z-20 cursor-pointer" on:click|stopPropagation={nextImage} aria-label="Next image"></div>
                        {/if}

                        {#if modalImages[selectedModalImageIndex].type === 'youtube'}
                            <div class="relative w-full h-[80vh] flex items-center justify-center bg-black/50 rounded-lg shadow-2xl z-10 cursor-pointer overflow-hidden" on:click|stopPropagation={() => window.open(`https://www.youtube.com/shorts/${modalImages[selectedModalImageIndex].youtubeId}`, '_blank')}>
                                <img 
                                    src={`https://img.youtube.com/vi/${modalImages[selectedModalImageIndex].youtubeId}/hqdefault.jpg`} 
                                    alt="Gallery Large View" 
                                    class="max-w-full max-h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                                />
                                <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                                    <button 
                                        class="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer pointer-events-auto"
                                        on:click|stopPropagation={() => window.open(`https://www.youtube.com/shorts/${modalImages[selectedModalImageIndex].youtubeId}`, '_blank')}
                                        aria-label="Play on YouTube"
                                    >
                                        <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        {:else if modalImages[selectedModalImageIndex].type === 'video'}
                            <!-- svelte-ignore a11y-media-has-caption -->
                            <video 
                                src={modalImages[selectedModalImageIndex].url} 
                                class="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl relative z-10"
                                autoplay loop muted playsinline
                            ></video>
                        {:else}
                            <img 
                                src={getHighResUrl(modalImages[selectedModalImageIndex].url)} 
                                alt="Gallery Large View" 
                                class="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl relative z-10"
                            />
                        {/if}
                    </div>
                    
                    <!-- Image Info Overlay -->
                    <div class="mt-4 text-center text-white relative z-30">
                        <div class="flex items-center justify-center gap-4 mb-2">
                            <span class="font-medium text-lg">
                                {modalImages[selectedModalImageIndex].date}
                            </span>
                            <a 
                                href={modalImages[selectedModalImageIndex].type === 'youtube' ? `https://www.youtube.com/shorts/${modalImages[selectedModalImageIndex].youtubeId}` : modalImages[selectedModalImageIndex].link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full transition-all hover:scale-105"
                            >
                                {#if modalImages[selectedModalImageIndex].type === 'youtube'}
                                    YouTube Shorts
                                {:else}
                                    Twitter (X)
                                {/if}
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                        <div class="flex flex-wrap justify-center gap-2">
                            {#each modalImages[selectedModalImageIndex].hashtags as tag}
                                <span class="px-2 py-0.5 bg-white/10 text-white/80 rounded text-xs">
                                    #{tag}
                                </span>
                            {/each}
                        </div>
                        {#if modalImages.length > 1}
                            <p class="text-white/40 text-xs mt-4">
                                {selectedModalImageIndex + 1} / {modalImages.length}
                            </p>
                        {/if}
                    </div>
                </div>
            {/key}
        </div>
    </div>
{/if}

{#if isCompareModalOpen}
    <div 
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto select-none"
        transition:fade={{ duration: 200 }}
    >
        <div 
            class="relative w-full max-w-6xl bg-white border border-gray-200 rounded-2xl shadow-2xl text-gray-900 flex flex-col max-h-[94vh] overflow-hidden"
            on:click|stopPropagation
        >
            <!-- Modal 標題列 -->
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-base sm:text-lg font-bold text-gray-900 tracking-tight">跨年份作品對比 (Art Comparison)</h2>
                        <p class="text-xs text-gray-500">左右挑選不同年份與月份的作品，一鍵生成高品質歷程對比圖</p>
                    </div>
                </div>
                <button 
                    class="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    on:click={closeCompareModal}
                    aria-label="Close"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- 雙欄選圖與預覽區 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 p-4 sm:p-6 overflow-y-auto flex-1 bg-gray-50/50">
                <!-- 左欄：基準年份 (A) -->
                <div class="flex flex-col gap-3.5 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div class="flex items-center justify-between border-b border-gray-100 pb-2.5">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                            <span class="text-sm font-bold text-gray-800">基準作品 (A)</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-gray-500 font-medium">年份：</span>
                            <select 
                                value={compareYearA} 
                                on:change={(e) => handleYearAChange(e.currentTarget.value)}
                                class="bg-gray-50 text-gray-800 border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                            >
                                {#each availableYears as year}
                                    <option value={year}>{year} 年</option>
                                {/each}
                            </select>
                        </div>
                    </div>

                    <!-- 月份水平標籤選擇列 (只顯示有作品的月份) -->
                    <div class="flex flex-col gap-1.5">
                        <div class="text-xs font-semibold text-gray-600 flex justify-between">
                            <span>選擇有作品的月份：</span>
                            <span class="text-gray-400">點擊切換月份作品</span>
                        </div>
                        <div class="flex flex-wrap gap-1.5">
                            {#if availableMonthsA.length === 0}
                                <span class="text-xs text-gray-400 py-1">該年份無收錄作品</span>
                            {:else}
                                {#each availableMonthsA as mObj}
                                    <button
                                        type="button"
                                        on:click={() => handleMonthAChange(mObj.month)}
                                        class="px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer {compareMonthA === mObj.month ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'}"
                                    >
                                        {mObj.month} 月 ({mObj.count})
                                    </button>
                                {/each}
                            {/if}
                        </div>
                    </div>

                    <!-- 該月份作品縮圖列表 -->
                    {#if compareMonthA}
                        <div class="flex flex-col gap-1.5">
                            <div class="text-xs font-semibold text-gray-600 flex justify-between">
                                <span>{compareYearA} 年 {compareMonthA} 月作品：</span>
                                <span class="text-gray-400">共 {imagesForSelectionA.length} 張</span>
                            </div>
                            <div class="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                                {#each imagesForSelectionA as img}
                                    <button
                                        type="button"
                                        on:click={() => compareImageA = img}
                                        class="aspect-square rounded-md overflow-hidden border-2 transition-all relative cursor-pointer {compareImageA === img ? 'border-blue-600 ring-2 ring-blue-100 scale-95' : 'border-transparent opacity-75 hover:opacity-100 hover:border-gray-300'}"
                                    >
                                        <img 
                                            src={img.type === 'youtube' ? `https://img.youtube.com/vi/${img.youtubeId}/hqdefault.jpg` : img.url} 
                                            alt={img.date} 
                                            class="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        {#if compareImageA === img}
                                            <div class="absolute inset-0 bg-blue-600/25 flex items-center justify-center">
                                                <svg class="w-4 h-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                                </svg>
                                            </div>
                                        {/if}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <!-- 左側即時大圖預覽 -->
                    {#if compareImageA}
                        <div class="bg-gray-50 rounded-xl border border-gray-200 p-3 flex flex-col gap-2">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{compareYearA} 年 {compareMonthA} 月</span>
                                <span class="text-gray-600 font-mono font-medium">{compareImageA.date}</span>
                            </div>
                            <div class="aspect-[4/3] bg-white rounded-lg overflow-hidden flex items-center justify-center border border-gray-200 relative shadow-inner">
                                {#if compareImageA.type === 'video'}
                                    <video src={compareImageA.url} class="max-w-full max-h-full object-contain" autoplay loop muted playsinline></video>
                                {:else}
                                    <img 
                                        src={compareImageA.type === 'youtube' ? `https://img.youtube.com/vi/${compareImageA.youtubeId}/hqdefault.jpg` : getHighResUrl(compareImageA.url)} 
                                        alt={compareImageA.date} 
                                        class="max-w-full max-h-full object-contain"
                                    />
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- 右欄：對比年份 (B) -->
                <div class="flex flex-col gap-3.5 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div class="flex items-center justify-between border-b border-gray-100 pb-2.5">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                            <span class="text-sm font-bold text-gray-800">對比作品 (B)</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-gray-500 font-medium">年份：</span>
                            <select 
                                value={compareYearB} 
                                on:change={(e) => handleYearBChange(e.currentTarget.value)}
                                class="bg-gray-50 text-gray-800 border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                            >
                                {#each availableYears as year}
                                    <option value={year}>{year} 年</option>
                                {/each}
                            </select>
                        </div>
                    </div>

                    <!-- 月份水平標籤選擇列 (只顯示有作品的月份) -->
                    <div class="flex flex-col gap-1.5">
                        <div class="text-xs font-semibold text-gray-600 flex justify-between">
                            <span>選擇有作品的月份：</span>
                            <span class="text-gray-400">點擊切換月份作品</span>
                        </div>
                        <div class="flex flex-wrap gap-1.5">
                            {#if availableMonthsB.length === 0}
                                <span class="text-xs text-gray-400 py-1">該年份無收錄作品</span>
                            {:else}
                                {#each availableMonthsB as mObj}
                                    <button
                                        type="button"
                                        on:click={() => handleMonthBChange(mObj.month)}
                                        class="px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer {compareMonthB === mObj.month ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'}"
                                    >
                                        {mObj.month} 月 ({mObj.count})
                                    </button>
                                {/each}
                            {/if}
                        </div>
                    </div>

                    <!-- 該月份作品縮圖列表 -->
                    {#if compareMonthB}
                        <div class="flex flex-col gap-1.5">
                            <div class="text-xs font-semibold text-gray-600 flex justify-between">
                                <span>{compareYearB} 年 {compareMonthB} 月作品：</span>
                                <span class="text-gray-400">共 {imagesForSelectionB.length} 張</span>
                            </div>
                            <div class="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                                {#each imagesForSelectionB as img}
                                    <button
                                        type="button"
                                        on:click={() => compareImageB = img}
                                        class="aspect-square rounded-md overflow-hidden border-2 transition-all relative cursor-pointer {compareImageB === img ? 'border-indigo-600 ring-2 ring-indigo-100 scale-95' : 'border-transparent opacity-75 hover:opacity-100 hover:border-gray-300'}"
                                    >
                                        <img 
                                            src={img.type === 'youtube' ? `https://img.youtube.com/vi/${img.youtubeId}/hqdefault.jpg` : img.url} 
                                            alt={img.date} 
                                            class="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        {#if compareImageB === img}
                                            <div class="absolute inset-0 bg-indigo-600/25 flex items-center justify-center">
                                                <svg class="w-4 h-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                                </svg>
                                            </div>
                                        {/if}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <!-- 右側即時大圖預覽 -->
                    {#if compareImageB}
                        <div class="bg-gray-50 rounded-xl border border-gray-200 p-3 flex flex-col gap-2">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{compareYearB} 年 {compareMonthB} 月</span>
                                <span class="text-gray-600 font-mono font-medium">{compareImageB.date}</span>
                            </div>
                            <div class="aspect-[4/3] bg-white rounded-lg overflow-hidden flex items-center justify-center border border-gray-200 relative shadow-inner">
                                {#if compareImageB.type === 'video'}
                                    <video src={compareImageB.url} class="max-w-full max-h-full object-contain" autoplay loop muted playsinline></video>
                                {:else}
                                    <img 
                                        src={compareImageB.type === 'youtube' ? `https://img.youtube.com/vi/${compareImageB.youtubeId}/hqdefault.jpg` : getHighResUrl(compareImageB.url)} 
                                        alt={compareImageB.date} 
                                        class="max-w-full max-h-full object-contain"
                                    />
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Modal 底部控制按鈕 -->
            <div class="px-6 py-4 border-t border-gray-100 bg-white flex flex-wrap items-center justify-between gap-4">
                <div class="text-xs text-gray-500 flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>將以超高畫質合成緊湊對比圖，自動對齊完整畫作與年月標記</span>
                </div>
                <div class="flex items-center gap-3">
                    <button
                        type="button"
                        on:click={closeCompareModal}
                        class="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                        關閉
                    </button>
                    <button
                        type="button"
                        on:click={exportCompareImage}
                        disabled={!compareImageA || !compareImageB || isExportingCompare}
                        class="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                        {#if isExportingCompare}
                            <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>合成導出中...</span>
                        {:else}
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            <span>下載對比圖 (JPG)</span>
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}
