from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
import pandas as pd
import io, json, re
import logging
logger = logging.getLogger("api")

from .llmutils import detect_target_columns, infer_regex_for_column

def _map_flags(flag_str: str) -> int:
    flags = 0
    if not flag_str:
        return flags
    s = flag_str.lower()
    if "i" in s: flags |= re.IGNORECASE
    if "m" in s: flags |= re.MULTILINE
    if "s" in s: flags |= re.DOTALL
    return flags

def _sample_nonempty_series(ser: pd.Series, k: int = 40) -> list:
    vals = ser.dropna().astype(str).map(str.strip)
    vals = vals[vals != ""]
    if vals.empty: return []
    unique_vals = vals.drop_duplicates()
    sample_size = min(k, len(unique_vals))
    # true random sample, reproducible:
    sample_vals = unique_vals.sample(n=sample_size, random_state=42)
    return [v if len(v) <= 120 else (v[:117] + "…") for v in sample_vals.tolist()]

def normalize_excel(file_obj, max_blank_scan: int = 10) -> pd.DataFrame:
    """
    Read an Excel file and auto-detect the header row.
    - Skips initial blank/metadata rows.
    - Uses the first non-empty row (or the row with most filled cells) as headers.
    - Fills missing headers with Column_1, Column_2, ...
    """
    # Load all rows, no header yet
    raw = pd.read_excel(file_obj, header=None, engine="openpyxl")
    raw = raw.fillna("")

    header_idx = None
    best_count = 0

    # scan first few rows to find a row with max non-empty cells
    for i in range(min(len(raw), max_blank_scan)):
        non_empty = sum(str(v).strip() != "" for v in raw.iloc[i])
        if non_empty > best_count:
            best_count = non_empty
            header_idx = i

    if header_idx is None:
        # fallback: use first row
        header_idx = 0

    # extract header
    header = []
    for i, h in enumerate(raw.iloc[header_idx]):
        h_clean = str(h).strip()
        header.append(h_clean if h_clean else f"Column_{i+1}")

    # data starts after header row
    data = raw.iloc[header_idx + 1:].copy()
    data.columns = header
    data = data.reset_index(drop=True)

    return data

import pandas as pd

def normalize_csv(file_obj, max_blank_scan: int = 10) -> pd.DataFrame:
    """
    Read a CSV file and auto-detect the header row.
    - Skips initial blank/metadata rows.
    - Uses the first non-empty row (or row with most filled cells) as headers.
    - Fills missing headers with Column_1, Column_2, ...
    """
    # Read all rows with no header
    raw = pd.read_csv(file_obj, header=None, skip_blank_lines=False)
    raw = raw.fillna("")

    header_idx = None
    best_count = 0

    for i in range(min(len(raw), max_blank_scan)):
        non_empty = sum(str(v).strip() != "" for v in raw.iloc[i])
        if non_empty > best_count:
            best_count = non_empty
            header_idx = i

    if header_idx is None:
        header_idx = 0

    # extract header
    header = []
    for i, h in enumerate(raw.iloc[header_idx]):
        h_clean = str(h).strip()
        header.append(h_clean if h_clean else f"Column_{i+1}")

    # data starts after header row
    data = raw.iloc[header_idx + 1:].copy()
    data.columns = header
    data = data.reset_index(drop=True)

    return data

@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def get_results(request):
    """
    Request (multipart/form-data):
      - file: CSV/XLSX
      - prompt: NL instruction

    Response:
      - Body: processed file (same format as input)
      - Headers:
          X-Regex-Info: JSON { target_columns, pattern/flags/replacement per column }
          X-Match-Stats: JSON { column: total_matches }
      - Content-Disposition: attachment; filename="processed.csv|xlsx"
    """
    f = request.FILES.get("file")
    prompt = (request.POST.get("prompt") or "").strip()

    if not f:
        return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

    # 1) Parse entire file
    name = (f.name or "").lower()
    try:
        if name.endswith(".csv"):
            in_format = "csv"
            df = normalize_csv(f)
        else:
            in_format = "xlsx"
            df = normalize_excel(f)
    except Exception as e:
        return Response({"error": f"Failed to parse file: {e}"}, status=status.HTTP_400_BAD_REQUEST)

    columns = [str(c) for c in df.columns]

    # 2) LLM Call A : detect target columns
    call_a = detect_target_columns(prompt, columns)
    logger.info(f"LLM Call A result: {call_a}")
    target_cols = [c for c in call_a.get("target_columns", []) if c in columns]

    # If none inferred, just return original file unchanged but include metadata
    if not target_cols:
        return _file_response(
            df,
            in_format=in_format,
            regex_info={
                "target_columns": [],
                "by_column": {},
                "call_a": call_a
            },
            match_stats={}
        )

    # 3) LLM Call B : infer regex per target column; apply; track match counts
    by_column = {}
    match_stats = {}

    for col in target_cols:
        examples = _sample_nonempty_series(df[col], k=40)
        rb = infer_regex_for_column(prompt, col, examples)
        pattern = rb.get("pattern") or ""
        repl = rb.get("replacement") or ""
        flags = _map_flags(rb.get("flags", ""))

        logger.info(f"Column '{col}': pattern='{pattern}' flags='{flags}' replacement='{repl}'")

        # Count matches before replacement (sum over rows)
        total_matches = 0
        if pattern:
            try:
                # validate
                reg = re.compile(pattern, flags)
                # pandas vectorized count with flags:
                counts = df[col].astype(str).str.count(reg)
                total_matches = int(counts.fillna(0).sum())
                # apply replacement
                df[col] = df[col].astype(str).str.replace(pattern, repl, regex=True, flags=flags)
            except re.error as ex:
                rb["error"] = f"Invalid regex: {ex}"
                total_matches = 0

        by_column[col] = rb
        match_stats[col] = total_matches

    regex_info = {
        "target_columns": target_cols,
        "by_column": by_column,
        "call_a": call_a
    }

    # 4) Return processed file (same format as input) + metadata in headers
    return _file_response(df, in_format=in_format, regex_info=regex_info, match_stats=match_stats)


def _file_response(df: pd.DataFrame, in_format: str, *, regex_info: dict, match_stats: dict) -> HttpResponse:
    """
    Serialize df back to the original format and attach JSON metadata in headers.
    """
    if in_format == "csv":
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        data = buf.getvalue().encode("utf-8")
        content_type = "text/csv"
        filename = "processed.csv"
    else:
        bio = io.BytesIO()
        with pd.ExcelWriter(bio, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Sheet1")
        data = bio.getvalue()
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = "processed.xlsx"

    resp = HttpResponse(data, content_type=content_type)
    resp["Access-Control-Expose-Headers"] = "X-Regex-Info, X-Match-Stats, Content-Disposition"
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    # attach metadata as JSON strings
    resp["X-Regex-Info"] = json.dumps(regex_info, ensure_ascii=False)
    resp["X-Match-Stats"] = json.dumps(match_stats, ensure_ascii=False)
    return resp
