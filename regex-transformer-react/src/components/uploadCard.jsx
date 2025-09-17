import * as React from "react";
import { Card, CardContent, CardHeader, Button, Stack, Typography } from "@mui/material";

export default function UploadCard({ onUpload, uploading, fileMeta }) {
  const fileRef = React.useRef(null);

  const handlePick = () => fileRef.current?.click();

  const handleChange = (e) => {
  const f = e.target.files?.[0];
  if (f) onUpload(f);   // App handles parsing
};


  return (
    <Card variant="outlined">
      <CardHeader title="Upload CSV/Excel" titleTypographyProps={{ fontSize: '1rem' }}/>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <input
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, .xlsx, .xls"
            style={{ display: "none" }}
            ref={fileRef}
            onChange={handleChange}
          />
          <Button variant="contained" onClick={handlePick} disabled={uploading}>
            {uploading ? "Uploading..." : "Choose File"}
          </Button>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {fileMeta ? `${fileMeta.name} (${Math.round(fileMeta.size / 1024)} KB)` : "No file selected"}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
