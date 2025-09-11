import * as React from "react";
import { Card, CardContent, CardHeader, Stack, TextField, Button, Chip } from "@mui/material";

export default function InputPrompt({
  prompt, setPrompt,
  onGenerateRegex, onPreview, canPreview,
  regexInfo
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
          <Button variant="contained" onClick={onGenerateRegex} disabled={!prompt}>
            Generate Regex
          </Button>
          <Button variant="outlined" onClick={onPreview} disabled={!canPreview}>
            Preview
          </Button>
        </Stack>
        {regexInfo && (
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
            <Chip label={`Columns: ${regexInfo.targetColumns.join(", ")}`} />
            <Chip label={`Pattern: ${regexInfo.pattern}`} />
            <Chip label={`Flags: ${regexInfo.flags || "(none)"}`} />
            <Chip label={`Replacement: ${regexInfo.replacement}`} />
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}