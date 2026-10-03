const $ = (id) => document.getElementById(id);

async function api(path, opts = {}) {
  const res = await fetch(path, { credentials: "include", ...opts });
  if (res.status === 401) {
    window.location.href = "/admin/login.html";
    throw new Error("unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
  return data;
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const c of children) node.append(c);
  return node;
}

function tile({ imgSrc, label, active, actions = [] }) {
  const thumb = el("div", { className: "thumb" });
  if (imgSrc) thumb.append(el("img", { src: imgSrc, alt: label || "frame", loading: "lazy" }));
  const meta = el("div", { className: "meta" }, [document.createTextNode(label || "")]);
  const actionsEl = el("div", { className: "tile-actions" });
  if (active) actionsEl.append(el("span", { className: "badge" }, [document.createTextNode("Active")]));
  for (const a of actions) actionsEl.append(a);
  return el("div", { className: "tile" }, [thumb, meta, actionsEl]);
}

async function loadStats() {
  try {
    const { total } = await api("/api/admin/stats");
    $("statTotal").textContent = total;
  } catch (e) {
    if (e.message !== "unauthorized") console.error(e);
  }
}

async function loadFrames() {
  const grid = $("framesGrid");
  grid.textContent = "";
  const msg = $("frameMsg");
  try {
    const { frames } = await api("/api/admin/frames");
    if (!frames.length) {
      grid.append(el("p", { className: "loading" }, [document.createTextNode("No frames uploaded yet.")]));
      return;
    }
    for (const f of frames) {
      const name = f.key.split("/").pop();
      let action = null;
      if (!f.active) {
        action = el("button", { className: "btn green sm", type: "button" }, [document.createTextNode("Set active")]);
        action.addEventListener("click", () => activateFrame(f.key, action));
      }
      grid.append(tile({ imgSrc: f.url, label: name, active: f.active, actions: action ? [action] : [] }));
    }
    msg.textContent = "";
  } catch (e) {
    msg.textContent = e.message;
    msg.className = "loading msg err";
  }
}

async function activateFrame(key, btn) {
  if (btn) { btn.disabled = true; btn.textContent = "Setting…"; }
  try {
    await api("/api/admin/frame/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    await loadFrames();
  } catch (e) {
    alert("Could not activate: " + e.message);
    if (btn) { btn.disabled = false; btn.textContent = "Set active"; }
  }
}

async function uploadFrame(file) {
  const msg = $("frameMsg");
  msg.className = "loading";
  msg.textContent = "Uploading frame…";
  try {
    const { url, key } = await api("/api/admin/frame/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: "image/png" }),
    });
    const put = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: file,
    });
    if (!put.ok) throw new Error("upload failed (" + put.status + ")");
    msg.textContent = "Activating…";
    await api("/api/admin/frame/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    msg.textContent = "Frame updated and activated.";
    await loadFrames();
  } catch (e) {
    msg.className = "loading msg err";
    msg.textContent = e.message;
  }
}

let imagesToken = null;

async function loadImages(append = false) {
  const grid = $("imagesGrid");
  const msg = $("imgMsg");
  const more = $("loadMore");
  if (!append) {
    grid.textContent = "";
    imagesToken = null;
  }
  msg.textContent = "Loading…";
  try {
    const qs = imagesToken ? "?token=" + encodeURIComponent(imagesToken) : "";
    const { images, nextToken } = await api("/api/admin/images" + qs);
    for (const im of images) {
      const name = im.key.split("/").pop();
      const link = el("a", { className: "btn sm", href: im.url, target: "_blank", rel: "noopener" }, [
        document.createTextNode("Open"),
      ]);
      const del = el("button", { className: "btn danger sm", type: "button" }, [document.createTextNode("Delete")]);
      del.addEventListener("click", () => deleteImage(im.key, del));
      grid.append(tile({ imgSrc: im.url, label: name, actions: [link, del] }));
    }
    imagesToken = nextToken;
    more.hidden = !nextToken;
    msg.textContent = images.length ? "" : "No uploads yet.";
  } catch (e) {
    msg.className = "loading msg err";
    msg.textContent = e.message;
  }
}

async function deleteImage(key, btn) {
  if (!window.confirm("Delete this image? This cannot be undone.")) return;
  btn.disabled = true;
  btn.textContent = "Deleting…";
  try {
    await api("/api/admin/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const tileEl = btn.closest(".tile");
    if (tileEl) tileEl.remove();
    const grid = $("imagesGrid");
    if (grid && !grid.querySelector(".tile")) {
      grid.append(el("p", { className: "loading" }, [document.createTextNode("No uploads yet.")]));
    }
  } catch (e) {
    alert("Could not delete: " + e.message);
    btn.disabled = false;
    btn.textContent = "Delete";
  }
}

$("logout").addEventListener("click", async () => {
  try {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
  } catch {}
  window.location.href = "/admin/login.html";
});

$("frameFile").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (file) uploadFrame(file);
});

$("loadMore").addEventListener("click", () => loadImages(true));

loadStats();
loadFrames();
loadImages(false);
