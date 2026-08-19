"use client";

import { useRef, useState, useCallback, WheelEvent as ReactWheelEvent } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadImage } from "../lib/api-client";

interface Props {
  type: "players" | "teams" | "users" | "grounds" | "tournaments";
  value: string | null;
  onChange: (url: string) => void;
  shape?: "circle" | "square";
}

const FRAME_SIZE = 260; // px — size of the crop preview frame in the modal
const OUTPUT_SIZE = 512; // px — final uploaded image resolution

export function ImageUploadField({ type, value, onChange, shape = "circle" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cropper state
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // px, center-relative
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; startOffsetX: number; startOffsetY: number }>({
    dragging: false, startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0,
  });

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setRawImageUrl(url);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;

    // allow re-selecting the same file next time
    e.target.value = "";
  }

  // Base scale: smallest zoom where the image still fully covers the frame
  function baseScale() {
    if (!imgNaturalSize.w || !imgNaturalSize.h) return 1;
    return Math.max(FRAME_SIZE / imgNaturalSize.w, FRAME_SIZE / imgNaturalSize.h);
  }

  function clampOffset(nx: number, ny: number, currentZoom: number) {
    const scale = baseScale() * currentZoom;
    const dispW = imgNaturalSize.w * scale;
    const dispH = imgNaturalSize.h * scale;
    const maxX = Math.max(0, (dispW - FRAME_SIZE) / 2);
    const maxY = Math.max(0, (dispH - FRAME_SIZE) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, nx)), y: Math.min(maxY, Math.max(-maxY, ny)) };
  }

  function handlePointerDown(e: React.PointerEvent) {
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, startOffsetX: offset.x, startOffsetY: offset.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const next = clampOffset(dragState.current.startOffsetX + dx, dragState.current.startOffsetY + dy, zoom);
    setOffset(next);
  }

  function handlePointerUp() {
    dragState.current.dragging = false;
  }

  function handleWheel(e: ReactWheelEvent) {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setZoom((z) => {
      const nz = Math.min(3, Math.max(1, z + delta));
      setOffset((o) => clampOffset(o.x, o.y, nz));
      return nz;
    });
  }

  function handleZoomSlider(next: number) {
    setZoom(next);
    setOffset((o) => clampOffset(o.x, o.y, next));
  }

  const cancelCrop = useCallback(() => {
    if (rawImageUrl) URL.revokeObjectURL(rawImageUrl);
    setRawImageUrl(null);
  }, [rawImageUrl]);

  async function handleSaveCrop() {
    if (!rawImageUrl) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await renderCroppedBlob(rawImageUrl, imgNaturalSize, baseScale() * zoom, offset);
      const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
      const url = await uploadImage(file, type);
      onChange(url);
      cancelCrop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          width: 64,
          height: 64,
          borderRadius: shape === "circle" ? "50%" : "var(--cp-radius-inner)",
          background: value ? `url(${value}) center/cover` : "var(--cp-bg)",
          border: "1px dashed var(--cp-surface-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
        }}
      >
        {!value && !uploading && <Camera size={20} color="var(--cp-text-secondary)" />}
        {uploading && !rawImageUrl && <Loader2 size={20} color="var(--cp-accent-primary)" className="cp-spin" />}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFilePicked} style={{ display: "none" }} />
      {error && <p style={{ color: "var(--cp-danger)", fontSize: 11, marginTop: 4 }}>{error}</p>}

      {rawImageUrl && (
        <div style={overlayStyle}>
          <div className="cp-card" style={{ width: FRAME_SIZE + 40, fontFamily: "Inter, system-ui, sans-serif" }}>
            <p style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, color: "var(--cp-text-primary)" }}>
              Adjust Photo
            </p>

            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onWheel={handleWheel}
              style={{
                width: FRAME_SIZE,
                height: FRAME_SIZE,
                margin: "0 auto",
                position: "relative",
                overflow: "hidden",
                borderRadius: shape === "circle" ? "50%" : "var(--cp-radius-inner)",
                background: "#000",
                cursor: "grab",
                touchAction: "none",
                border: "1px solid var(--cp-surface-border)",
              }}
            >
              <img
                src={rawImageUrl}
                draggable={false}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: imgNaturalSize.w * baseScale() * zoom,
                  height: imgNaturalSize.h * baseScale() * zoom,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  userSelect: "none",
                  pointerEvents: "none",
                }}
                alt="Crop preview"
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
              <span style={{ fontSize: 11, color: "var(--cp-text-secondary)" }}>−</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => handleZoomSlider(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: "var(--cp-accent-primary)" }}
              />
              <span style={{ fontSize: 11, color: "var(--cp-text-secondary)" }}>+</span>
            </div>

            {error && <p style={{ color: "var(--cp-danger)", fontSize: 12, marginTop: 10 }}>{error}</p>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={cancelCrop}
                disabled={uploading}
                style={{
                  flex: 1, background: "transparent", border: "1px solid var(--cp-surface-border)",
                  borderRadius: "var(--cp-radius-inner)", padding: "8px 0", color: "var(--cp-text-secondary)",
                  fontSize: 13.5, cursor: uploading ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCrop}
                disabled={uploading}
                style={{
                  flex: 1, background: "var(--cp-accent-primary)", border: "none",
                  borderRadius: "var(--cp-radius-inner)", padding: "8px 0", color: "#0b0e11",
                  fontWeight: 600, fontSize: 13.5, cursor: uploading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {uploading ? <Loader2 size={14} className="cp-spin" /> : null}
                {uploading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Draws exactly what the user sees in the crop frame onto a fixed-size
// output canvas, so the uploaded image always matches the preview 1:1.
function renderCroppedBlob(
  imageUrl: string,
  natural: { w: number; h: number },
  displayScale: number,
  offset: { x: number; y: number },
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      // Map from the FRAME_SIZE preview coordinate space to OUTPUT_SIZE.
      const outputScale = OUTPUT_SIZE / FRAME_SIZE;
      const drawW = natural.w * displayScale * outputScale;
      const drawH = natural.h * displayScale * outputScale;
      const drawX = OUTPUT_SIZE / 2 - drawW / 2 + offset.x * outputScale;
      const drawY = OUTPUT_SIZE / 2 - drawH / 2 + offset.y * outputScale;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode image"))),
        "image/jpeg",
        0.92,
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
  });
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
};