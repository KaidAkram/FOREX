"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { macroDataApi } from "@/lib/api";

import { X } from "lucide-react";

interface CellEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  countryIso: string;
  countryName: string;
  indicatorSlug: string;
  indicatorName: string;
  monthStr: string; // "YYYY-MM"
  currentValue: number | null;
}

export function CellEditModal({
  isOpen,
  onClose,
  countryIso,
  countryName,
  indicatorSlug,
  indicatorName,
  monthStr,
  currentValue,
}: CellEditModalProps) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setValue(currentValue !== null ? String(currentValue) : "");
      setNotes("");
    }
  }, [isOpen, currentValue]);

  const mutation = useMutation({
    mutationFn: async (data: object) => {
      return await macroDataApi.manualEntry(data);
    },
    onSuccess: () => {
      // Invalidate both matrix and final score since data changed
      queryClient.invalidateQueries({ queryKey: ["macroMatrix", indicatorSlug] });
      queryClient.invalidateQueries({ queryKey: ["scoreMatrix"] });
      handleClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === "") return;

    mutation.mutate({
      country_iso: countryIso,
      indicator_slug: indicatorSlug,
      month: `${monthStr}-01`, // API expects full date (first of month)
      value: parseFloat(value),
      notes: notes,
    });
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        id="cell-edit-modal"
        className="w-full max-w-md bg-surface border border-border-glass rounded-card shadow-2xl p-6 relative"
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
          type="button"
        >
          <X size={20} />
        </button>

        <h2 className="font-clash text-xl font-bold mb-1">
          Manual Data Override
        </h2>
        <p className="text-sm font-poppins text-text-muted mb-6">
          {countryName} &middot; {indicatorName} &middot; {monthStr}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-sfpro font-medium text-text-muted mb-1.5">
              New Value
            </label>
            <input
              type="number"
              step="0.01"
              required
              className="w-full bg-void border border-border-glass rounded-panel px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan transition-colors"
              placeholder="0.00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-sfpro font-medium text-text-muted mb-1.5">
              Override Notes
            </label>
            <input
              type="text"
              className="w-full bg-void border border-border-glass rounded-panel px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan transition-colors"
              placeholder="Source or reason..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={handleClose}
              className="btn-ghost"
              disabled={mutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={mutation.isPending || value === ""}
            >
              {mutation.isPending ? "Saving..." : "Save Override"}
            </button>
          </div>

          {mutation.isError && (
            <div className="mt-2 text-xs font-poppins text-coral">
              {(mutation.error as Error).message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
