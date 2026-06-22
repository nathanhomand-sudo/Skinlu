"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/components/ui/cn";

/* QuestionPrompt — logique reprise du composant fourni (single/multi/text,
   custom, nav, skip, submit) mais restylé en premium Skinlu (dark/teal,
   cartes, badges lettres). Une seule question affichée à la fois. */

const QUESTION_CUSTOM_ID = "__custom__";
const optionBadge = (idx: number) => String.fromCharCode(65 + idx);

export type QuestionOption = { id: string; label: string; description?: string };
export type QuestionConfig = {
  kind: "single" | "multi" | "text";
  title: string;
  description?: string;
  options?: QuestionOption[];
  allowCustom?: boolean;
  customPlaceholder?: string;
  minSelections?: number;
  maxSelections?: number;
  placeholder?: string;
};
export type QuestionAnswer = {
  kind: "single" | "multi" | "text" | "skip";
  selectedIds?: string[];
  text?: string;
};

type Props = {
  questions: QuestionConfig[];
  questionIndex?: number;
  totalQuestions?: number;
  onPreviousQuestion?: () => void;
  initialAnswer?: QuestionAnswer;
  submitLabel?: string;
  nextLabel?: string;
  onSubmit: (answer: QuestionAnswer) => void;
};

export function QuestionPrompt({
  questions,
  questionIndex = 1,
  totalQuestions,
  onPreviousQuestion,
  submitLabel = "Voir mon analyse",
  nextLabel = "Continuer",
  initialAnswer,
  onSubmit,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");
  const [textValue, setTextValue] = useState("");
  const resolvedTotal = totalQuestions ?? questions.length;
  const clampedIndex = Math.max(1, Math.min(questionIndex, resolvedTotal));
  const activeQuestion = questions[clampedIndex - 1];
  const customEnabled = activeQuestion?.allowCustom ?? false;
  const isLastQuestion = clampedIndex >= resolvedTotal;
  const primaryLabel = isLastQuestion ? submitLabel : nextLabel;

  useEffect(() => {
    if (!initialAnswer || initialAnswer.kind === "skip") {
      setSelectedIds([]); setCustomText(""); setTextValue(""); return;
    }
    if (activeQuestion?.kind === "text") {
      setSelectedIds([]); setCustomText(""); setTextValue(initialAnswer.text ?? ""); return;
    }
    const next = new Set(initialAnswer.selectedIds ?? []);
    const nextCustom = initialAnswer.text ?? "";
    if (customEnabled && nextCustom.trim().length > 0) next.add(QUESTION_CUSTOM_ID);
    setSelectedIds(Array.from(next)); setCustomText(nextCustom); setTextValue("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedIndex]);

  const canSubmit = useMemo(() => {
    if (activeQuestion?.kind === "text") return textValue.trim().length > 0;
    const nonCustom = selectedIds.filter((id) => id !== QUESTION_CUSTOM_ID).length;
    const hasCustom = customText.trim().length > 0;
    const total = nonCustom + (hasCustom ? 1 : 0);
    if (activeQuestion?.kind === "single") return total === 1;
    const min = activeQuestion?.minSelections ?? 1;
    const max = activeQuestion?.maxSelections;
    if (total < min) return false;
    if (typeof max === "number" && total > max) return false;
    return total > 0;
  }, [activeQuestion, selectedIds, customText, textValue]);

  const toggleMulti = (id: string) =>
    setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const handleSingle = (id: string) => setSelectedIds([id]);

  const handleCustom = (v: string) => {
    setCustomText(v);
    if (!activeQuestion) return;
    if (activeQuestion.kind === "single") {
      setSelectedIds(v.trim() ? [QUESTION_CUSTOM_ID] : []); return;
    }
    setSelectedIds((p) => {
      const has = p.includes(QUESTION_CUSTOM_ID);
      if (v.trim() && !has) return [...p, QUESTION_CUSTOM_ID];
      if (!v.trim() && has) return p.filter((id) => id !== QUESTION_CUSTOM_ID);
      return p;
    });
  };

  const handleSubmit = () => {
    if (!canSubmit || !activeQuestion) return;
    if (activeQuestion.kind === "text") { onSubmit({ kind: "text", text: textValue.trim() }); return; }
    onSubmit({
      kind: activeQuestion.kind,
      selectedIds: selectedIds.filter((id) => id !== QUESTION_CUSTOM_ID),
      text: customText.trim() || undefined,
    });
  };

  if (!activeQuestion) return null;

  return (
    <div className="flex flex-1 flex-col">
      {/* Titre + options en haut (sous la barre), pas centrés */}
      <div className="pt-7">
        <h2 className="font-display text-[clamp(1.5rem,5vw,2rem)] font-bold leading-tight text-white">
          {activeQuestion.title}
        </h2>
        {activeQuestion.kind === "multi" && (
          <p className="mt-2 text-[0.85rem] text-white/45">Plusieurs choix possibles</p>
        )}

        {activeQuestion.kind !== "text" && (activeQuestion.options?.length ?? 0) > 0 && (
          <div className="mt-6 grid gap-2.5">
            {activeQuestion.options!.map((option, idx) => {
              const checked = selectedIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => (activeQuestion.kind === "single" ? handleSingle(option.id) : toggleMulti(option.id))}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                  className={cn(
                    "flex w-full select-none items-center gap-3.5 rounded-2xl border px-4 py-4 text-left outline-none transition focus:outline-none",
                    checked
                      ? "border-emerald-400/50 bg-emerald-400/[0.08]"
                      : "border-white/[0.08] bg-white/[0.03] active:bg-white/[0.06]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition",
                      checked ? "border-emerald-400 bg-emerald-400 text-[#06231f]" : "border-white/15 bg-white/[0.04] text-white/45",
                    )}
                  >
                    {optionBadge(idx)}
                  </span>
                  <span className="text-[0.98rem] font-medium text-white/90">
                    {option.label}
                    {option.description && <span className="text-white/45"> {option.description}</span>}
                  </span>
                </button>
              );
            })}

            {customEnabled && (
              <div className="flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold", selectedIds.includes(QUESTION_CUSTOM_ID) ? "border-emerald-400 bg-emerald-400 text-[#06231f]" : "border-white/15 bg-white/[0.04] text-white/45")}>
                  {optionBadge(activeQuestion.options!.length)}
                </span>
                <input
                  value={customText}
                  onChange={(e) => handleCustom(e.target.value)}
                  placeholder={activeQuestion.customPlaceholder ?? "Autre…"}
                  className="w-full bg-transparent text-[0.98rem] text-white outline-none placeholder:text-white/35"
                />
              </div>
            )}
          </div>
        )}

        {activeQuestion.kind === "text" && (
          <textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder={activeQuestion.placeholder ?? "Ta réponse…"}
            rows={3}
            className="mt-6 w-full resize-y rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[0.98rem] text-white outline-none placeholder:text-white/35 focus:border-white/20"
          />
        )}
      </div>

      {/* Continuer — collé en bas */}
      <div className="mt-auto shrink-0 pt-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex h-14 w-full items-center justify-center rounded-lg bg-accent text-base font-extrabold text-white shadow-cta transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {primaryLabel}
        </button>
        {onPreviousQuestion && (
          <button type="button" onClick={onPreviousQuestion} style={{ WebkitTapHighlightColor: "transparent" }} className="mt-3 block w-full select-none appearance-none border-0 bg-transparent text-center text-[0.82rem] font-medium text-white/50 outline-none transition hover:text-white/80 focus:outline-none">
            Retour
          </button>
        )}
      </div>
    </div>
  );
}
