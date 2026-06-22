"use client";

import { useEffect, useRef, useState } from "react";
import type { FaceDetector as MediaPipeFaceDetector } from "@mediapipe/tasks-vision";

/* Caméra guidée /v2 — flow contrôlé :
   préparation (preview + consignes) → bouton MANUEL "Lancer mon scan"
   → contrôle qualité (visage / lumière / netteté / taille) → si OK onCapture,
   sinon écran "reprendre". Import galerie possible mais soumis au même QC.
   onCapture(dataUrl). Réutilise MediaPipe (logique de SkinScanCabin). */

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";

// Seuils QC (volontairement tolérants pour ne pas rejeter de bonnes photos).
const MIN_BRIGHT = 48;
const MIN_SHARP = 6;
const MIN_FACE_WR = 0.2;

type Status = "loading" | "live" | "checking" | "rejected" | "error";

function brightnessOf(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(0, 0, w, h);
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  return sum / (data.length / 4);
}
function sharpnessOf(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(0, 0, w, h);
  let sum = 0, count = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 1; x < w; x++) {
      const i = (y * w + x) * 4, j = (y * w + x - 1) * 4;
      const g1 = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const g0 = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
      const d = g1 - g0;
      sum += d * d;
      count++;
    }
  }
  return count ? sum / count : 0;
}
// Réduit une source (video/img) sur un petit canvas pour mesurer vite.
function sampleMetrics(src: CanvasImageSource, sw: number, sh: number) {
  const size = 200;
  const ratio = sh / sw;
  const w = size, h = Math.max(1, Math.round(size * ratio));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return { brightness: 0, sharpness: 0 };
  ctx.drawImage(src, 0, 0, w, h);
  return { brightness: brightnessOf(ctx, w, h), sharpness: sharpnessOf(ctx, w, h) };
}

export function ScanCamera({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<MediaPipeFaceDetector | null>(null);
  const liveRef = useRef({ faceSeen: false, wr: 0, centered: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<Status>("loading");
  const [hint, setHint] = useState("Place ton visage dans le cadre, bien éclairé.");
  const [reasons, setReasons] = useState<string[]>([]);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startCamera() {
    setStatus("loading");
    if (!navigator.mediaDevices?.getUserMedia) { setStatus("error"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus("live");
    } catch {
      setStatus("error");
    }
  }

  // Démarrage caméra + détecteur (une fois)
  useEffect(() => {
    let cancelled = false;
    void startCamera();
    (async () => {
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
      } catch { /* fallback : QC sans visage, basée lumière/netteté */ }
    })();
    return () => { cancelled = true; stopStream(); };
  }, []);

  // Boucle de feedback (n'auto-capture PAS — guide seulement)
  useEffect(() => {
    if (status !== "live") return;
    const id = window.setInterval(() => {
      const video = videoRef.current;
      const detector = detectorRef.current;
      if (!video || video.readyState < video.HAVE_ENOUGH_DATA || !detector) return;
      try {
        const det = detector.detectForVideo(video, performance.now()).detections[0];
        if (!det?.boundingBox) {
          liveRef.current = { faceSeen: false, wr: 0, centered: false };
          setHint("On ne voit pas ton visage — mets-toi face caméra.");
          return;
        }
        const b = det.boundingBox;
        const vw = video.videoWidth || 1, vh = video.videoHeight || 1;
        const wr = b.width / vw;
        const cx = (b.originX + b.width / 2) / vw, cy = (b.originY + b.height / 2) / vh;
        const centered = Math.abs(cx - 0.5) < 0.16 && Math.abs(cy - 0.48) < 0.18;
        liveRef.current = { faceSeen: true, wr, centered };
        if (wr < 0.26) setHint("Rapproche-toi un peu.");
        else if (wr > 0.62) setHint("Recule légèrement.");
        else if (!centered) setHint("Centre ton visage dans l'ovale.");
        else setHint("Parfait — tu peux lancer ton scan.");
      } catch { /* ignore */ }
    }, 320);
    return () => window.clearInterval(id);
  }, [status]);

  function runCapture() {
    const video = videoRef.current;
    if (!video) return;
    setStatus("checking");
    const w = video.videoWidth || 720, h = video.videoHeight || 960;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setStatus("live"); return; }
    ctx.translate(w, 0); ctx.scale(-1, 1); // miroir selfie
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    const { brightness, sharpness } = sampleMetrics(video, w, h);
    const live = liveRef.current;
    const r: string[] = [];
    if (detectorRef.current && !live.faceSeen) r.push("Aucun visage détecté");
    if (detectorRef.current && live.faceSeen && live.wr < MIN_FACE_WR) r.push("Visage trop petit — rapproche-toi");
    if (brightness < MIN_BRIGHT) r.push("Lumière insuffisante");
    if (sharpness < MIN_SHARP) r.push("Photo floue — tiens le téléphone stable");

    if (r.length) { stopStream(); setReasons(r); setStatus("rejected"); return; }
    stopStream();
    onCapture(dataUrl);
  }

  async function handleGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStatus("checking");
    const dataUrl = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = () => res(String(reader.result));
      reader.readAsDataURL(file);
    });
    const img = new Image();
    await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); img.src = dataUrl; });
    const iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
    const { brightness, sharpness } = sampleMetrics(img, iw, ih);

    // Détection visage one-shot (mode IMAGE) sur l'import.
    let faceOk = true, faceWr = 1;
    try {
      const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const d = await FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "IMAGE",
        minDetectionConfidence: 0.45,
      });
      const det = d.detect(img).detections[0];
      faceOk = !!det?.boundingBox;
      faceWr = det?.boundingBox ? det.boundingBox.width / iw : 0;
      d.close();
    } catch { faceOk = true; /* si MediaPipe indispo, on ne bloque pas sur le visage */ }

    const r: string[] = [];
    if (!faceOk) r.push("Aucun visage détecté sur la photo");
    else if (faceWr < MIN_FACE_WR) r.push("Visage trop petit sur la photo");
    if (brightness < MIN_BRIGHT) r.push("Photo trop sombre");
    if (sharpness < MIN_SHARP) r.push("Photo floue");

    if (r.length) { setReasons(r); setStatus("rejected"); return; }
    stopStream();
    onCapture(dataUrl);
  }

  // ── ÉCRAN REJET ────────────────────────────────
  if (status === "rejected") {
    return (
      <div className="mt-7 flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 className="font-display mt-4 text-xl font-bold text-white">Photo pas assez nette</h2>
        <p className="mt-2 max-w-xs text-[0.9rem] leading-relaxed text-white/55">Pour une analyse fiable, on a besoin d&apos;une bonne photo :</p>
        <ul className="mt-3 space-y-1.5 text-[0.9rem] text-white/70">
          {reasons.map((x) => (
            <li key={x} className="flex items-center justify-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" />{x}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => { setReasons([]); void startCamera(); }}
          style={{ WebkitTapHighlightColor: "transparent" }}
          className="mt-7 flex h-12 w-full max-w-[300px] items-center justify-center rounded-lg bg-accent text-[0.95rem] font-extrabold text-white shadow-cta"
        >
          Reprendre une photo
        </button>
      </div>
    );
  }

  // ── ÉCRAN PRÉPARATION / LIVE ───────────────────
  return (
    <div className="mt-7 flex flex-col items-center">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGallery} />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black" style={{ width: "min(300px, 100%)", aspectRatio: "3 / 4" }}>
        {status === "error" ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-[0.95rem] font-semibold text-white">Caméra indisponible</p>
            <p className="text-[0.82rem] leading-relaxed text-white/55">Autorise la caméra, ou importe une photo depuis ta galerie.</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(62% 58% at 50% 46%, transparent 60%, rgba(0,0,0,.55))" }} />
            <div className="pointer-events-none absolute rounded-[50%] border-2 border-dashed border-white/45" style={{ left: "50%", top: "48%", width: "62%", height: "68%", transform: "translate(-50%,-50%)" }} />
            {[["left-4 top-4", "border-l-2 border-t-2"], ["right-4 top-4", "border-r-2 border-t-2"], ["left-4 bottom-4", "border-l-2 border-b-2"], ["right-4 bottom-4", "border-r-2 border-b-2"]].map(([pos, b], i) => (
              <span key={i} className={`pointer-events-none absolute h-6 w-6 rounded-[3px] border-white/50 ${pos} ${b}`} />
            ))}
            {(status === "loading" || status === "checking") && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-emerald-300" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Consigne courte */}
      {status !== "error" && (
        <p className="mt-4 h-5 text-center text-[0.9rem] font-medium text-white/70">{status === "checking" ? "Vérification de la photo…" : hint}</p>
      )}

      {/* Actions */}
      <div className="mt-5 flex w-full max-w-[300px] flex-col items-center gap-3">
        {status !== "error" ? (
          <button
            type="button"
            onClick={runCapture}
            disabled={status !== "live"}
            style={{ WebkitTapHighlightColor: "transparent" }}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-accent text-base font-extrabold text-white shadow-cta transition active:scale-[0.98] disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M3 9V7a2 2 0 0 1 2-2h2M17 5h2a2 2 0 0 1 2 2v2M21 15v2a2 2 0 0 1-2 2h-2M7 19H5a2 2 0 0 1-2-2v-2" strokeLinecap="round" /><circle cx="12" cy="12" r="3" /></svg>
            Lancer mon scan
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{ WebkitTapHighlightColor: "transparent" }}
          className="select-none appearance-none border-0 bg-transparent text-[0.85rem] font-medium text-white/55 underline-offset-4 outline-none transition hover:text-white/80 hover:underline focus:outline-none"
        >
          Importer une photo
        </button>
      </div>
    </div>
  );
}
