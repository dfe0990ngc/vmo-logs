import { get, del, upload } from "@/api/requests";
import {
  CommunicationFilters,
  UpdateCommunicationDTO,
  Communication,
  CommunicationFilterOptions,
} from "./communications.types";
import { PaginatedResponse } from "@/types/types";
import { toast } from "sonner";
import { BASE_URL } from "@/api/client";

export const fetchCommunications = (filters: CommunicationFilters) => {
  const params = new URLSearchParams(
    Object.entries(filters).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== "") {
        acc[key] = String(val);
      }
      return acc;
    }, {} as Record<string, string>)
  );

  return get<PaginatedResponse<Communication>>(`/api/communications?${params}`);
};

export const fetchCommunication = (id: number) =>
  get<{ communication: Communication }>(`/api/communications/${id}`);

export const fetchCommunicationFilterOptions = () =>
  get<CommunicationFilterOptions>(`/api/communications/filter-options`);

export const createCommunication = (formData: FormData) =>
  upload<{ communication: Communication }>("/api/communications", formData);

export const updateCommunication = ({ id, payload }: UpdateCommunicationDTO) =>
  upload<{ communication: Communication }>(`/api/communications/${id}`, payload);

export const deleteCommunication = (id: number) =>
  del(`/api/communications/${id}`);

// ─── Public download (opens a new tab) ───────────────────────────────────────

function renderLoadingPage(
  tab: Window,
  opts?: { title?: string; heading?: string; sub?: string }
) {
  const title   = opts?.title   ?? "Preparing document…";
  const heading = opts?.heading ?? "Please wait… Preparing your document";
  const sub     = opts?.sub     ?? "Loading the PDF in this tab…";

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
    :root{--bg1:#0b1220;--bg2:#111827;--card:#0f172a;--text:#e5e7eb;--muted:#94a3b8;--accent:#22c55e;--accent2:#38bdf8;--ring:rgba(56,189,248,.25)}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:radial-gradient(900px 500px at 50% 25%,rgba(56,189,248,.18),transparent 55%),radial-gradient(700px 450px at 35% 85%,rgba(34,197,94,.14),transparent 55%),linear-gradient(180deg,var(--bg1),var(--bg2))}
    .card{width:min(560px,92vw);padding:28px 28px 24px;border-radius:18px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.18);box-shadow:0 18px 60px rgba(0,0,0,.45);backdrop-filter:blur(10px)}
    .row{display:flex;gap:14px;align-items:center}
    .spinner{width:42px;height:42px;border-radius:999px;border:4px solid rgba(148,163,184,.25);border-top-color:var(--accent2);border-right-color:var(--accent);animation:spin .9s linear infinite;box-shadow:0 0 0 6px var(--ring);flex:0 0 auto}
    @keyframes spin{to{transform:rotate(360deg)}}
    h1{margin:0;font-size:18px;letter-spacing:.2px}
    p{margin:6px 0 0;color:var(--muted);font-size:13px;line-height:1.5}
    .bar{margin-top:16px;height:10px;border-radius:999px;background:rgba(148,163,184,.16);overflow:hidden}
    .bar>span{display:block;height:100%;width:45%;background:linear-gradient(90deg,var(--accent2),var(--accent));border-radius:999px;animation:move 1.2s ease-in-out infinite}
    @keyframes move{0%{transform:translateX(-40%)}50%{transform:translateX(80%)}100%{transform:translateX(-40%)}}
    .hint{margin-top:12px;font-size:12px;color:rgba(148,163,184,.9)}
  </style>
</head>
<body>
  <div class="card" role="status" aria-live="polite">
    <div class="row">
      <div class="spinner" aria-hidden="true"></div>
      <div><h1>${heading}</h1><p>${sub}</p></div>
    </div>
    <div class="bar" aria-hidden="true"><span></span></div>
    <div class="hint">If nothing happens, check popups and your connection.</div>
  </div>
</body>
</html>`);
    doc.close();
  } catch {
    // ignore cross-origin write errors
  }
}

/**
 * Open a communication file in a new tab (public, no auth required).
 */
export const triggerCommunicationPublicDownload = async (id: number): Promise<void> => {
  const tab = window.open("", "_blank");
  if (!tab) {
    toast.warning("Popup blocked");
    return;
  }

  renderLoadingPage(tab, {
    title:   "Opening document…",
    heading: "Please wait… Opening your document",
    sub:     "Loading the PDF…",
  });

  try {
    const url = `${BASE_URL}/api/communications/${encodeURIComponent(String(id))}/public-download`;
    tab.location.replace(url);
  } catch (error) {
    try {
      if (!tab.closed) tab.close();
    } catch {
      // ignore
    }
    toast.warning("Cannot find document on server!");
    console.error("Failed to open PDF:", error);
  }
};