---
description: Download music from YouTube URL using yt-dlp
---

# Download Music from YouTube

Download music from the provided YouTube URL using yt-dlp.

## URL:
$ARGUMENTS

## Execute:
```bash
mkdir -p music && yt-dlp -x --audio-format mp3 -o "music/%(title)s.%(ext)s" $ARGUMENTS
```

After downloading, open the music folder in Finder:
```bash
open music
```
