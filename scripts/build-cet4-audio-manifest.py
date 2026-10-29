"""Generate the frontend's direct-play URL map from the reviewed-match candidates.

Only entries with one US recording are included. Multiple-recording entries
remain on browser speech until their pronunciation is reviewed.
"""

import csv
import json
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "xueling-backend" / "data" / "cet4_audio_all_matches.csv"
DESTINATION = ROOT / "src" / "assets" / "cet4-audio-urls.json"


def main():
    urls = {}
    with SOURCE.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] != "matched_license_pending":
                continue
            key = " ".join(unicodedata.normalize("NFKC", row["word"]).strip().casefold().split())
            url = row["mp3_url"]
            if not key or not url.startswith("https://upload.wikimedia.org/"):
                raise ValueError(f"Unexpected audio URL: {row['word']}")
            if key in urls and urls[key] != url:
                raise ValueError(f"Conflicting audio URL: {row['word']}")
            urls[key] = url
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    DESTINATION.write_text(json.dumps(dict(sorted(urls.items())), ensure_ascii=False,
                                      separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {len(urls)} direct audio URLs -> {DESTINATION}")


if __name__ == "__main__":
    main()
