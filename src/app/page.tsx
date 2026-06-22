"use client";

/* eslint-disable @next/next/no-img-element */

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import NextImage from "next/image";
import type { User } from "@supabase/supabase-js";
import type { Product } from "@/lib/matching";
import type { Concern } from "@/lib/skin-diagnostic";
import type { SkinType } from "@/lib/visual-age";
import { getSupabaseBrowser } from "@/lib/supabase-client";
import AuthGate from "@/components/AuthGate";
import ProfileMenu from "@/components/ProfileMenu";
import SkinScanCabin, { type SkinScanCabinHandle } from "@/components/SkinScanCabin";
import { Hero } from "@/components/landing/Hero";
import { track } from "@/lib/track";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ANALYSIS_TIMEOUT_MS = 70_000;
const DIAGNOSTIC_STORAGE_KEY = "skinlu:last-diagnostic";
const DEBUG_CALLOUTS = false;
const ANNOT_PADDING = 60; // px each side for label columns
const LABEL_MIN_GAP = 30; // px minimum vertical gap between labels on the same side

const MP_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MP_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";

const CONCERN_LABELS: Record<Concern, string> = {
  acne: "Imperfections",
  dehydration: "Déshydratation possible",
  dark_spots: "Taches",
  aging: "Signes de l'âge",
  sensitivity: "Sensibilité",
  dullness: "Teint terne",
  enlarged_pores: "Pores visibles",
};

const CALLOUT_LABELS: Record<Concern, string> = {
  acne: "Imperfections",
  dehydration: "Sécheresse",
  dark_spots: "Taches",
  aging: "Signes d'âge",
  sensitivity: "Rougeurs",
  dullness: "Teint terne",
  enlarged_pores: "Pores visibles",
};

// Short labels for margin annotations (must fit in ~60px column)
const ANNOT_LABELS: Record<Concern, string> = {
  acne: "Acné",
  dehydration: "Déshydr.",
  dark_spots: "Taches",
  aging: "Signes âge",
  sensitivity: "Rougeurs",
  dullness: "Terne",
  enlarged_pores: "Pores",
};

const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  dry: "sèche",
  oily: "grasse",
  combination: "mixte",
  sensitive: "sensible",
  normal: "équilibrée",
};

const PROFILE_QUESTIONS = [
  {
    key: "tight_after_cleansing",
    question: "Après nettoyage, ta peau tire ?",
    options: ["Souvent", "Parfois", "Rarement"],
  },
  {
    key: "shine_area",
    question: "En journée, tu brilles surtout où ?",
    options: ["Zone T", "Partout", "Presque pas"],
  },
  {
    key: "reacts_to_products",
    question: "Ta peau réagit facilement aux nouveaux produits ?",
    options: ["Oui", "Parfois", "Non"],
  },
] as const;

type SkinProfileKey = (typeof PROFILE_QUESTIONS)[number]["key"];
type SkinProfileAnswers = Partial<Record<SkinProfileKey, string>>;

const LOADING_STEPS = [
  "Visage détecté",
  "Analyse des zones visibles",
  "Lecture des signaux cutanés",
  "Création de ton profil peau",
];

type FaceBbox = {
  originX: number;
  originY: number;
  width: number;
  height: number;
  imgWidth: number;
  imgHeight: number;
};

type CalloutPositions = {
  forehead: { top: string; left: string };
  t_zone:   { top: string; left: string };
  cheeks:   { top: string; left: string };
};

type DebugBboxStyle = {
  left: string;
  top: string;
  width: string;
  height: string;
};

type FaceLayout = {
  objectPosition: string;
  callouts: CalloutPositions;
  debugBbox: DebugBboxStyle;
  cropFront: string;
  cropTzone: string;
};

type AnnotSvgItem = {
  zoneName: string;
  concern: Concern | null;
  side: "left" | "right";
  dotX: number;    // px in wrapper SVG coordinate space
  dotY: number;
  lineEndX: number; // where the line meets the label column
  labelY: number;  // label vertical center, px
};

type DiagnosticZone = {
  observation: string;
  concern: Concern | null;
};

type DiagnosticPreview = {
  session_token: string;
  skin_type: SkinType;
  concerns: Concern[];
  top_priority: Concern;
  summary: string;
  disclaimer: string;
  zones?: {
    forehead: DiagnosticZone;
    cheeks: DiagnosticZone;
    t_zone: DiagnosticZone;
    texture: DiagnosticZone;
  } | null;
  confidence?: number | null;
  confidence_reason?: string | null;
  skin_priority?: string | null;
  derma_flag?: boolean;
};

type RoutineReport = {
  skin_type: SkinType;
  concerns: Concern[];
  top_priority: Concern;
  morning: Product[];
  evening: Product[];
  ai_explanation: string;
  disclaimer: string;
};

function getStoredDiagnostic() {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as DiagnosticPreview;
  } catch {
    window.localStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);
    return null;
  }
}


function validateFile(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type))
    return "Format invalide. Utilisez une photo JPG, PNG ou WebP.";
  if (file.size > MAX_FILE_SIZE)
    return "Fichier trop lourd. La taille maximale est de 4 MB.";
  return null;
}

function concernLabel(concern: Concern) {
  return CONCERN_LABELS[concern] ?? concern;
}

function skinTypeLabel(skinType: SkinType) {
  return SKIN_TYPE_LABELS[skinType] ?? skinType;
}

function priorityLabel(concern: Concern) {
  if (concern === "dehydration") return "Signes visibles de déshydratation possible";
  return `Signe visible : ${concernLabel(concern).toLowerCase()}`;
}

function routineFocusLabel(concern: Concern) {
  const labels: Record<Concern, string> = {
    acne: "Calmer les imperfections sans agresser",
    dehydration: "Renforcer l'hydratation sans empiler",
    dark_spots: "Éclaircir progressivement les marques",
    aging: "Protéger et lisser avec constance",
    sensitivity: "Réduire les irritants potentiels",
    dullness: "Relancer l'éclat sans surcharger",
    enlarged_pores: "Alléger la routine et lisser la texture",
  };
  return labels[concern];
}

function calloutLabel(concern: Concern | null): string {
  if (!concern) return "Aucun signe";
  return CALLOUT_LABELS[concern];
}

function annotLabel(concern: Concern | null): string {
  if (!concern) return "Aucun";
  return ANNOT_LABELS[concern] ?? CALLOUT_LABELS[concern];
}

function computeAnnotations(
  layout: FaceLayout,
  zones: NonNullable<DiagnosticPreview["zones"]>,
  photoEl: HTMLDivElement,
): AnnotSvgItem[] {
  const W = photoEl.offsetWidth;
  const H = photoEl.offsetHeight;
  const PAD = ANNOT_PADDING;

  const toItem = (
    dotLeft: string, dotTop: string,
    side: "left" | "right",
    concern: Concern | null,
    zoneName: string,
  ): AnnotSvgItem => {
    const dotX = PAD + parseFloat(dotLeft) / 100 * W;
    const dotY = parseFloat(dotTop) / 100 * H;
    return {
      zoneName, concern, side, dotX, dotY,
      lineEndX: side === "left" ? PAD - 3 : PAD + W + 3,
      labelY: dotY,
    };
  };

  const items: AnnotSvgItem[] = [];

  // Skip forehead if it duplicates t_zone concern
  if (zones.forehead.concern !== zones.t_zone.concern) {
    items.push(toItem(layout.callouts.forehead.left, layout.callouts.forehead.top, "right", zones.forehead.concern, "Front"));
  }
  items.push(toItem(layout.callouts.t_zone.left, layout.callouts.t_zone.top, "left", zones.t_zone.concern, "Zone T"));
  items.push(toItem(layout.callouts.cheeks.left, layout.callouts.cheeks.top, "right", zones.cheeks.concern, "Joues"));

  // Vertical collision avoidance per side
  (["left", "right"] as const).forEach(side => {
    const sideItems = items.filter(i => i.side === side).sort((a, b) => a.labelY - b.labelY);
    for (let i = 1; i < sideItems.length; i++) {
      const overlap = LABEL_MIN_GAP - (sideItems[i].labelY - sideItems[i - 1].labelY);
      if (overlap > 0) {
        sideItems[i - 1].labelY = Math.max(14, sideItems[i - 1].labelY - overlap / 2);
        sideItems[i].labelY = Math.min(H - 14, sideItems[i].labelY + overlap / 2);
      }
    }
  });

  return items;
}

function shortSummary(summary: string) {
  const first = (summary.split(/(?<=[.!?])\s+/)[0] ?? summary).trim();
  if (first.length <= 78) return first;
  // Prefer a natural comma break
  const commaIdx = first.indexOf(',');
  if (commaIdx >= 28 && commaIdx <= 72) return `${first.slice(0, commaIdx)}…`;
  // Fall back to last word boundary before 72 chars
  const cut = first.slice(0, 72);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 28 ? lastSpace : 72).trimEnd()}…`;
}

function isBboxValid(bbox: FaceBbox): boolean {
  if (bbox.width / bbox.imgWidth < 0.08 || bbox.height / bbox.imgHeight < 0.08) return false;
  if (bbox.originX < -10 || bbox.originY < -10) return false;
  if (bbox.originX + bbox.width > bbox.imgWidth + 10) return false;
  if (bbox.originY + bbox.height > bbox.imgHeight + 10) return false;
  return true;
}

function computeFaceLayout(bbox: FaceBbox, container: HTMLDivElement): FaceLayout {
  const { originX, originY, width, height, imgWidth, imgHeight } = bbox;
  const cx = originX + width / 2;
  const cy = originY + height / 2;
  const contW = container.offsetWidth;
  const contH = container.offsetHeight;
  const scale = Math.max(contW / imgWidth, contH / imgHeight);
  const overflowX = Math.max(0, imgWidth * scale - contW);
  const overflowY = Math.max(0, imgHeight * scale - contH);

  // Center crop slightly above face center so forehead has breathing room
  const anchorY = originY + height * 0.40;
  const hiddenLeft = Math.max(0, Math.min(overflowX, cx * scale - contW / 2));
  const hiddenTop  = Math.max(0, Math.min(overflowY, anchorY * scale - contH / 2));
  const pctX = overflowX > 0 ? hiddenLeft / overflowX * 100 : 50;
  const pctY = overflowY > 0 ? hiddenTop  / overflowY * 100 : 50;
  const objectPosition = `${pctX.toFixed(1)}% ${pctY.toFixed(1)}%`;

  if (DEBUG_CALLOUTS) {
    console.log("[Skinlu Debug] computeFaceLayout", {
      img: `${imgWidth}×${imgHeight}`,
      container: `${contW}×${contH}`,
      faceCenter: `cx=${cx.toFixed(0)}, cy=${cy.toFixed(0)}`,
      scale: scale.toFixed(4),
      hiddenLeft: hiddenLeft.toFixed(1),
      hiddenTop: hiddenTop.toFixed(1),
      objectPosition,
    });
  }

  const clamp = (v: number) => Math.max(4, Math.min(94, v));
  const pos = (ix: number, iy: number) => ({
    left: `${clamp((ix * scale - hiddenLeft) / contW * 100).toFixed(1)}%`,
    top:  `${clamp((iy * scale - hiddenTop)  / contH * 100).toFixed(1)}%`,
  });

  const callouts: CalloutPositions = {
    // Fractions relative to MediaPipe bbox: top=0%, chin=100%
    // forehead: left-of-center dot, bubble extends RIGHT (avoids overlap with t_zone)
    forehead: pos(originX + width * 0.40, originY + height * 0.18),
    // t_zone: center dot, bubble extends LEFT — nose tip area
    t_zone:   pos(originX + width * 0.50, originY + height * 0.46),
    // cheeks: right-of-center dot, bubble extends RIGHT
    cheeks:   pos(originX + width * 0.74, originY + height * 0.48),
  };

  if (DEBUG_CALLOUTS) console.log("[Skinlu Debug] callout positions", callouts);

  const debugBbox: DebugBboxStyle = {
    left:   `${((originX * scale - hiddenLeft) / contW * 100).toFixed(1)}%`,
    top:    `${((originY * scale - hiddenTop)  / contH * 100).toFixed(1)}%`,
    width:  `${(width * scale / contW * 100).toFixed(1)}%`,
    height: `${(height * scale / contH * 100).toFixed(1)}%`,
  };

  // Mini-crop object-position: center on the face zone within that crop container
  const cxPct = (cx / imgWidth * 100).toFixed(1);
  const cropFront = `${cxPct}% ${((originY + height * 0.18) / imgHeight * 100).toFixed(1)}%`;
  const cropTzone = `${cxPct}% ${((originY + height * 0.46) / imgHeight * 100).toFixed(1)}%`;

  return { objectPosition, callouts, debugBbox, cropFront, cropTzone };
}

async function getImageQualityWarning(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

    const sampleSize = 72;
    const canvas = document.createElement("canvas");
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(image, 0, 0, sampleSize, sampleSize);
    const { data } = context.getImageData(0, 0, sampleSize, sampleSize);
    let brightness = 0;
    let min = 255;
    let max = 0;

    for (let i = 0; i < data.length; i += 4) {
      const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      brightness += luminance;
      min = Math.min(min, luminance);
      max = Math.max(max, luminance);
    }

    const average = brightness / (data.length / 4);
    const contrast = max - min;

    if (average < 42) {
      return "Photo trop sombre. Reprends-la face à une fenêtre pour obtenir une analyse plus utile.";
    }
    if (contrast < 18) {
      return "Photo peu lisible. Utilise une image plus nette, visage dégagé et lumière uniforme.";
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ProductList({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <p className="empty-routine">
        Aucun produit disponible pour l&apos;instant. Ajoutez le catalogue
        produits dans Supabase pour activer les recommandations.
      </p>
    );
  }
  return (
    <div className="routine-products">
      {products.map((product) => (
        <article className="product-card" key={product.id}>
          {product.image_url ? (
            <img src={product.image_url} alt="" className="product-image" />
          ) : null}
          <div>
            <span>{product.brand}</span>
            <strong>{product.name}</strong>
            <small>
              {product.price_eur
                ? `${product.price_eur.toFixed(2)} EUR`
                : "Prix à vérifier"}
            </small>
          </div>
          <a href={product.affiliate_url} target="_blank" rel="noreferrer">
            Voir le produit
          </a>
        </article>
      ))}
    </div>
  );
}

/* ── Phone mockup réaliste ────────────────────────────────────── */
function PhoneMockup() {
  return (
    <div className="phone-mockup">
      <div className="phone-island" />
      <div className="phone-screen">
        <div className="pms-topbar">
          <span>Skinlu</span>
          <b>Scan</b>
        </div>
        <div className="pms-priority">
          <small>Priorité cosmétique indicative</small>
          <strong>Signes de déshydratation possible</strong>
        </div>
        <div className="pms-metrics">
          <div><span>Type probable</span><b>Mixte</b></div>
          <div><span>Pores visibles</span><b>Oui</b></div>
          <div><span>Sensibilité</span><b>À confirmer</b></div>
        </div>
        <div className="pms-routine">
          <span>Routine proposée</span>
          <strong>Cleanser · Sérum · SPF</strong>
        </div>
      </div>
    </div>
  );
}

/* ── Carousel 3D cylinder ─────────────────────────────────────── */
function PhotoCarousel() {
  const baseImages = [
    "/faces/face-01.png",
    "/faces/face-02.png",
    "/faces/face-03.png",
  ];
  // 6 slots: duplicate for a full cylinder
  const faces = [...baseImages, ...baseImages];
  const n = faces.length; // 6
  const angleStep = 360 / n; // 60°
  const radius = 260; // px

  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => s + 1), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="carousel-3d" aria-hidden="true">
      <div
        className="carousel-cylinder"
        style={{ transform: `rotateY(${-step * angleStep}deg)` }}
      >
        {faces.map((src, i) => (
          <div
            key={i}
            className="carousel-card"
            style={{ transform: `rotateY(${i * angleStep}deg) translateZ(${radius}px)` }}
          >
            <NextImage src={src} alt="" width={280} height={420} sizes="280px" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "14px" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function UrgencyCounter() {
  const count = useMemo(() => {
    // Deterministic: grows ~8/day from the 1st of the current month — same for all users the same day
    const dayOfMonth = new Date().getDate();
    return 180 + dayOfMonth * 8;
  }, []);
  return (
    <p className="urgency-line">
      <span className="urgency-dot" />
      {count} scans lancés ce mois-ci
    </p>
  );
}

export default function Home() {
  const scanEntryTracked = useRef(false);
  const scanCabinRef = useRef<SkinScanCabinHandle>(null);
  const annotatedSelfieRef = useRef<HTMLDivElement>(null);
  const imageDetectorRef = useRef<import("@mediapipe/tasks-vision").FaceDetector | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [faceBbox, setFaceBbox] = useState<FaceBbox | null>(null);
  const [faceLayout, setFaceLayout] = useState<FaceLayout | null>(null);
  const [annotations, setAnnotations] = useState<AnnotSvgItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skinProfile, setSkinProfile] = useState<SkinProfileAnswers>({});
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticPreview | null>(
    getStoredDiagnostic,
  );
  const [routine, setRoutine] = useState<RoutineReport | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [signUpModalOpen, setSignUpModalOpen] = useState(false);

  // Cleanup IMAGE-mode detector on unmount
  useEffect(() => () => { imageDetectorRef.current?.close(); }, []);

  useEffect(() => {
    if (!faceBbox || !isBboxValid(faceBbox) || !annotatedSelfieRef.current) {
      setFaceLayout(null);
      setAnnotations(null);
      return;
    }
    const photoEl = annotatedSelfieRef.current;
    const layout = computeFaceLayout(faceBbox, photoEl);
    setFaceLayout(layout);
    setAnnotations(diagnostic?.zones ? computeAnnotations(layout, diagnostic.zones, photoEl) : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceBbox, diagnostic]);

  useEffect(() => { track("landing_view"); }, []);

  useEffect(() => {
    if (diagnostic) {
      track("free_preview_viewed");
      track("paywall_viewed");
    }
  }, [diagnostic]);

  useEffect(() => {
    const scanSection = document.getElementById("diagnostic");
    if (!scanSection) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || scanEntryTracked.current) return;
        scanEntryTracked.current = true;
        track("scan_entry");
      },
      { threshold: 0.35 },
    );

    observer.observe(scanSection);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Lock body scroll while AI is analysing
  useEffect(() => {
    if (loading) {
      document.body.style.overflow = 'hidden';
      const intervalId = window.setInterval(() => {
        setLoadingStep((step) => Math.min(step + 1, LOADING_STEPS.length - 1));
      }, 2400);
      return () => {
        window.clearInterval(intervalId);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [loading]);

  useEffect(() => {
    const revealElements = document.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    revealElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function clearPaidState() { setRoutine(null); }

  function handleHeroCta() {
    track("hero_cta_click");
    if (diagnostic) {
      document.getElementById("diagnostic")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!user) {
      setSignUpModalOpen(true);
      return;
    }
    setScanModalOpen(true);
  }

  function updateSkinProfile(key: SkinProfileKey, value: string) {
    setSkinProfile((current) => ({ ...current, [key]: value }));
  }

  async function detectFaceInImage(dataUrl: string) {
    try {
      if (!imageDetectorRef.current) {
        const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(MP_WASM_URL);
        imageDetectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MP_MODEL_URL },
          runningMode: "IMAGE",
          minDetectionConfidence: 0.45,
        });
      }
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = dataUrl;
      });

      if (DEBUG_CALLOUTS) {
        console.log("[Skinlu Debug] image loaded", {
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        });
        if (img.naturalWidth > img.naturalHeight) {
          console.warn("[Skinlu Debug] ⚠ Image is LANDSCAPE — possible EXIF orientation mismatch. Bbox coordinates may be in rotated pixel space.");
        }
      }

      const result = imageDetectorRef.current.detect(img);
      const box = result.detections[0]?.boundingBox;

      if (DEBUG_CALLOUTS) {
        console.log("[Skinlu Debug] MediaPipe detections:", result.detections.length);
        if (box) {
          console.log("[Skinlu Debug] bbox raw", {
            originX: box.originX,
            originY: box.originY,
            width: box.width,
            height: box.height,
          });
          console.log("[Skinlu Debug] bbox normalized", {
            x: (box.originX / img.naturalWidth).toFixed(3),
            y: (box.originY / img.naturalHeight).toFixed(3),
            w: (box.width / img.naturalWidth).toFixed(3),
            h: (box.height / img.naturalHeight).toFixed(3),
          });
        } else {
          console.log("[Skinlu Debug] No face detected by MediaPipe");
        }
      }

      if (box) {
        setFaceBbox({
          originX: box.originX,
          originY: box.originY,
          width: box.width,
          height: box.height,
          imgWidth: img.naturalWidth,
          imgHeight: img.naturalHeight,
        });
      }
    } catch {
      // Detection failed silently
    }
  }

  async function handleSelfieSelected(file: File | null) {
    if (!file) { setSelfie(null); setPreviewUrl(null); setFaceBbox(null); setFaceLayout(null); setAnnotations(null); return; }
    const qualityWarning = await getImageQualityWarning(file);
    if (qualityWarning) {
      setSelfie(null); setPreviewUrl(null); setFaceBbox(null); setFaceLayout(null); setAnnotations(null);
      setError(qualityWarning);
      setScanModalOpen(false);
      return;
    }
    setScanModalOpen(false);
    setError(null); setDiagnostic(null); clearPaidState();
    setFaceBbox(null); setFaceLayout(null); setAnnotations(null);
    window.localStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);
    setSelfie(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string ?? null;
      setPreviewUrl(url);
      if (url) void detectFaceInImage(url);
    };
    reader.readAsDataURL(file);
    void runAnalysis(file);
  }

  useEffect(() => {
    if (!scanModalOpen) return;
    const id = window.setTimeout(() => scanCabinRef.current?.openCamera(), 120);
    return () => window.clearTimeout(id);
  }, [scanModalOpen]);

  async function runAnalysis(file: File) {
    const validationError = validateFile(file);
    if (validationError) { setError(validationError); return; }

    const body = new FormData();
    body.append("selfie", file);
    if (Object.keys(skinProfile).length > 0) {
      body.append("skin_profile", JSON.stringify(skinProfile));
    }

    setLoadingStep(0);
    setLoading(true); setError(null); setDiagnostic(null); clearPaidState();
    track("analysis_started");

    let analysisTracked = false;
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);
      const response = await fetch("/api/skin-context", { method: "POST", body, signal: controller.signal });
      window.clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        track("analysis_error", { error_type: data.error ?? "api_error" });
        analysisTracked = true;
        throw new Error(
          data.error === "no_face_detected"
            ? "Aucun visage détecté. Prends un selfie bien cadré, visage visible et bien éclairé."
            : data.error === "service_timeout"
            ? "L'analyse prend trop de temps. Réessaie avec une photo plus nette."
            : data.error ?? "L'analyse n'a pas pu démarrer.",
        );
      }
      setDiagnostic(data as DiagnosticPreview);
      window.localStorage.setItem(DIAGNOSTIC_STORAGE_KEY, JSON.stringify({ ...data, scanned_at: new Date().toISOString() }));
      track("analysis_success", { skin_type: data.skin_type, top_priority: data.top_priority });
      window.setTimeout(() => {
        document.getElementById("diagnostic")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      analysisTracked = true;
    } catch (caughtError) {
      if (!analysisTracked) {
        track("analysis_error", {
          error_type: caughtError instanceof DOMException && caughtError.name === "AbortError"
            ? "timeout"
            : "network",
        });
      }
      setError(
        caughtError instanceof DOMException && caughtError.name === "AbortError"
          ? "L'analyse prend trop de temps. Réessayez avec un selfie net et bien cadré."
          : caughtError instanceof Error ? caughtError.message : "Une erreur inattendue est survenue.",
      );
    } finally { setLoading(false); }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  async function startCheckout() {
    if (!diagnostic) { setError("Analyse manquante pour ouvrir Stripe Checkout."); return; }
    track("checkout_clicked");
    setCheckoutLoading(true); setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: diagnostic.session_token, email: user?.email ?? undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Stripe Checkout indisponible.");
      track("checkout_started");
      window.location.href = data.url;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Stripe Checkout indisponible.");
      setCheckoutLoading(false);
    }
  }

  const unlockReport = useCallback(async (sessionToken: string) => {
    setReportLoading(true); setError(null);
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error === "report_locked"
            ? "Paiement en cours de validation. Rechargez dans quelques secondes."
            : data.error ?? "Routine verrouillée.",
        );
      }
      setRoutine(data as RoutineReport);
      track("premium_unlocked");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Routine verrouillée.");
    } finally { setReportLoading(false); }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionToken = params.get("session_token");
    if (params.get("payment") === "success" && sessionToken) {
      window.setTimeout(() => void unlockReport(sessionToken), 0);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [unlockReport]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          const stored = window.localStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
          if (stored) {
            try {
              const diag = JSON.parse(stored) as DiagnosticPreview;
              await fetch("/api/auth/link", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ sessionToken: diag.session_token }),
              });
            } catch { /* non-fatal */ }
          }
          const postAction = window.localStorage.getItem("skinlu:post-auth-action");
          if (postAction === "scan") {
            window.localStorage.removeItem("skinlu:post-auth-action");
            if (!window.localStorage.getItem(DIAGNOSTIC_STORAGE_KEY)) {
              setSignUpModalOpen(false);
              setScanModalOpen(true);
            }
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="skinlu-dark">

      {/* ── SCAN MODAL ───────────────────────────────────────────── */}
      {scanModalOpen && (
        <div className="scan-modal" role="dialog" aria-modal="true" aria-label="Skinlu AI Scan">
          <div className="scan-modal-header">
            <div className="scan-modal-identity">
              <span className="scan-modal-logo">Skinlu</span>
              <span className="scan-modal-badge">AI Scan</span>
            </div>
            <button
              className="scan-modal-close"
              type="button"
              onClick={() => setScanModalOpen(false)}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
          <p className="scan-modal-tagline">Positionne ton visage. L&apos;analyse IA Skinlu fait le reste.</p>
          <div className="scan-modal-inner">
            <SkinScanCabin
              ref={scanCabinRef}
              onSelfieSelected={handleSelfieSelected}
              onError={(msg) => { setError(msg); setScanModalOpen(false); }}
              previewUrl={null}
              disabled={loading}
            />
          </div>
        </div>
      )}

      {/* ── SIGN-UP MODAL ────────────────────────────────────────── */}
      {signUpModalOpen && (
        <div className="sign-up-modal" role="dialog" aria-modal="true" aria-label="Créer un compte Skinlu">
          <div className="sum-backdrop" onClick={() => setSignUpModalOpen(false)} />
          <div className="sum-card">
            <div className="scan-modal-header">
              <div className="scan-modal-identity">
                <span className="scan-modal-logo">Skinlu</span>
                <span className="scan-modal-badge">Gratuit</span>
              </div>
              <button
                className="scan-modal-close"
                type="button"
                onClick={() => setSignUpModalOpen(false)}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <div className="sum-body">
              <h2 className="sum-title">Ton scan gratuit t&apos;attend.</h2>
              <p className="sum-sub">Un compte. Un scan. Aucune carte demandée.</p>
              <AuthGate />
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYSIS OVERLAY (full-screen, locks scroll) ─────────── */}
      {loading && (
        <div className="analysis-overlay" role="status" aria-live="polite" aria-label="Analyse en cours">
          {previewUrl && (
            <>
              <img src={previewUrl} alt="" className="ao-photo-bg" aria-hidden="true" />
              <div className="ao-photo-tint" aria-hidden="true" />
            </>
          )}
          <div className="analysis-overlay-inner">
            <span className="ao-logo">Skinlu</span>
            <div className="ao-scan-card" aria-hidden="true">
              <div className="ao-face-oval" />
              <div className="ao-scan-line" />
              <div className="ao-halo" />
              <div className="ao-corner ao-corner--tl" />
              <div className="ao-corner ao-corner--tr" />
              <div className="ao-corner ao-corner--bl" />
              <div className="ao-corner ao-corner--br" />
              <div className="ao-scan-glow" />
            </div>
            <p className="ao-label">{LOADING_STEPS[loadingStep]}</p>
            <div className="ao-progress-wrap">
              <div
                className="ao-progress-fill"
                style={{ width: `${18 + loadingStep * 27}%` }}
              />
            </div>
            <div className="ao-step-list">
              {LOADING_STEPS.map((step, index) => (
                <span
                  className={
                    index < loadingStep
                      ? "is-done"
                      : index === loadingStep
                        ? "is-active"
                        : ""
                  }
                  key={step}
                >
                  {step}
                </span>
              ))}
            </div>
            <p className="ao-sub">Analyse IA Skinlu · Cosmétique indicative</p>
          </div>
        </div>
      )}

      {/* ── SITE NAV ─────────────────────────────────────────────── */}
      <header className="site-nav">
        <div className="container site-nav-inner">
          <a href="/" className="site-nav-logo">Skinlu</a>
          {user && (
            <ProfileMenu user={user} hasDiagnostic={!!diagnostic} />
          )}
        </div>
      </header>

      {/* ── 1. HERO ──────────────────────────────────────────────── */}
      {/* Rendered outside .site-shell on purpose: GSAP's ScrollTrigger
          pin spacer breaks inside that flex column container (confirmed
          via isolated test) and releases the pin early. */}
      <Hero
        ctaLabel={diagnostic ? "Voir mon analyse" : "Scanner ma peau gratuitement"}
        onScanClick={handleHeroCta}
      />

      <main className={`site-shell ${diagnostic ? "has-result" : ""}`}>

      {/* ── 3. PHONE DEMO ────────────────────────────────────────── */}
      <section id="comment-ca-marche" className="phone-demo-section">
        <div className="container">
          <div className="phone-demo-layout">
            <div className="phone-demo-copy reveal">
              <span className="eyebrow">Comment ça marche</span>
              <h2>Tu arrêtes de choisir dans le bruit.</h2>
              <div className="phone-demo-steps">
                <div className="demo-step">
                  <b>01</b>
                  <span>Fais ton scan</span>
                </div>
                <div className="demo-step">
                  <b>02</b>
                  <span>Skinlu lit les signes visibles</span>
                </div>
                <div className="demo-step">
                  <b>03</b>
                  <span>Tu obtiens une routine claire</span>
                </div>
              </div>
              <button type="button" className="hero-cta" onClick={handleHeroCta}>
                Faire mon scan gratuit
              </button>
            </div>
            <div className="phone-demo-frame reveal reveal-delay-1">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. PHOTO REEL + AVIS ─────────────────────────────────── */}
      <section className="arc-section">
        <div className="container">
          <div className="section-heading section-heading--center reveal">
            <span className="eyebrow">Le problème</span>
            <h2>Ce n&apos;est pas toujours ta peau. C&apos;est souvent la routine copiée au hasard.</h2>
          </div>
        </div>

        <PhotoCarousel />

        {/* Cartes avis séparées */}
        <div className="container">
          <div className="testimonials-grid reveal">
            <div className="testimonial-card">
              <p>&ldquo;J&apos;ai arrêté d&apos;empiler des produits juste parce qu&apos;ils passaient sur TikTok.&rdquo;</p>
              <span>Léa, 27 ans</span>
            </div>
            <div className="testimonial-card">
              <p>&ldquo;Enfin une routine qui dit quoi faire sans bullshit.&rdquo;</p>
              <span>Camille, 31 ans</span>
            </div>
            <div className="testimonial-card">
              <p>&ldquo;Je vois ce qui est utile avant de sortir la CB.&rdquo;</p>
              <span>Inès, 24 ans</span>
            </div>
          </div>
          <blockquote className="arc-pullquote reveal reveal-delay-2">
            &ldquo;Les réseaux te montrent des produits. Skinlu t&apos;aide à arrêter de choisir dans le bruit.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* ── 5. SPLIT : TEXTE + PHONE ─────────────────────────────── */}
      <section className="split-section">
        <div className="container split-container">
          <div className="split-copy reveal">
            <span className="eyebrow">Aperçu gratuit</span>
            <h2>Tu vois déjà ce qui mérite ton attention.</h2>
            <ul className="split-benefits">
              <li>Type de peau probable.</li>
              <li>Préoccupations visibles.</li>
              <li>Aperçu de routine, sans compte.</li>
            </ul>
            <button type="button" className="hero-cta" onClick={handleHeroCta}>
              {diagnostic ? "Voir mon analyse" : "Scanner ma peau gratuitement"}
            </button>
          </div>
          <div className="split-phone reveal reveal-delay-1">
            <NextImage src="/skinlu-hero-lifestyle.png" alt="" width={420} height={560} sizes="(max-width: 768px) 100vw, 420px" style={{ width: "100%", height: "auto", maxWidth: "420px", borderRadius: "18px" }} />
          </div>
        </div>
      </section>

      {/* ── COMPARATIF ───────────────────────────────────────────── */}
      <section className="compare-section">
        <div className="container">
          <div className="section-heading section-heading--center reveal">
            <span className="eyebrow">Ce que tu débloques</span>
            <h2>Une routine exploitable, pas une liste de produits au hasard.</h2>
          </div>
          <div className="compare-table reveal">
            <div className="compare-col compare-col--muted">
              <h3>Gratuit</h3>
              <ul>
                <li className="compare-yes">Type de peau probable</li>
                <li className="compare-yes">Signes visibles</li>
                <li className="compare-yes">Priorité principale</li>
                <li className="compare-yes">Aperçu de routine</li>
              </ul>
            </div>
            <div className="compare-col compare-col--hero">
              <h3>Routine complète</h3>
              <ul>
                <li className="compare-yes">Routine matin/soir</li>
                <li className="compare-yes">Ordre d&apos;application</li>
                <li className="compare-yes">Produits adaptés</li>
                <li className="compare-yes">Erreurs à éviter</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. STATS FULL-BLEED ──────────────────────────────────── */}
      <section className="stats-section">
        <div className="container stats-inner">
          <div className="stats-big">
            <div className="stats-number reveal">3 200</div>
            <p className="stats-label reveal reveal-delay-1">scans lancés</p>
          </div>
          <p className="stats-sub reveal reveal-delay-2">
            Skinlu = la fin du skincare au hasard.
          </p>
          <div className="brand-marquee reveal reveal-delay-3">
            <div className="brand-marquee-track">
              <span>CeraVe</span>
              <span>La Roche-Posay</span>
              <span>Vichy</span>
              <span>Avène</span>
              <span>The Ordinary</span>
              <span>Bioderma</span>
              <span>CeraVe</span>
              <span>La Roche-Posay</span>
              <span>Vichy</span>
              <span>Avène</span>
              <span>The Ordinary</span>
              <span>Bioderma</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. CONVERSION ────────────────────────────────────────── */}
      <section className="conversion-section" id="diagnostic" aria-label="Scan Skinlu">
        <div className="container">
          <div className="conversion-inner">
            <div className="conversion-sticky">
              <div className="section-heading">
                <span className="eyebrow">Scan gratuit</span>
                <h2>Analyse ta peau. Gratuit, en 30 secondes.</h2>
              </div>
            </div>
            <div>
              <div className="upload-panel">
                <div className="panel-heading">
                  <span>Cabine de scan</span>
                </div>
                <form onSubmit={handleSubmit} className="upload-form">
                  {previewUrl ? (
                    <div className="selfie-retake">
                      <img src={previewUrl} alt="Ton selfie" className="selfie-retake-img" />
                      <button
                        type="button"
                        className="selfie-retake-btn"
                        onClick={() => setScanModalOpen(true)}
                        disabled={loading}
                      >
                        Refaire mon scan
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="scan-cabin-cta"
                      onClick={() => setScanModalOpen(true)}
                      disabled={loading}
                    >
                      Scanner ma peau
                    </button>
                  )}
                  <p className="upload-reassurance">
                    Analyse cosmétique indicative. Ne remplace pas l&apos;avis d&apos;un professionnel de santé.
                  </p>
                  {error ? <p className="form-error">{error}</p> : null}
                  <UrgencyCounter />
                </form>


                {diagnostic ? (
                  <div className="result-panel" role="status" aria-live="polite">

                    {/* ── 1. PHOTO ANNOTÉE ── */}
                    {previewUrl && faceBbox && isBboxValid(faceBbox) ? (
                      <div className="debrief-photo-wrap">
                        <div className="face-annot-wrap">
                          {/* Photo */}
                          <div className="annotated-selfie" ref={annotatedSelfieRef}>
                            <img
                              src={previewUrl}
                              alt="Ta peau analysée"
                              className="annotated-selfie-img"
                              style={faceLayout ? { objectPosition: faceLayout.objectPosition } : undefined}
                            />
                          </div>

                          {/* SVG: dots + connecting lines */}
                          {annotations ? (
                            <svg className="annot-svg" aria-hidden="true">
                              {annotations.map((a, i) => (
                                <g key={i}>
                                  <line
                                    x1={a.dotX} y1={a.dotY}
                                    x2={a.lineEndX} y2={a.labelY}
                                    stroke="rgba(255,255,255,0.32)"
                                    strokeWidth={0.75}
                                  />
                                  <circle cx={a.dotX} cy={a.dotY} r={2.5}
                                    fill="rgba(255,255,255,0.92)"
                                    style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))" }}
                                  />
                                </g>
                              ))}
                            </svg>
                          ) : null}

                          {/* Labels in margins */}
                          {annotations ? annotations.map((a, i) => (
                            <div
                              key={i}
                              className={`annot-label annot-label--${a.side}`}
                              style={{ top: a.labelY }}
                              aria-hidden="true"
                            >
                              <span className="annot-label-zone">{a.zoneName}</span>
                              <span className="annot-label-concern">{annotLabel(a.concern)}</span>
                            </div>
                          )) : null}
                        </div>

                        {/* Mini-crops */}
                        {faceLayout && diagnostic.zones ? (
                          <div className="debrief-crops">
                            <div className="zone-crop">
                              <div className="zone-crop-frame">
                                <img src={previewUrl} alt="" className="zone-crop-img"
                                  style={{ objectPosition: faceLayout.cropFront }} />
                              </div>
                              <div className="zone-crop-meta">
                                <span className="zone-crop-name">Front</span>
                                <span className="zone-crop-obs">{calloutLabel(diagnostic.zones.forehead.concern)}</span>
                              </div>
                            </div>
                            <div className="zone-crop">
                              <div className="zone-crop-frame">
                                <img src={previewUrl} alt="" className="zone-crop-img"
                                  style={{ objectPosition: faceLayout.cropTzone }} />
                              </div>
                              <div className="zone-crop-meta">
                                <span className="zone-crop-name">Zone T</span>
                                <span className="zone-crop-obs">{calloutLabel(diagnostic.zones.t_zone.concern)}</span>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : previewUrl ? (
                      <p className="debrief-no-bbox">Photo difficile à recadrer automatiquement.</p>
                    ) : null}

                    {/* ── 2. SUMMARY ───────────────────────────────── */}
                    <p className="debrief-summary">{shortSummary(diagnostic.summary)}</p>

                    {/* ── 3. CARDS ─────────────────────────────────── */}
                    <div className="preview-cards">
                      <article className="preview-card">
                        <span>Type probable</span>
                        <strong>Peau {skinTypeLabel(diagnostic.skin_type)}</strong>
                        <small>Indicatif, signes visibles</small>
                      </article>
                      <article className="preview-card" data-concern={diagnostic.top_priority}>
                        <span>Priorité</span>
                        <strong>{concernLabel(diagnostic.top_priority)}</strong>
                        <small>{priorityLabel(diagnostic.top_priority)}</small>
                      </article>
                      <article className="preview-card preview-card--accent">
                        <span>Direction</span>
                        <strong>{routineFocusLabel(diagnostic.top_priority)}</strong>
                        <small>Routine AM/PM ci-dessous</small>
                      </article>
                    </div>

                    {/* ── 4. ZONES DÉTAIL ──────────────────────────── */}
                    {diagnostic.zones ? (
                      <div className="debrief-zone-list">
                        {(
                          [
                            { key: "forehead" as const, label: "Front" },
                            { key: "cheeks" as const, label: "Joues" },
                            { key: "t_zone" as const, label: "Zone T" },
                            { key: "texture" as const, label: "Texture" },
                          ]
                        ).map(({ key, label }) => {
                          const zones = diagnostic.zones!;
                          const zone = zones[key];
                          return (
                            <div key={key} className="debrief-zone-row">
                              <span className="dzr-name">{label}</span>
                              <span className="dzr-obs">{zone.observation}</span>
                              {zone.concern ? (
                                <span className={`dzr-badge concern-badge concern-badge--${zone.concern}`}>
                                  {calloutLabel(zone.concern)}
                                </span>
                              ) : (
                                <span className="dzr-badge dzr-badge--ok">Aucun signe</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* ── 5. FIABILITÉ ─────────────────────────────── */}
                    {diagnostic.confidence != null ? (
                      <div className="confidence-row">
                        <span className="confidence-label">
                          Fiabilité de l&apos;analyse&nbsp;: <strong>{Math.round(diagnostic.confidence * 100)}&nbsp;%</strong>
                        </span>
                        <div className="confidence-bar-outer" aria-hidden="true">
                          <div
                            className="confidence-bar-inner"
                            style={{ width: `${Math.round(diagnostic.confidence * 100)}%` }}
                          />
                        </div>
                        {diagnostic.confidence < 0.7 && diagnostic.confidence_reason ? (
                          <p className="confidence-reason">{diagnostic.confidence_reason}</p>
                        ) : null}
                      </div>
                    ) : null}
                    {diagnostic.derma_flag ? (
                      <div className="derma-notice" role="note">
                        <span className="derma-notice-icon">⚠</span>
                        <p>Certains signes observés méritent l&apos;avis d&apos;un professionnel de santé.</p>
                      </div>
                    ) : null}

                    {/* ── 6. DISCLAIMER ────────────────────────────── */}
                    <p className="debrief-disclaimer">{diagnostic.disclaimer}</p>

                    {/* ── 7. PAYWALL ───────────────────────────────── */}
                    <div className="routine-blur-teaser" aria-hidden="true">
                      <div className="rbt-rows">
                        <div className="rbt-section-label">Matin</div>
                        <div className="rbt-row"><span className="rbt-num">1</span><span className="rbt-text">Nettoyant doux</span></div>
                        <div className="rbt-row"><span className="rbt-num">2</span><span className="rbt-text">Sérum ciblé</span></div>
                        <div className="rbt-row"><span className="rbt-num">3</span><span className="rbt-text">Hydratant · SPF 50</span></div>
                        <div className="rbt-section-label">Soir</div>
                        <div className="rbt-row"><span className="rbt-num">1</span><span className="rbt-text">Double nettoyage</span></div>
                        <div className="rbt-row"><span className="rbt-num">2</span><span className="rbt-text">Traitement nuit</span></div>
                      </div>
                      <div className="rbt-overlay">
                        <span className="rbt-lock-badge">Plan généré · Verrouillé</span>
                        <span className="rbt-lock-cta">Ton plan est prêt →</span>
                      </div>
                    </div>
                    {user ? (
                      <>
                        <div className="paywall-block">
                          <h3 className="paywall-title">Ta routine sur-mesure est prête.</h3>
                          <p className="paywall-subtitle">On a transformé ton analyse en un plan simple à suivre.</p>
                          <ul className="paywall-deliverables">
                            <li>Quoi appliquer, dans quel ordre</li>
                            <li>Matin et soir, sans se tromper d&apos;étape</li>
                            <li>Des produits adaptés à ta peau et ton budget</li>
                            <li>Les erreurs à éviter pour améliorer tes résultats</li>
                          </ul>
                        </div>
                        <button className="stripe-button" type="button" onClick={startCheckout} disabled={checkoutLoading}>
                          {checkoutLoading ? "Ouverture de Stripe..." : "Débloquer ma routine personnalisée · 9,99 €"}
                        </button>
                        <p className="paywall-anchor">
                          Moins cher qu&apos;un produit acheté au hasard qui ne te sert à rien.
                        </p>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="stripe-button"
                        onClick={() => setSignUpModalOpen(true)}
                      >
                        Se connecter pour débloquer
                      </button>
                    )}
                    {reportLoading ? (
                      <div className="diagnostic-spinner" role="status" aria-live="polite">
                        <div className="spinner-ring" />
                        <p className="spinner-label">Chargement de ta routine…</p>
                      </div>
                    ) : null}
                    {routine ? (
                      <section className="full-report" aria-label="Routine complète">
                        <div className="report-heading">
                          <span>Routine complète</span>
                          <strong>Débloquée</strong>
                        </div>
                        <section className="compatibility-card">
                          <h2>Priorité cosmétique indicative</h2>
                          <p>{priorityLabel(routine.top_priority)}</p>
                        </section>
                        <section className="routine-block">
                          <h2>Matin</h2>
                          <ProductList products={routine.morning} />
                        </section>
                        <section className="routine-block">
                          <h2>Soir</h2>
                          <ProductList products={routine.evening} />
                        </section>
                        <p className="medical-disclaimer">{routine.disclaimer}</p>
                      </section>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. BANNIÈRE IMMERSIVE ────────────────────────────────── */}
      <section className="immersive-section" aria-label="Ambiance Skinlu">
        <div className="immersive-banner reveal">
          <NextImage src="/faces/banner.png" alt="" fill sizes="100vw" style={{ objectFit: "cover" }} aria-hidden="true" />
          <div className="immersive-overlay">
            <div className="container">
              <span className="eyebrow">Anti-bullshit</span>
              <p className="immersive-tagline">
                Deviens plus clean<br />
                sans te perdre dans le skincare bullshit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. FAQ ───────────────────────────────────────────────── */}
      <section className="faq-section">
        <div className="container">
          <div className="faq-inner">
            <div className="faq-heading-sticky">
              <div className="section-heading reveal">
                <span className="eyebrow">Questions fréquentes</span>
                <h2>Avant de lancer ton scan.</h2>
              </div>
            </div>
            <div className="faq-list reveal">
              <details open>
                <summary>Est-ce un résultat médical&nbsp;?</summary>
                <p>Non. C&apos;est une analyse cosmétique indicative des signes visibles. Ça ne remplace pas l&apos;avis d&apos;un professionnel de santé.</p>
              </details>
              <details>
                <summary>Pourquoi faire un scan avant d&apos;acheter&nbsp;?</summary>
                <p>Parce qu&apos;un produit viral peut être bon sans être utile pour toi. Skinlu t&apos;aide à clarifier la priorité avant d&apos;acheter.</p>
              </details>
              <details>
                <summary>Comment les produits sont-ils choisis&nbsp;?</summary>
                <p>La routine s&apos;appuie sur ton type de peau probable, tes préoccupations visibles et le catalogue multi-marques renseigné dans Skinlu.</p>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. FINAL CTA ────────────────────────────────────────── */}
      <section className="final-cta">
        <div className="container">
          <div className="final-cta-inner reveal">
            <span className="eyebrow">Avant ton prochain achat</span>
            <h2>Fais ton scan gratuit.</h2>
            <button type="button" className="hero-cta" onClick={handleHeroCta}>{diagnostic ? "Voir mon analyse" : "Scanner ma peau gratuitement"}</button>
          </div>
        </div>
      </section>

      {/* ── MOBILE STICKY PAYWALL CTA (shown after result, mobile only) ── */}
      {diagnostic && !routine && user && (
        <div className="mobile-paywall-sticky" aria-hidden="true">
          <button className="stripe-button" type="button" onClick={startCheckout} disabled={checkoutLoading}>
            {checkoutLoading ? "Ouverture de Stripe..." : "Débloquer ma routine personnalisée · 9,99 €"}
          </button>
        </div>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="container">
          <div className="site-footer-inner">
            <p>Analyse cosmétique indicative. Ne remplace pas l&apos;avis d&apos;un professionnel de santé.</p>
            <nav aria-label="Liens légaux">
              <a href="/mentions-legales">Mentions légales</a>
              <a href="/politique-de-confidentialite">Politique de confidentialité</a>
            </nav>
          </div>
        </div>
      </footer>

      </main>
    </div>
  );
}
