// src/App.jsx
import * as React from "react";
import { Container, Box, Typography, Divider } from "@mui/material";
import UploadCard from "./components/uploadCard";
import InputPrompt from "./components/inputPrompt";
import PreviewTable from "./components/previewTable";
import { uploadFile, nlToRegex, previewTransform, getResultsFull } from "./api/client";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { AppBar, Toolbar } from "@mui/material";
import Logo from "./logo.svg";
const PREVIEW_ROWS = 20;



const theme = createTheme({ typography: { fontSize: 14 } });

export default function App() {
  const [uploading, setUploading] = React.useState(false);
  const [fileMeta, setFileMeta] = React.useState(null);
  const [fileId, setFileId] = React.useState(null);
  const [columns, setColumns] = React.useState([]);
  const [processedColumns, setProcessedColumns] = React.useState([]);
  const [originalRows, setOriginalRows] = React.useState([]);
  const [processedRows, setProcessedRows] = React.useState([]);
  const [matchStats, setMatchStats] = React.useState(null);

  const [prompt, setPrompt] = React.useState("");
  const [regexInfo, setRegexInfo] = React.useState(null);

  function buildCols(fields) {
    return fields.map((f) => ({ field: f, headerName: f, flex: 1 }));
  }
  function buildRows(arr) {
    return arr.slice(0, PREVIEW_ROWS).map((row, i) => ({ id: i + 1, ...row }));
  }

  // make headers unique and “safe”
  function uniquifyHeaders(arr) {
    const seen = new Map();
    return arr.map((raw, idx) => {
      let h = String(raw || "").trim();
      if (!h) h = `Column_${idx + 1}`;
      // optional: normalize to simple field names
      h = h.replace(/\s+/g, "_").replace(/[^\w]/g, "_").replace(/^_+|_+$/g, "");
      // enforce uniqueness
      const count = (seen.get(h) || 0) + 1;
      seen.set(h, count);
      return count === 1 ? h : `${h}_${count}`;
    });
  }

  // choose header row = row with max non-empty cells
  function pickHeaderRow(matrix) {
    let bestIdx = -1;
    let bestCount = -1;
    matrix.forEach((row, idx) => {
      if (!Array.isArray(row)) return;
      const count = row.reduce((acc, c) => acc + (String(c ?? "").trim() ? 1 : 0), 0);
      if (count > bestCount) {
        bestCount = count;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }

  // Excel → normalized header + JSON rows
  function normalizeExcel(ws) {
    const matrix = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (!matrix.length) return { header: [], json: [] };

    const headerIdx = pickHeaderRow(matrix);
    const rawHeader = matrix[headerIdx] || [];
    const header = uniquifyHeaders(rawHeader);

    const dataRows = matrix.slice(headerIdx + 1);
    const json = dataRows.map((arr) => {
      const obj = {};
      header.forEach((key, i) => {
        obj[key] = arr[i] ?? "";
      });
      return obj;
    });

    return { header, json };
  }

  // CSV/Excel unified parser (returns columns + rows)
  async function parseAnyFile(file) {
    const name = (file?.name || "").toLowerCase();
    const isExcel = /\.(xlsx|xls|xlsm)$/.test(name);

    if (isExcel) {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const { header, json } = normalizeExcel(ws);
      return { columns: buildCols(header), rows: buildRows(json) };
    }

    // CSV (or unknown: try as text CSV first)
    const text = await file.text();
    return await new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const data = res.data || [];
          const fields = res.meta?.fields?.length
            ? uniquifyHeaders(res.meta.fields)
            : uniquifyHeaders(Object.keys(data[0] || {}));
          resolve({ columns: buildCols(fields), rows: buildRows(data) });
        },
      });
    });
  }

  // --- your handler, simplified to use the unified parser ---
  const handleUpload = async (file) => {
    try {
      setUploading(true);
      setFileMeta(file);
      setFileId("local-preview");

      const { columns, rows } = await parseAnyFile(file);

      setColumns(columns);
      setOriginalRows(rows);
      setProcessedRows([]);
      setRegexInfo(null);
    } catch (err) {
      console.error("Upload/parse error:", err);
      // TODO: show a snackbar/toast
    } finally {
      setUploading(false);
    }
  };

  const handleApply = async () => {
    if (!fileMeta || !prompt) return;
    try {
      setUploading(true);
      const { blob, filename } = await getResultsFull({ file: fileMeta, prompt });

      // (A) Optional: auto-download the returned file
      // const url = URL.createObjectURL(blob);
      // const a = document.createElement("a");
      // a.href = url; a.download = filename; a.click();
      // URL.revokeObjectURL(url);

      // (B) Parse the returned file to populate the right-hand grid
      // Create a File from Blob so parseAnyFile can reuse extension/type
      const ext = filename.toLowerCase().endsWith(".xlsx") || filename.toLowerCase().endsWith(".xls")
        ? (filename.split(".").pop() || "xlsx")
        : "csv";
      const processedFile = new File([blob], filename, {
        type: ext === "csv"
          ? "text/csv"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const { columns, rows } = await parseAnyFile(processedFile);
      // Keep columns in sync across both grids if you prefer:
      setProcessedColumns(columns);
      setProcessedRows(rows);

      // (Optional) also show regex info chips if backend includes it in headers or a side JSON call
    } catch (e) {
      console.error("Apply/getResults error:", e);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateRegex = async () => {
    if (!fileId || !columns.length) return;
    const schema = columns.map(c => c.field);
    const sample = originalRows.slice(0, 10);
    const out = await nlToRegex({ prompt, schema, sample });
    setRegexInfo(out);
  };

  const handlePreview = async () => {
    if (!regexInfo || !fileId) return;
    const res = await previewTransform({
      fileId,
      pattern: regexInfo.pattern,
      flags: regexInfo.flags,
      replacement: regexInfo.replacement,
      targetColumns: regexInfo.targetColumns
    });
    setProcessedRows(res.processedRows || []);
    setMatchStats(res.matchStats || null);
  };

  // Tab title (see section 3 for favicon)
  React.useEffect(() => { document.title = "Regex Assistant"; }, []);

  // heights (tweak numbers if your controls shrink/grow)
  const HEADER_H = 64;         // AppBar height
  const CONTROLS_H = 180;      // Upload + Prompt cards combined (estimate)
  const PAGE_PADDING = 48;     // container paddings/margins
  const gridHeight = `calc(100vh - ${HEADER_H + CONTROLS_H + PAGE_PADDING}px)`;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          <img src={Logo} alt="Logo" style={{ width: 32, height: 32, marginRight: 8 }} />
          <Typography variant="h6" noWrap>
            Regex Pattern Matching & Replacement Assistant
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth={false} sx={{ py: 3 }}>
        <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
          Upload a CSV/Excel, describe the pattern in natural language, preview replacements.
        </Typography>

        <UploadCard onUpload={handleUpload} uploading={uploading} fileMeta={fileMeta} />
        <InputPrompt
          prompt={prompt}
          setPrompt={setPrompt}
          onGenerateRegex={handleGenerateRegex}
          onPreview={handlePreview}
          canPreview={!!(fileId && regexInfo)}
          regexInfo={regexInfo}
        />

        <Divider sx={{ my: 2 }} />

        <Box>
          <PreviewTable
            columns={columns}
            processedColumns={processedColumns}
            originalRows={originalRows}
            processedRows={processedRows}
            matchStats={matchStats}
            height={gridHeight}
          />
        </Box>
      </Container>
    </ThemeProvider>
  );
}
