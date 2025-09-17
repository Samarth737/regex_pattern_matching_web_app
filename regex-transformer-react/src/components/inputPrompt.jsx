import * as React from "react";
import { Card, CardContent, CardHeader, Stack, TextField, Button, Chip, CircularProgress } from "@mui/material";

export default function InputPrompt({
  prompt, setPrompt,
  onGenerateRegex, onPreview, canPreview,
  regexInfo, loading
}) {
  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardHeader title="Describe the pattern (natural language)" titleTypographyProps={{ fontSize: '1rem' }}/>
      <CardContent>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
          <TextField
            fullWidth
            placeholder='e.g. "Find email addresses in the Email column and replace with REDACTED"'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button variant="contained" onClick={onGenerateRegex} disabled={!prompt} loading={loading}>
            Generate Regex
          </Button>
          {loading && (<CircularProgress size={16} sx={{ color: "white", mr: 1 }} />)}
          <Button variant="outlined" onClick={onPreview} disabled={!canPreview}>
            Download
          </Button>
        </Stack>
        {regexInfo && (
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
            <Chip label={`Columns: ${regexInfo.target_columns.join(", ")}`} />
            <Chip label={`Pattern: ${regexInfo.by_column[regexInfo.target_columns].pattern}`} />
            <Chip label={`Flags: ${regexInfo.by_column[regexInfo.target_columns].flags || "(none)"}`} />
            <Chip label={`Replacement: ${regexInfo.by_column[regexInfo.target_columns].replacement}`} />
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}