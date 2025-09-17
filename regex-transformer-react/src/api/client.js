export async function uploadFile(file) {
  // TODO: POST to /upload (FormData)
  // return { fileId, columns, sampleRows }
  await new Promise(r => setTimeout(r, 500));
  return {
    fileId: "fake-file-1",
    columns: [
      { field: "ID", headerName: "ID", width: 80 },
      { field: "Name", headerName: "Name", flex: 1 },
      { field: "Email", headerName: "Email", flex: 1.2 },
    ],
    sampleRows: [
      { id: 1, ID: 1, Name: "John Doe", Email: "john.doe@example.com" },
      { id: 2, ID: 2, Name: "Jane Smith", Email: "jane_smith@domain.com" },
      { id: 3, ID: 3, Name: "Alice Brown", Email: "alice.brown@website.org" },
    ],
  };
}

export async function nlToRegex({ prompt, schema, sample }) {
  await new Promise(r => setTimeout(r, 400));
  return {
    targetColumns: ["Email"],
    pattern: "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,7}\\b",
    flags: "i",
    replacement: "REDACTED",
    global: true,
  };
}

// utils to safely parse header JSON
function parseHeaderJSON(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    // Some servers fold headers; try to unescape common artifacts
    try {
      return JSON.parse(value.replace(/\\n/g, "\n"));
    } catch {
      return null;
    }
  }
}

/**
 * Fetch processed file + metadata and also parse it for the right-hand grid.
 * @param {Object} params
 * @param {File|Blob} params.file - original uploaded file
 * @param {string} params.prompt  - NL instruction
 * @param {function} params.parseAnyFile - your helper that returns { columns, rows } from a File
 * @param {string} [params.apiBase="http://localhost:8000"] - backend base URL
 * @returns {Promise<{blob: Blob, filename: string, columns: any[], rows: any[], regexInfo: any, matchStats: any}>}
 */
export async function getResultsFull({ file, prompt, parseAnyFile, apiBase}) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("prompt", prompt);

  const res = await fetch(`${apiBase}/api/getResults/`, { method: "POST", body: fd });
  if (!res.ok) {
    // server error JSON if present
    let msg = `getResults failed (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson?.error) msg += `: ${errJson.error}`;
    } catch {}
    throw new Error(msg);
  }

  // 1) Headers -> metadata
  const regexInfo = parseHeaderJSON(res.headers.get("X-Regex-Info"));
  const matchStats = parseHeaderJSON(res.headers.get("X-Match-Stats"));

  console.log("Received regexInfo:", regexInfo);
  console.log("Received matchStats:", matchStats);

  // 2) Body -> Blob + filename
  const cd = res.headers.get("Content-Disposition") || "";
  const fnMatch = cd.match(/filename="?([^"]+)"?/i);
  const filename = fnMatch?.[1] || "processed.csv";
  const blob = await res.blob();

  // 3) Parse Blob for grid (CSV/Excel)
  // Build a File object so parseAnyFile can infer type from name
  const processedFile = new File([blob], filename, { type: blob.type || "application/octet-stream" });
  const { columns, rows } = await parseAnyFile(processedFile);
  return { blob, filename, columns, rows, regexInfo, matchStats };
}

export async function previewTransform({ fileId, pattern, flags, replacement, targetColumns }) {
  await new Promise(r => setTimeout(r, 400));
  return {
    processedRows: [
      { id: 1, ID: 1, Name: "John Doe", Email: "REDACTED" },
      { id: 2, ID: 2, Name: "Jane Smith", Email: "REDACTED" },
      { id: 3, ID: 3, Name: "Alice Brown", Email: "REDACTED" },
    ],
    matchStats: { Email: 3 },
  };
}

export async function applyTransform(args) {
  // TODO: POST to /apply → return handle or full result (paged)
  await new Promise(r => setTimeout(r, 400));
  return { ok: true };
}
