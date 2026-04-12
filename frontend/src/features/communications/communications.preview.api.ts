import { api, BASE_URL } from "@/api/client";

function renderLoadingPage(tab: Window, opts?: { title?: string; heading?: string; sub?: string }) {
  const title = opts?.title ?? "Opening document…";
  const heading = opts?.heading ?? "Please wait… Opening your document";
  const sub = opts?.sub ?? "This tab will automatically show the PDF once it’s ready.";

  try {
    const doc = tab.document;
    doc.open();
    doc.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <style>
    :root{
      --bg1:#0b1220;
      --bg2:#111827;
      --card:#0f172a;
      --text:#e5e7eb;
      --muted:#94a3b8;
      --accent:#22c55e;
      --accent2:#38bdf8;
      --ring: rgba(56,189,248,.25);
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      min-height:100vh;
      display:grid;
      place-items:center;
      color:var(--text);
      font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;
      background:
        radial-gradient(900px 500px at 50% 25%, rgba(56,189,248,.18), transparent 55%),
        radial-gradient(700px 450px at 35% 85%, rgba(34,197,94,.14), transparent 55%),
        linear-gradient(180deg, var(--bg1), var(--bg2));
    }
    .card{
      width:min(560px, 92vw);
      padding:28px 28px 24px;
      border-radius:18px;
      background:rgba(15,23,42,.72);
      border:1px solid rgba(148,163,184,.18);
      box-shadow:0 18px 60px rgba(0,0,0,.45);
      backdrop-filter: blur(10px);
    }
    .row{display:flex; gap:14px; align-items:center}
    .spinner{
      width:42px; height:42px; border-radius:999px;
      border:4px solid rgba(148,163,184,.25);
      border-top-color: var(--accent2);
      border-right-color: var(--accent);
      animation:spin .9s linear infinite;
      box-shadow:0 0 0 6px var(--ring);
      flex:0 0 auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1{margin:0; font-size:18px; letter-spacing:.2px}
    p{margin:6px 0 0; color:var(--muted); font-size:13px; line-height:1.5}
    .bar{
      margin-top:16px;
      height:10px;
      border-radius:999px;
      background:rgba(148,163,184,.16);
      overflow:hidden;
    }
    .bar > span{
      display:block; height:100%;
      width:45%;
      background:linear-gradient(90deg, var(--accent2), var(--accent));
      border-radius:999px;
      animation:move 1.2s ease-in-out infinite;
    }
    @keyframes move{
      0%{transform:translateX(-40%)}
      50%{transform:translateX(80%)}
      100%{transform:translateX(-40%)}
    }
    .hint{
      margin-top:12px;
      font-size:12px;
      color:rgba(148,163,184,.9);
    }
  </style>
</head>
<body>
  <div class="card" role="status" aria-live="polite">
    <div class="row">
      <div class="spinner" aria-hidden="true"></div>
      <div>
        <h1>${heading}</h1>
        <p>${sub}</p>
      </div>
    </div>
    <div class="bar" aria-hidden="true"><span></span></div>
    <div class="hint">If nothing happens, check popups and your connection.</div>
  </div>
</body>
</html>`);
    doc.close();
  } catch {
    // ignore
  }
}

/**
 * Open a document PDF in a new tab (inline), using your existing token flow:
 * 1) GET /api/documents/{fileId}/download-token
 * 2) navigate to /api/documents/{fileId}/download?_token=...&disposition=inline
 */
export async function openDocumentInline(fileId: string | number): Promise<void> {
  const safeId = encodeURIComponent(String(fileId));

  // 1) Open blank tab immediately (must be sync)
  const tab = window.open("", "_blank");
  if (!tab) throw new Error("Popup blocked");

  // Show loading UI immediately
  renderLoadingPage(tab, {
    title: "Opening document…",
    heading: "Please wait… Opening your document",
    sub: "Fetching a secure link, then loading the PDF…",
  });

  try {
    // 2) Fetch short-lived token using current auth
    const { data } = await api.get(`/api/documents/${safeId}/download-token`, { timeout: 30_000 });
    const token = data?.token;
    if (!token) throw new Error("Missing download token");

    // 3) Redirect already-opened tab to the download URL (inline)
    const downloadPath = `${BASE_URL}/api/documents/${safeId}/download?_token=${encodeURIComponent(
      String(token)
    )}&disposition=inline`;

    const rawBase = (api as any)?.defaults?.baseURL as string | undefined;
    const base = rawBase && /^https?:\/\//i.test(rawBase) ? rawBase : window.location.origin;

    tab.location.replace(new URL(downloadPath, base).toString());
  } catch (e) {
    try {
      if (tab && !tab.closed) tab.close();
    } catch {
      // ignore
    }
    throw e;
  }
}
