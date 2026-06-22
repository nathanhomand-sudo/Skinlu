"use client";

import { useEffect, useRef, useState } from "react";
import type { FaceDetector as MediaPipeFaceDetector } from "@mediapipe/tasks-vision";

/* Caméra guidée /v2 — réutilise la logique MediaPipe du produit (SkinScanCabin) :
   détection visage temps réel + feedback (rapproche-toi / centre / parfait) +
   auto-capture. "Jamais de scan raté". Autonome, ne touche pas au produit.
   onCapture(dataUrl) → l'image freezée pour l'écran d'analyse. */

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";
const AUTO_CAPTURE_MS = 1500;

type Guide = { label: string; detail: string; ready: boolean };

export function ScanCamera({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<MediaPipeFaceDetector | null>(null);
  const stableSinceRef = useRef<number | null>(null);
  const capturedRef = useRef(false);

  const [status, setStatus] = useState<"loading" | "live" | "error">("loading");
  const [guide, setGuide] = useState<Guide>({ label: "Place ton visage dans le cadre", detail: "Regarde droit devant toi.", ready: false });
  const [autoProgress, setAutoProgress] = useState(0);
  const [fallback, setFallback] = useState(false);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function capture() {
    if (capturedRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    capturedRef.current = true;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    let dataUrl = "";
    if (ctx) {
      // miroir (selfie)
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    }
    stopStream();
    onCapture(dataUrl);
  }
  const captureRef = useRef(capture);
  captureRef.current = capture;

  // Démarrage caméra + détecteur
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus("live");
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }
      try {
        const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.45,
        });
        if (cancelled) { detector.close(); return; }
        detectorRef.current = detector;
      } catch {
        if (!cancelled) setFallback(true); // pas de détection → capture manuelle
      }
    })();
    return () => { cancelled = true; stopStream(); };
  }, []);

  // Boucle de détection + feedback
  useEffect(() => {
    if (status !== "live") return;
    const id = window.setInterval(() => {
      const video = videoRef.current;
      const detector = detectorRef.current;
      if (!video || video.readyState < video.HAVE_ENOUGH_DATA || !detector) return;
      try {
        const res = detector.detectForVideo(video, performance.now());
        const det = res.detections[0];
        if (!det?.boundingBox) {
          stableSinceRef.current = null;
          setGuide({ label: "Visage non détecté", detail: "Mets ton visage face caméra.", ready: false });
          return;
        }
        const b = det.boundingBox;
        const vw = video.videoWidth || 1, vh = video.videoHeight || 1;
        const cx = (b.originX + b.width / 2) / vw;
        const cy = (b.originY + b.height / 2) / vh;
        const wr = b.width / vw;
        const offX = Math.abs(cx - 0.5), offY = Math.abs(cy - 0.48);
        if (wr < 0.26) { stableSinceRef.current = null; setGuide({ label: "Rapproche-toi légèrement", detail: "Ton visage doit remplir un peu plus le cadre.", ready: false }); }
        else if (wr > 0.62) { stableSinceRef.current = null; setGuide({ label: "Recule un peu", detail: "Garde le visage entier dans l'ovale.", ready: false }); }
        else if (offX > 0.13 || offY > 0.16) { stableSinceRef.current = null; setGuide({ label: "Centre ton visage", detail: "Aligne-toi avec le guide.", ready: false }); }
        else {
          stableSinceRef.current ??= Date.now();
          const stableFor = Date.now() - stableSinceRef.current;
          setGuide(stableFor > 700
            ? { label: "Parfait, ne bouge plus", detail: "Capture en cours…", ready: true }
            : { label: "Presque…", detail: "Garde la position.", ready: false });
        }
      } catch {
        setFallback(true);
      }
    }, 320);
    return () => window.clearInterval(id);
  }, [status]);

  // Auto-capture quand prêt
  useEffect(() => {
    if (!guide.ready || status !== "live") { setAutoProgress(0); return; }
    const start = Date.now();
    const tick = window.setInterval(() => {
      const p = Math.min((Date.now() - start) / AUTO_CAPTURE_MS, 1);
      setAutoProgress(p);
      if (p >= 1) { window.clearInterval(tick); captureRef.current(); }
    }, 40);
    return () => { window.clearInterval(tick); setAutoProgress(0); };
  }, [guide.ready, status]);

  return (
    <div className="mt-7 flex flex-col items-center">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black" style={{ width: "min(300px, 100%)", aspectRatio: "3 / 4" }}>
        {status === "error" ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-[0.95rem] font-semibold text-white">Caméra indisponible</p>
            <p className="text-[0.82rem] leading-relaxed text-white/55">Autorise la caméra pour le scan, ou continue avec une photo de démo.</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(62% 58% at 50% 46%, transparent 60%, rgba(0,0,0,.55))" }} />
            <div className="pointer-events-none absolute rounded-[50%] border-2 border-dashed transition-colors" style={{ left: "50%", top: "48%", width: "62%", height: "68%", transform: "translate(-50%,-50%)", borderColor: guide.ready ? "rgba(94,234,212,.9)" : "rgba(255,255,255,.4)" }} />
            {[["left-4 top-4", "border-l-2 border-t-2"], ["right-4 top-4", "border-r-2 border-t-2"], ["left-4 bottom-4", "border-l-2 border-b-2"], ["right-4 bottom-4", "border-r-2 border-b-2"]].map(([pos, b], i) => (
              <span key={i} className={`pointer-events-none absolute h-6 w-6 rounded-[3px] border-white/50 ${pos} ${b}`} />
            ))}
            {/* anneau d'auto-capture */}
            {autoProgress > 0 && (
              <svg className="pointer-events-none absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2" width="190" height="190" viewBox="0 0 190 190" aria-hidden>
                <circle cx="95" cy="95" r="90" fill="none" stroke="#5eead4" strokeWidth="3" strokeLinecap="round" strokeDasharray={565} strokeDashoffset={565 * (1 - autoProgress)} transform="rotate(-90 95 95)" />
              </svg>
            )}
            {status === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-emerald-300" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Feedback */}
      <div className="mt-5 text-center">
        {status === "error" ? null : (
          <>
            <p className={`text-[0.98rem] font-semibold ${guide.ready ? "text-emerald-300" : "text-white"}`}>{guide.label}</p>
            <p className="mt-1 text-[0.85rem] text-white/50">{guide.detail}</p>
          </>
        )}
      </div>

      {/* Capture manuelle (fallback / caméra indispo) */}
      {(fallback || status === "error") && (
        <button
          type="button"
          onClick={() => (status === "error" ? onCapture("") : capture())}
          style={{ WebkitTapHighlightColor: "transparent" }}
          className="mt-5 flex h-12 w-full max-w-[300px] items-center justify-center rounded-lg bg-accent text-[0.95rem] font-extrabold text-white shadow-cta"
        >
          {status === "error" ? "Continuer avec une démo" : "Capturer maintenant"}
        </button>
      )}
    </div>
  );
}
