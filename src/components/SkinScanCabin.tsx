"use client";

/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { FaceDetector as MediaPipeFaceDetector } from "@mediapipe/tasks-vision";
import { track } from "@/lib/track";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MEDIAPIPE_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const FACE_DETECTOR_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";
const AUTO_CAPTURE_MS = 1800;

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type))
    return "Format invalide. Utilisez une photo JPG, PNG ou WebP.";
  if (file.size > MAX_FILE_SIZE)
    return "Fichier trop lourd. La taille maximale est de 4 MB.";
  return null;
}

export interface SkinScanCabinHandle {
  openCamera: () => void;
}

interface SkinScanCabinProps {
  onSelfieSelected: (file: File | null) => void;
  onError: (message: string | null) => void;
  previewUrl: string | null;
  disabled: boolean;
}

const SkinScanCabin = forwardRef<SkinScanCabinHandle, SkinScanCabinProps>(
function SkinScanCabin({
  onSelfieSelected,
  onError,
  previewUrl,
  disabled,
}: SkinScanCabinProps, ref) {
  const [mode, setMode] = useState<"idle" | "cabine">("idle");
  const [lightOk, setLightOk] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [autoCaptureProgress, setAutoCaptureProgress] = useState(0);
  const [faceGuide, setFaceGuide] = useState<{
    label: string;
    detail: string;
    ready: boolean;
  } | null>(null);
  const [mediaPipeStatus, setMediaPipeStatus] = useState<
    "idle" | "loading" | "ready" | "fallback"
  >("idle");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<MediaPipeFaceDetector | null>(null);
  const stableFaceSinceRef = useRef<number | null>(null);
  const captureRef = useRef<() => void>(() => {});

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => () => stopStream(), []);

  useEffect(() => {
    let cancelled = false;
    async function loadFaceDetector() {
      if (
        detectorRef.current ||
        mediaPipeStatus === "loading" ||
        mediaPipeStatus === "ready"
      )
        return;
      setMediaPipeStatus("loading");
      try {
        const { FaceDetector, FilesetResolver } = await import(
          "@mediapipe/tasks-vision"
        );
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: FACE_DETECTOR_MODEL_URL },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.45,
        });
        if (cancelled) {
          detector.close();
          return;
        }
        detectorRef.current = detector;
        setMediaPipeStatus("ready");
      } catch {
        if (!cancelled) setMediaPipeStatus("fallback");
      }
    }
    if (mode === "cabine") void loadFaceDetector();
    return () => {
      cancelled = true;
    };
  }, [mediaPipeStatus, mode]);

  useEffect(() => {
    if (mode !== "cabine") return;
    if (videoRef.current && streamRef.current)
      videoRef.current.srcObject = streamRef.current;

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < video.HAVE_ENOUGH_DATA) return;

      const sampleSize = 64;
      const canvas = document.createElement("canvas");
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(video, 0, 0, sampleSize, sampleSize);
      const { data } = context.getImageData(0, 0, sampleSize, sampleSize);
      let brightness = 0;
      for (let i = 0; i < data.length; i += 4)
        brightness += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const averageBrightness = brightness / (data.length / 4);
      const hasEnoughLight = averageBrightness > 52;
      setLightOk(hasEnoughLight);
      setScanProgress(hasEnoughLight ? Date.now() - startedAt : 0);

      const detector = detectorRef.current;
      if (!detector) return;

      try {
        const result = detector.detectForVideo(video, performance.now());
        const detection = result.detections[0];

        if (!detection?.boundingBox) {
          stableFaceSinceRef.current = null;
          setFaceGuide({
            label: "Visage non détecté",
            detail: "Place ton visage face caméra, sans lunettes sombres.",
            ready: false,
          });
          return;
        }

        const box = detection.boundingBox;
        const videoWidth = video.videoWidth || 1;
        const videoHeight = video.videoHeight || 1;
        const centerX = (box.originX + box.width / 2) / videoWidth;
        const centerY = (box.originY + box.height / 2) / videoHeight;
        const widthRatio = box.width / videoWidth;
        const centerOffsetX = Math.abs(centerX - 0.5);
        const centerOffsetY = Math.abs(centerY - 0.48);
        const keypoints = detection.keypoints ?? [];
        const leftEye = keypoints[0];
        const rightEye = keypoints[1];
        const tilt =
          leftEye && rightEye
            ? Math.abs(
                Math.atan2(leftEye.y - rightEye.y, leftEye.x - rightEye.x) *
                  (180 / Math.PI),
              )
            : 0;
        const normalizedTilt = Math.min(tilt, Math.abs(180 - tilt));

        if (!hasEnoughLight) {
          stableFaceSinceRef.current = null;
          setFaceGuide({
            label: "Lumière insuffisante",
            detail: "Tourne-toi vers une fenêtre.",
            ready: false,
          });
        } else if (widthRatio < 0.26) {
          stableFaceSinceRef.current = null;
          setFaceGuide({
            label: "Rapproche-toi légèrement",
            detail: "Ton visage doit remplir un peu plus le cadre.",
            ready: false,
          });
        } else if (widthRatio > 0.62) {
          stableFaceSinceRef.current = null;
          setFaceGuide({
            label: "Recule un peu",
            detail: "Garde le visage entier dans l'ovale.",
            ready: false,
          });
        } else if (centerOffsetX > 0.13 || centerOffsetY > 0.16) {
          stableFaceSinceRef.current = null;
          setFaceGuide({
            label: "Centre ton visage",
            detail: "Aligne ton visage avec le guide.",
            ready: false,
          });
        } else if (normalizedTilt > 12) {
          stableFaceSinceRef.current = null;
          setFaceGuide({
            label: "Garde le visage droit",
            detail: "Redresse légèrement la tête.",
            ready: false,
          });
        } else {
          stableFaceSinceRef.current ??= Date.now();
          const stableFor = Date.now() - stableFaceSinceRef.current;
          setFaceGuide(
            stableFor > 900
              ? {
                  label: "Scan prêt",
                  detail: "Capture automatique dans un instant.",
                  ready: true,
                }
              : {
                  label: "Parfait, ne bouge plus",
                  detail: "Le visage est bien cadré.",
                  ready: false,
                },
          );
        }
      } catch {
        setMediaPipeStatus("fallback");
      }
    }, 350);

    return () => window.clearInterval(intervalId);
  }, [mode]);

  const scanState = useMemo(() => {
    if (faceGuide && mediaPipeStatus === "ready") return faceGuide;
    if (lightOk === false)
      return {
        label: "Lumière insuffisante",
        detail: "Tourne-toi vers une fenêtre.",
        ready: false,
      };
    if (scanProgress < 900)
      return {
        label: "Place ton visage dans le cadre",
        detail: "Regarde droit devant toi.",
        ready: false,
      };
    if (scanProgress < 1800)
      return {
        label: "Rapproche-toi légèrement",
        detail: "Garde le visage dans le guide.",
        ready: false,
      };
    if (scanProgress < 2800)
      return {
        label: "Garde le visage bien visible",
        detail: "Évite les mains ou cheveux devant le visage.",
        ready: false,
      };
    if (scanProgress < 3800)
      return {
        label: "Parfait, ne bouge plus",
        detail: "Capture automatique dans un instant.",
        ready: true,
      };
    return {
      label: "Scan prêt",
      detail: "Capture automatique dans un instant.",
      ready: true,
    };
  }, [faceGuide, lightOk, mediaPipeStatus, scanProgress]);

  // Auto-capture: when ready, fill progress bar then capture
  const isReady = scanState.ready;
  useEffect(() => {
    if (!isReady || isCapturing || mode !== "cabine") {
      setAutoCaptureProgress(0);
      return;
    }
    const start = Date.now();
    const tickId = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / AUTO_CAPTURE_MS, 1);
      setAutoCaptureProgress(p);
      if (p >= 1) {
        window.clearInterval(tickId);
        captureRef.current();
      }
    }, 50);
    return () => {
      window.clearInterval(tickId);
      setAutoCaptureProgress(0);
    };
  }, [isReady, isCapturing, mode]);

  useImperativeHandle(ref, () => ({ openCamera: openCabine }));

  async function openCabine() {
    if (streamRef.current || mode === "cabine") return;
    track("camera_permission_requested");
    setCameraError(null);
    setLightOk(null);
    setScanProgress(0);
    setFaceGuide(null);
    stableFaceSinceRef.current = null;

    if (!navigator.mediaDevices?.getUserMedia) {
      track("camera_permission_denied", { reason: "api_unavailable" });
      setCameraError("Caméra non disponible. Importe une photo.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1440 } },
      });
      streamRef.current = stream;
      setMode("cabine");
      track("camera_permission_granted");
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      const permissionDenied =
        name === "NotAllowedError" || name === "PermissionDeniedError";
      track("camera_permission_denied", {
        reason: permissionDenied ? "permission_denied" : "unavailable",
      });
      setCameraError(
        permissionDenied
          ? "Accès caméra refusé. Importe une photo."
          : "Caméra indisponible. Importe une photo.",
      );
    }
  }

  function closeCabine() {
    stopStream();
    setMode("idle");
    setLightOk(null);
    setScanProgress(0);
    setFaceGuide(null);
    stableFaceSinceRef.current = null;
    setIsCapturing(false);
    setAutoCaptureProgress(0);
  }

  function capture() {
    const video = videoRef.current;
    if (!video || isCapturing) return;
    setIsCapturing(true);

    window.setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 960;
      const context = canvas.getContext("2d");
      if (context) context.drawImage(video, 0, 0);
      stopStream();
      setMode("idle");
      setIsCapturing(false);
      setAutoCaptureProgress(0);

      if (!context) {
        onError("Capture échouée. Réessaie.");
        return;
      }
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            onError("Capture échouée. Réessaie.");
            return;
          }
          track("selfie_captured");
          onSelfieSelected(new File([blob], "selfie.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.9,
      );
    }, 480);
  }

  // Keep captureRef always pointing to latest capture closure
  captureRef.current = capture;

  function handleUploadClick() {
    track("upload_fallback_clicked");
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      onSelfieSelected(null);
      return;
    }
    const error = validateFile(file);
    if (error) {
      event.target.value = "";
      onSelfieSelected(null);
      onError(error);
      return;
    }
    track("selfie_uploaded");
    onSelfieSelected(file);
  }

  // ── Preview state ────────────────────────────────────────────────
  if (previewUrl) {
    return (
      <div className="selfie-picker">
        <label className="drop-zone has-preview">
          <input
            type="file"
            name="selfie"
            accept="image/jpeg,image/png,image/webp"
            onClick={handleUploadClick}
            onChange={handleChange}
            disabled={disabled}
          />
          <img src={previewUrl} alt="Preview du selfie" className="photo-preview" />
          <span className="drop-zone-replace">Changer la photo</span>
        </label>
      </div>
    );
  }

  // ── Camera active ─────────────────────────────────────────────────
  if (mode === "cabine") {
    return (
      <div className="selfie-picker">
        <div className="scan-cabin-wrap">
          <div className={`scan-cabin-viewport${isCapturing ? " is-capturing" : ""}${scanState.ready && !isCapturing ? " is-ready" : ""}`}>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="scan-cabin-video"
            />
            <div className="scan-cabin-frame" aria-hidden="true" />
            <div className="scan-cabin-reticle" aria-hidden="true" />
            <div className={`scan-cabin-status${scanState.ready ? " is-ready" : ""}`}>
              <strong>{scanState.label}</strong>
              <span>{scanState.detail}</span>
            </div>
            <div
              className={`scan-cabin-light${
                lightOk === null
                  ? " light-unknown"
                  : lightOk
                    ? " light-ok"
                    : " light-low"
              }`}
            >
              {lightOk === false ? "Lumière faible" : lightOk ? "Lumière OK" : ""}
            </div>
            {isCapturing && <div className="scan-cabin-scan-line" />}
            {autoCaptureProgress > 0 && !isCapturing && (
              <div
                className="scan-cabin-auto-bar"
                style={{ width: `${autoCaptureProgress * 100}%` }}
                aria-hidden="true"
              />
            )}
          </div>
          <div className="scan-cabin-actions">
            {scanState.ready && !isCapturing && (
              <button
                type="button"
                className="scan-cabin-capture"
                onClick={capture}
                disabled={disabled || isCapturing}
              >
                Capturer maintenant
              </button>
            )}
            <button type="button" className="scan-cabin-back" onClick={closeCabine}>
              ← Importer une photo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Idle state ───────────────────────────────────────────────────
  return (
    <div className="selfie-picker">
      <div className="scan-cabin-idle">
        {cameraError ? (
          <p className="scan-cabin-error" role="alert">
            {cameraError}
          </p>
        ) : null}
        <button
          type="button"
          className="scan-cabin-cta"
          onClick={openCabine}
          disabled={disabled}
        >
          Scanner ma peau
        </button>
        <label className="scan-cabin-upload-link">
          <input
            type="file"
            name="selfie"
            accept="image/jpeg,image/png,image/webp"
            onClick={handleUploadClick}
            onChange={handleChange}
            disabled={disabled}
          />
          ou importer une photo
        </label>
      </div>
    </div>
  );
});

export default SkinScanCabin;
