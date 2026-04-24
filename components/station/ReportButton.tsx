"use client";

import { useState } from "react";
import type { ReportType } from "@/types";
import { REPORT_TYPE_LABELS } from "@/types";
import { cn } from "@/lib/utils/cn";

interface ReportButtonProps {
  stationUniId: string;
  stationName: string;
}

type SubmitState = "idle" | "loading" | "success" | "error";

export default function ReportButton({ stationUniId, stationName }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [comment, setComment] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(true);
    setSelectedType(null);
    setComment("");
    setSubmitState("idle");
    setErrorMsg("");
  }

  function handleClose(e?: React.MouseEvent) {
    e?.stopPropagation();
    setOpen(false);
  }

  async function handleSubmit(e: React.MouseEvent) {
    e.stopPropagation();
    if (!selectedType) return;
    setSubmitState("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/stations/${stationUniId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType, comment: comment.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "제출 실패");
        setSubmitState("error");
      } else {
        setSubmitState("success");
      }
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다.");
      setSubmitState("error");
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-1.5 rounded-full hover:bg-[#FFF3F2] transition-colors"
        aria-label="제보하기"
      >
        <svg className="w-4 h-4 text-[#C8C2B4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v13H3zM8 21h8M12 16v5" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl overflow-y-auto max-h-[70dvh] sm:max-h-[none]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-6 space-y-4">
              {/* 헤더 */}
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#0E0E12]">제보하기</h2>
                <button onClick={handleClose} className="p-1 text-[#C8C2B4] hover:text-[#3A3A44]">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-[#3A3A44]">
                <span className="font-semibold">{stationName}</span>에 대해 제보할 내용을 선택해주세요.
              </p>

              {submitState === "success" ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-2xl">✅</p>
                  <p className="text-sm font-semibold text-[#0E0E12]">제보가 접수되었습니다.</p>
                  <p className="text-xs text-[#3A3A44]">운영자 검토 후 반영됩니다. 감사합니다!</p>
                  <button onClick={handleClose} className="mt-3 text-xs text-[#2046E5] underline">
                    닫기
                  </button>
                </div>
              ) : (
                <>
                  {/* 유형 선택 */}
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(REPORT_TYPE_LABELS) as [ReportType, string][]).map(([type, label]) => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={cn(
                          "py-2.5 rounded-xl text-sm font-semibold border transition-all",
                          selectedType === type
                            ? "border-[#2046E5] bg-[#EEF1FF] text-[#2046E5]"
                            : "border-[#E8E3D8] text-[#3A3A44] hover:border-[#C8C2B4]"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* 선택적 코멘트 */}
                  <div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value.slice(0, 200))}
                      placeholder="추가 내용 (선택, 최대 200자)"
                      rows={2}
                      className="w-full rounded-xl border border-[#E8E3D8] px-3 py-2.5 text-sm text-[#0E0E12] placeholder:text-[#C8C2B4] resize-none focus:outline-none focus:border-[#2046E5]"
                    />
                    <p className="text-right text-[10px] text-[#C8C2B4] mt-0.5">{comment.length}/200</p>
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-500">{errorMsg}</p>
                  )}

                  <p className="text-center text-[10px] text-[#C8C2B4] leading-relaxed">
                    허위 제보를 방지하고 정보 신뢰도 제고를 위해<br />운영자 확인 후 반영됩니다.
                  </p>
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedType || submitState === "loading"}
                    className={cn(
                      "w-full py-3 rounded-xl text-sm font-bold transition-all",
                      selectedType && submitState !== "loading"
                        ? "bg-[#2046E5] text-white hover:bg-[#1538CC]"
                        : "bg-[#E8E3D8] text-[#C8C2B4] cursor-not-allowed"
                    )}
                  >
                    {submitState === "loading" ? "제출 중..." : "제보 제출"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
