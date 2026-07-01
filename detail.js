(function () {
  const qs = new URLSearchParams(window.location.search);
  const id = qs.get("id");

  const titleEl = document.getElementById("detailTitle");
  const authorEl = document.getElementById("detailAuthor");
  const metaEl = document.getElementById("detailMeta");
  const tagsEl = document.getElementById("detailTags");
  const promptEl = document.getElementById("detailPrompt");
  const copyBtn = document.getElementById("copyPromptBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const viewOriginalBtn = document.getElementById("viewOriginalBtn");
  const imgEl = document.getElementById("detailImage");
  const toast = document.getElementById("toast");
  const backToGallery = document.getElementById("backToGallery");

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove("hidden");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.add("hidden"), 1600);
  }

  function playButtonFeedback(el) {
    if (!el) return;
    el.classList.remove("button-pop");
    void el.offsetWidth;
    el.classList.add("button-pop");
  }

  async function copyText(text) {
    const value = (text || "").toString();
    if (!value.trim()) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (err) {}

    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }

  function setVisible(el, visible) {
    if (!el) return;
    el.style.display = visible ? "" : "none";
  }

  function setCopyEnabled(enabled) {
    if (!copyBtn) return;
    copyBtn.disabled = !enabled;
    copyBtn.classList.toggle("opacity-50", !enabled);
    copyBtn.classList.toggle("cursor-not-allowed", !enabled);
  }

  function getCopyValue(item) {
    const promptText = (item.prompt || "").toString().trim();
    if (promptText && !promptText.includes("TODO")) return promptText;
    return (item.originalUrl || "").toString().trim();
  }

  function safeFileName(value, fallback) {
    const name = (value || fallback || "prompt-image")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return name || fallback || "prompt-image";
  }

  function getImageExtension(src) {
    const clean = (src || "").split("?")[0].split("#")[0];
    const match = clean.match(/\.([a-z0-9]{2,5})$/i);
    return match ? match[1].toLowerCase() : "png";
  }

  function getImageMimeType(src) {
    const ext = getImageExtension(src);
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "webp") return "image/webp";
    return "image/png";
  }

  function getDownloadRecord(src) {
    const downloads = window.PROMPT_IMAGE_DOWNLOADS || {};
    const key = (src || "").replace(/^\.\//, "");
    return downloads[key] || downloads[decodeURIComponent(key)] || null;
  }

  function base64ToBlob(base64, mimeType) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadImageFile(src, filename) {
    const record = getDownloadRecord(src);
    if (!record || !record.base64) {
      throw new Error("Download data missing.");
    }

    const mimeType = record.mime || getImageMimeType(src);
    const blob = base64ToBlob(record.base64, mimeType);
    triggerBlobDownload(blob, filename);
  }

  function updateButtons(item, displayText, originalUrl) {
    const isPremium = (item.access || "").toLowerCase() === "premium";
    const hasCopyText = !!(displayText && displayText.trim().length);
    const hasOriginal = !!(originalUrl && originalUrl.trim().length);
    const src = item.image || (imgEl ? imgEl.src : "");

    setCopyEnabled(!isPremium && hasCopyText);

    if (copyBtn) {
      copyBtn.textContent = isPremium ? "Private" : "Copy";
      copyBtn.title = isPremium ? "Premium prompt is private" : "Copy prompt";
    }

    if (downloadBtn) {
      const ext = getImageExtension(src);
      downloadBtn.href = "#";
      downloadBtn.setAttribute("download", `${safeFileName(item.title, "prompt-image")}.${ext}`);
      downloadBtn.style.opacity = src ? "1" : "0.5";
      downloadBtn.style.pointerEvents = src ? "auto" : "none";
    }

    setVisible(viewOriginalBtn, true);
    if (viewOriginalBtn) {
      viewOriginalBtn.style.backgroundColor = "#16a34a";
      viewOriginalBtn.style.color = "white";
      viewOriginalBtn.style.border = "none";
      viewOriginalBtn.style.fontWeight = "600";

      if (hasOriginal) {
        viewOriginalBtn.href = originalUrl;
        viewOriginalBtn.target = "_blank";
        viewOriginalBtn.rel = "noopener";
        viewOriginalBtn.style.opacity = "1";
        viewOriginalBtn.style.pointerEvents = "auto";
      } else {
        viewOriginalBtn.href = "#";
        viewOriginalBtn.style.opacity = "0.5";
        viewOriginalBtn.style.pointerEvents = "none";
      }
    }
  }

  const list = (window.PROMPTS && Array.isArray(window.PROMPTS)) ? window.PROMPTS : [];
  const item = list.find(p => String(p.id) === String(id));

  if (!item) {
    if (titleEl) titleEl.textContent = "Prompt not found";
    setCopyEnabled(false);
    setVisible(downloadBtn, false);
    setVisible(viewOriginalBtn, false);
    return;
  }

  const title = item.title || "Untitled";
  const author = item.creator || item.author || "@unknown";
  const type = item.type || "Image";
  const access = item.access || "Free";
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const originalUrl = (item.originalUrl || "").toString();
  const isPremium = access.toLowerCase() === "premium";
  const copyValue = getCopyValue(item);
  const displayText = isPremium
    ? "Premium prompt is private. Use View Original if you have access."
    : copyValue;

  if (titleEl) titleEl.textContent = title;
  if (authorEl) authorEl.textContent = author;
  if (metaEl) metaEl.textContent = `${type} - ${access}`;
  if (tagsEl) tagsEl.innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join("");
  if (imgEl) { imgEl.src = item.image || ""; imgEl.alt = title; }
  if (promptEl) promptEl.value = displayText;

  updateButtons(item, displayText, originalUrl);

  if (backToGallery) {
    backToGallery.addEventListener("click", event => {
      const referrer = document.referrer || "";
      const cameFromGallery = /index\.html(?:#|\?|$)/i.test(referrer);
      if (cameFromGallery && window.history.length > 1) {
        event.preventDefault();
        window.history.back();
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      playButtonFeedback(copyBtn);
      if (isPremium) {
        showToast("Premium prompt is private.");
        return;
      }
      const current = promptEl?.value || copyValue;
      if (!current.trim()) {
        showToast("No prompt to copy.");
        return;
      }
      const ok = await copyText(current);
      showToast(ok ? "Copied!" : "Copy failed.");
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", async event => {
      event.preventDefault();
      event.stopPropagation();
      playButtonFeedback(downloadBtn);
      const src = item.image || (imgEl ? imgEl.src : "");
      if (!src) {
        showToast("No image to download.");
        return;
      }
      try {
        const filename = `${safeFileName(title, "prompt-image")}.${getImageExtension(src)}`;
        downloadImageFile(src, filename);
        showToast("Download started.");
      } catch (err) {
        showToast("Download failed.");
      }
    });
  }

  if (viewOriginalBtn) {
    viewOriginalBtn.addEventListener("click", () => {
      playButtonFeedback(viewOriginalBtn);
    });
  }
})();
