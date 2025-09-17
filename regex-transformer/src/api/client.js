// src/api/client.js
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
  // TODO: POST to /getResults
  //payload: {file, prompt}
  await new Promise(r => setTimeout(r, 400));
  return {
    targetColumns: ["Email"],
    pattern: "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,7}\\b",
    flags: "i",
    replacement: "REDACTED",
    global: true,
  };
}

export async function getResultsFull({ file, prompt }) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("prompt", prompt);
  fd.append("mode", "full"); // optional, so BE knows to return full file

  const res = await fetch("http://localhost:8000/api/getResults/", { method: "POST", body: fd });
  if (!res.ok) throw new Error("getResults failed");

  const cd = res.headers.get("Content-Disposition") || "";
  const m = cd.match(/filename="?([^"]+)"?/);
  const filename = m?.[1] || "processed.csv";

  const blob = await res.blob();
  return { blob, filename };
}

export async function previewTransform({ fileId, pattern, flags, replacement, targetColumns }) {
  // TODO: POST to /preview → return processed sample rows
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
