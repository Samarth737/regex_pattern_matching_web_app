import * as React from "react";
import { Box, Typography, Stack, CircularProgress } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

export default function PreviewTable({ columns, processedColumns, originalRows, processedRows, matchStats, height }) {
  const gridHeight = 520;

  return (
    <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ mt: 1, minHeight: 0 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Original (first N rows)</Typography>
        <DataGrid
          rows={originalRows}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          sx={{ height: height || 520 }}
        />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Processed (preview){matchStats && Object.keys(matchStats).length ? ` — matches: ${JSON.stringify(matchStats)}` : ""}
        </Typography>
        <DataGrid
          rows={processedRows}
          columns={processedColumns}
          density="compact"
          disableRowSelectionOnClick
          sx={{ height: height || 520 }}
        />
      </Box>
    </Stack>
  );
}
