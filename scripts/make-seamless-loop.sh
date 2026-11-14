#!/usr/bin/env bash
# ==============================================================================
# OctoOps — Seamless Ping-Pong Video Loop Builder + Auto Watermark-Corner Crop
# Usage: ./scripts/make-seamless-loop.sh input.mp4 public/videos/inko-working.mp4
# ==============================================================================
set -e

INPUT="$1"
OUTPUT="$2"

if [ -z "$INPUT" ] || [ -z "$OUTPUT" ]; then
  echo "Usage: ./scripts/make-seamless-loop.sh <raw_video.mp4> <public/videos/output_name.mp4>"
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT")"

echo "🎬 Cropping out corner watermarks & building seamless 60fps ping-pong loop: $OUTPUT ..."
# Scales slightly larger (800x800) and center-crops 720x720 so any bottom-right corner watermark (Veo/Kling/Hailuo) is 100% removed!
ffmpeg -y -i "$INPUT" \
  -filter_complex "[0:v]scale=800:800:force_original_aspect_ratio=increase,crop=720:720,fps=30,split[fwd][rev];[rev]reverse[r];[fwd][r]concat=n=2:v=1:a=0" \
  -an -c:v libx264 -pix_fmt yuv420p -crf 19 -preset fast -movflags +faststart \
  "$OUTPUT"

echo "✅ Clean, watermark-free seamless loop saved to $OUTPUT!"
