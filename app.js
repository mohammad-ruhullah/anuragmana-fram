const FALLBACK_FRAME = "assets/frame-2.png";
let frameSrc = FALLBACK_FRAME;

const canvas = document.getElementById("preview");
const ctx = canvas.getContext("2d");
const stage = document.getElementById("stage");
const dropHint = document.getElementById("dropHint");
const fileInput = document.getElementById("fileInput");
const chooseBtn = document.getElementById("chooseBtn");
const downloadBtn = document.getElementById("downloadBtn");
const controls = document.getElementById("controls");

const zoomInput = document.getElementById("zoom");
const zoomOut = document.getElementById("zoomOut");
const zoomIn = document.getElementById("zoomIn");
const zoomVal = document.getElementById("zoomVal");
const rotateInput = document.getElementById("rotate");
const rotL = document.getElementById("rotL");
const rotR = document.getElementById("rotR");
const rotVal = document.getElementById("rotVal");
const flipHBtn = document.getElementById("flipH");
const flipVBtn = document.getElementById("flipV");
const resetBtn = document.getElementById("resetBtn");
const removeBgBtn = document.getElementById("removeBgBtn");
const undoBgBtn = document.getElementById("undoBgBtn");
const bgRow = document.getElementById("bgRow");
const bgColorInput = document.getElementById("bgColor");
const bgTransparent = document.getElementById("bgTransparent");
const bgStatus = document.getElementById("bgStatus");
const swatchBtns = Array.from(document.querySelectorAll(".swatch"));

const state = {
  image: null,
  originalImage: null,
  originalBlob: null,
  fileName: "photo",
  zoom: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  flipH: false,
  flipV: false,
  bgRemoved: false,
  bgColor: null,
};

let bgBusy = false;

const frame = new Image();
frame.crossOrigin = "anonymous";
let frameReady = false;

frame.onload = () => {
  frameReady = true;
  canvas.width = frame.naturalWidth;
  canvas.height = frame.naturalHeight;
  render();
};
frame.onerror = () => {
  if (frameSrc !== FALLBACK_FRAME) {
    frameSrc = FALLBACK_FRAME;
    frame.src = frameSrc;
  } else {
    showError("Failed to load the frame image.");
  }
};

async function initFrame() {
  try {
    const res = await fetch("/api/frame", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && data.url) frameSrc = data.url;
    }
  } catch (e) {
    /* backend not configured or offline -> keep the bundled fallback */
  }
  frame.src = frameSrc;
}

function showError(msg) {
  let el = document.querySelector(".error");
  if (!el) {
    el = document.createElement("p");
    el.className = "error";
    controls.parentNode.appendChild(el);
  }
  el.textContent = msg;
}

function clearError() {
  const el = document.querySelector(".error");
  if (el) el.remove();
}

function imgW() {
  return state.image ? state.image.width || state.image.naturalWidth : 0;
}
function imgH() {
  return state.image ? state.image.height || state.image.naturalHeight : 0;
}

function render() {
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  if (state.bgColor) {
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, W, H);
  }

  if (state.image) {
    const iw = imgW();
    const ih = imgH();
    const cover = Math.max(W / iw, H / ih);
    const s = cover * state.zoom;

    ctx.save();
    ctx.translate(W / 2 + state.offsetX, H / 2 + state.offsetY);
    ctx.rotate((state.rotation * Math.PI) / 180);
    ctx.scale(s * (state.flipH ? -1 : 1), s * (state.flipV ? -1 : 1));
    ctx.drawImage(state.image, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();
  }

  if (frameReady) ctx.drawImage(frame, 0, 0);
}

function resetTransform() {
  state.zoom = 1;
  state.rotation = 0;
  state.offsetX = 0;
  state.offsetY = 0;
  state.flipH = false;
  state.flipV = false;
  syncControls();
}

function syncControls() {
  zoomInput.value = String(state.zoom);
  zoomVal.textContent = state.zoom.toFixed(2) + "\u00d7";
  rotateInput.value = String(Math.round(state.rotation));
  rotVal.textContent = Math.round(state.rotation) + "\u00b0";
}

function updateTransforms() {
  render();
  syncControls();
}

async function loadImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    showError("Please choose an image file (JPG, PNG, WEBP).");
    return;
  }
  clearError();

  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (e) {
    source = await loadViaElement(file).catch(() => null);
  }

  if (!source) {
    showError("Sorry, that image could not be read. Try a JPG or PNG.");
    return;
  }

  state.image = source;
  state.originalImage = source;
  state.originalBlob = file;
  state.file = file;
  state.fileName = (file.name || "photo").replace(/\.[^.]+$/, "");
  state.bgRemoved = false;
  state.bgColor = null;
  resetTransform();
  updateBgUI();
  setBgStatus("");

  stage.classList.add("has-image", "hide-hint");
  controls.hidden = false;
  downloadBtn.disabled = false;
  render();

  uploadOriginal(file);
}

async function uploadOriginal(file) {
  try {
    const pres = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name || "photo",
        contentType: file.type || "image/jpeg",
      }),
    });
    if (!pres.ok) return;
    const { url, key } = await pres.json();
    if (!url || !key) return;

    const put = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": file.type || "image/jpeg" },
      body: file,
    });
    if (!put.ok) return;

    await fetch("/api/upload/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
  } catch (e) {
    /* silent: never block the user */
  }
}

function loadViaElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode failed"));
    };
    img.src = url;
  });
}

function download() {
  if (!state.image) return;
  try {
    canvas.toBlob((b) => {
      if (!b) {
        showError("Could not create the image. Please try again.");
        return;
      }
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = "framed-" + state.fileName + ".png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  } catch (e) {
    showError("Download failed. Please refresh and try again.");
  }
}

function clampZoom(z) {
  return Math.min(3, Math.max(0.2, z));
}

const BG_REMOVAL_CDNS = [
  "https://esm.sh/@imgly/background-removal@1.7.0",
  "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm",
];

let bgModulePromise = null;
function loadBgRemoval() {
  if (!bgModulePromise) {
    bgModulePromise = (async () => {
      let lastErr;
      for (const url of BG_REMOVAL_CDNS) {
        try {
          return await import(url);
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error("could not load background removal");
    })();
  }
  return bgModulePromise;
}

function setBgStatus(text) {
  if (bgStatus) bgStatus.textContent = text || "";
}

function updateBgUI() {
  undoBgBtn.hidden = !state.bgRemoved;
  bgRow.hidden = !state.bgRemoved;
  if (state.bgColor) bgColorInput.value = state.bgColor;
}

async function removeBackground() {
  if (!state.image || state.bgRemoved || bgBusy) return;
  bgBusy = true;
  removeBgBtn.disabled = true;
  const label = removeBgBtn.textContent;
  setBgStatus("Loading model (first time may take a while)…");
  try {
    const mod = await loadBgRemoval();
    setBgStatus("Removing background…");
    const source = state.originalBlob || state.file;
    const outBlob = await mod.removeBackground(source, {
      progress: (_key, current, total) => {
        if (total) setBgStatus("Removing… " + Math.round((current / total) * 100) + "%");
      },
    });
    const bitmap = await createImageBitmap(outBlob);
    state.image = bitmap;
    state.bgRemoved = true;
    if (!state.bgColor) state.bgColor = "#ffffff";
    updateBgUI();
    render();
    setBgStatus("Background removed.");
  } catch (e) {
    console.error(e);
    setBgStatus("");
    showError("Background removal failed. Please try again.");
  } finally {
    bgBusy = false;
    removeBgBtn.disabled = false;
    removeBgBtn.textContent = label;
  }
}

function undoBackground() {
  if (!state.originalImage) return;
  state.image = state.originalImage;
  state.bgRemoved = false;
  state.bgColor = null;
  setBgStatus("");
  updateBgUI();
  render();
}

function setBackgroundColor(color) {
  state.bgColor = color;
  if (color) bgColorInput.value = color;
  render();
}

chooseBtn.addEventListener("click", () => fileInput.click());
stage.addEventListener("click", () => {
  if (!state.image) fileInput.click();
});
fileInput.addEventListener("change", (e) => {
  if (e.target.files && e.target.files[0]) loadImage(e.target.files[0]);
  fileInput.value = "";
});

downloadBtn.addEventListener("click", download);

zoomInput.addEventListener("input", () => {
  state.zoom = clampZoom(parseFloat(zoomInput.value) || 1);
  updateTransforms();
});
zoomOut.addEventListener("click", () => {
  state.zoom = clampZoom(state.zoom - 0.1);
  updateTransforms();
});
zoomIn.addEventListener("click", () => {
  state.zoom = clampZoom(state.zoom + 0.1);
  updateTransforms();
});

rotateInput.addEventListener("input", () => {
  state.rotation = parseFloat(rotateInput.value) || 0;
  updateTransforms();
});
rotL.addEventListener("click", () => {
  state.rotation = (state.rotation - 90 + 360) % 360;
  updateTransforms();
});
rotR.addEventListener("click", () => {
  state.rotation = (state.rotation + 90) % 360;
  updateTransforms();
});

flipHBtn.addEventListener("click", () => {
  state.flipH = !state.flipH;
  render();
});
flipVBtn.addEventListener("click", () => {
  state.flipV = !state.flipV;
  render();
});
resetBtn.addEventListener("click", () => {
  resetTransform();
  render();
});

removeBgBtn.addEventListener("click", removeBackground);
undoBgBtn.addEventListener("click", undoBackground);
bgColorInput.addEventListener("input", () => setBackgroundColor(bgColorInput.value));
bgTransparent.addEventListener("click", () => setBackgroundColor(null));
swatchBtns.forEach((b) =>
  b.addEventListener("click", () => setBackgroundColor(b.dataset.color))
);

let dragging = false;
let lastX = 0;
let lastY = 0;
let pointerId = null;

stage.addEventListener("pointerdown", (e) => {
  if (!state.image) return;
  dragging = true;
  pointerId = e.pointerId;
  lastX = e.clientX;
  lastY = e.clientY;
  stage.classList.add("dragging");
  stage.setPointerCapture(e.pointerId);
});

stage.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  state.offsetX += (e.clientX - lastX) * scaleX;
  state.offsetY += (e.clientY - lastY) * scaleY;
  lastX = e.clientX;
  lastY = e.clientY;
  render();
});

function endDrag() {
  if (!dragging) return;
  dragging = false;
  stage.classList.remove("dragging");
  if (pointerId !== null) {
    try { stage.releasePointerCapture(pointerId); } catch (e) {}
    pointerId = null;
  }
}
stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);

["dragenter", "dragover"].forEach((evt) =>
  stage.addEventListener(evt, (e) => {
    e.preventDefault();
    stage.classList.add("drag-over");
  })
);
["dragleave", "drop"].forEach((evt) =>
  stage.addEventListener(evt, (e) => {
    e.preventDefault();
    if (evt === "dragleave" && e.relatedTarget && stage.contains(e.relatedTarget)) return;
    stage.classList.remove("drag-over");
  })
);
stage.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) loadImage(file);
});

render();
initFrame();
