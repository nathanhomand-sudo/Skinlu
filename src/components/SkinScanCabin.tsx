"use client";

/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, useEffect, useRef, useState } from "react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 4 * 1024 * 1024;

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type))
    return "Format invalide. Utilisez une photo JPG, PNG ou WebP.";
  if (file.size > MAX_FILE_SIZE)
    return "Fichier trop lourd. La taille maximale est de 4 MB.";
  return null;
}

interface SkinScanCabinProps {
  onSelfieSelected: (file: File | null) => void;
  onError: (message: string | null) => void;
  previewUrl: string | null;
  disabled: boolean;
}

export default function SkinScanCabin({
  onSelfieSelected,
  onError,
  previewUrl,
  disabled,
}: SkinScanCabinProps) {
  const [mode, setMode] = useState<"idle" | "cabine">("idle");
  const [lightOk, setLightOk] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Stop camera on unmount (guarantee — no camera ghost)
  useEffect(() => () => stopStream(), []);

  // Attach stream to <video> and run light check when cabine is active
  useEffect(() => {
    if (mode !== "cabine") return;

    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }

    const intervalId = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || v.readyState < v.HAVE_ENOUGH_DATA) return;
      const S = 64;
      const canvas = document.createElement("canvas");
      canvas.width = S;
      canvas.height = S;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, S, S);
      const { data } = ctx.getImageData(0, 0, S, S);
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      setLightOk(sum / (data.length / 4) > 50);
    }, 400);

    return () => window.clearInterval(intervalId);
  }, [mode]);

  async function openCabine() {
    if (streamRef.current || mode === "cabine") return;
    setCameraError(null);
    setLightOk(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Caméra non disponible. Importe une photo ci-dessous.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      setMode("cabine");
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      setCameraError(
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "Accès caméra refusé. Importe une photo ci-dessous."
          : "Caméra indisponible. Importe une photo ci-dessous.",
      );
    }
  }

  function closeCabine() {
    stopStream();
    setMode("idle");
    setLightOk(null);
    setIsCapturing(false);
  }

  function capture() {
    const video = videoRef.current;
    if (!video || isCapturing) return;
    setIsCapturing(true);

    // 600 ms: animation plays, then snapshot
    window.setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      // drawImage reads raw video data (CSS mirror has no effect here)
      if (ctx) ctx.drawImage(video, 0, 0);

      stopStream();
      setMode("idle");
      setIsCapturing(false);

      if (!ctx) {
        onError("Capture échouée. Réessaie.");
        return;
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            onError("Capture échouée. Réessaie.");
            return;
          }
          onSelfieSelected(new File([blob], "selfie.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.9,
      );
    }, 600);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      onSelfieSelected(null);
      return;
    }
    const err = validateFile(file);
    if (err) {
      event.target.value = "";
      onSelfieSelected(null);
      onError(err);
      return;
    }
    onSelfieSelected(file);
  }

  // ── Preview (after capture or file upload) ────────────────────
  if (previewUrl) {
    return (
      <div className="selfie-picker">
        <label className="drop-zone has-preview">
          <input
            type="file"
            name="selfie"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleChange}
            disabled={disabled}
          />
          <img src={previewUrl} alt="Preview du selfie" className="photo-preview" />
        </label>
      </div>
    );
  }

  // ── Cabine mode ───────────────────────────────────────────────
  if (mode === "cabine") {
    return (
      <div className="selfie-picker">
        <div className="scan-cabin-wrap">
          <div className={`scan-cabin-viewport${isCapturing ? " is-capturing" : ""}`}>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="scan-cabin-video"
            />
            <div className="scan-cabin-frame" />
            <div
              className={`scan-cabin-light${
                lightOk === null
                  ? " light-unknown"
                  : lightOk
                  ? " light-ok"
                  : " light-low"
              }`}
            >
              {lightOk === false ? "Lumière faible" : lightOk ? "Prêt" : ""}
            </div>
            {isCapturing && <div className="scan-cabin-scan-line" />}
          </div>
          <p className="scan-cabin-privacy">
            Ta photo sert uniquement à générer ton analyse, elle n&apos;est pas conservée.
          </p>
          <div className="scan-cabin-actions">
            <button
              type="button"
              className="scan-cabin-capture"
              onClick={capture}
              disabled={disabled || isCapturing}
            >
              {isCapturing ? "Capture en cours…" : "Capturer"}
            </button>
            <button type="button" className="scan-cabin-back" onClick={closeCabine}>
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Idle mode : CTA cabine + upload fallback ──────────────────
  return (
    <div className="selfie-picker">
      <div className="scan-cabin-idle">
        {cameraError ? (
          <p className="scan-cabin-error" role="alert">
            {cameraError}
          </p>
        ) : null}
        <div className="scan-cabin-cta-wrap">
          <button
            type="button"
            className="scan-cabin-cta"
            onClick={openCabine}
            disabled={disabled}
          >
            Scanner mon visage
          </button>
          <span className="scan-cabin-cta-sub">Scan guidé · Aperçu gratuit</span>
        </div>
        <div className="scan-cabin-or" aria-hidden="true">
          ou
        </div>
        <label className="drop-zone">
          <input
            type="file"
            name="selfie"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleChange}
            disabled={disabled}
          />
          <span className="drop-zone-empty">
            <strong>Importer une photo</strong>
            <span>Selfie net, visage bien éclairé. JPG, PNG ou WebP. 4 MB max.</span>
          </span>
        </label>
      </div>
    </div>
  );
}
