"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rulesApi } from "@/lib/api";

import type { RatingRule } from "@/types";
import { X } from "lucide-react";

interface RuleFormModalProps {
  indicatorSlug: string;
  rule: RatingRule | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RuleFormModal({ indicatorSlug, rule, isOpen, onClose }: RuleFormModalProps) {
  const queryClient = useQueryClient();
  const [minDiff, setMinDiff] = useState<string>("");
  const [maxDiff, setMaxDiff] = useState<string>("");
  const [rating, setRating] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (rule) {
      setMinDiff(rule.min_diff !== null ? String(rule.min_diff) : "");
      setMaxDiff(rule.max_diff !== null ? String(rule.max_diff) : "");
      setRating(String(rule.rating));
      setNotes(""); // Reset notes per edit
    } else {
      setMinDiff("");
      setMaxDiff("");
      setRating("0");
      setNotes("");
    }
  }, [rule, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: object) => {
      if (rule) {
        return await rulesApi.update(indicatorSlug, rule.id, data);
      } else {
        return await rulesApi.create(indicatorSlug, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules", indicatorSlug] });
      handleClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      min_diff: minDiff === "" ? null : parseFloat(minDiff),
      max_diff: maxDiff === "" ? null : parseFloat(maxDiff),
      rating: parseInt(rating, 10),
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
        id="rule-form-modal"
        className="w-full max-w-md bg-surface border border-border-glass rounded-card shadow-2xl p-6 relative"
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
          type="button"
        >
          <X size={20} />
        </button>

        <h2 className="font-clash text-xl font-bold mb-6">
          {rule ? "Edit Rating Rule" : "Add Rating Rule"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-sfpro font-medium text-text-muted mb-1.5">
                Min Difference
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full bg-void border border-border-glass rounded-panel px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan transition-colors"
                placeholder="-Infinity"
                value={minDiff}
                onChange={(e) => setMinDiff(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-sfpro font-medium text-text-muted mb-1.5">
                Max Difference
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full bg-void border border-border-glass rounded-panel px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan transition-colors"
                placeholder="+Infinity"
                value={maxDiff}
                onChange={(e) => setMaxDiff(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-sfpro font-medium text-text-muted mb-1.5">
              Rating Value (-10 to +10)
            </label>
            <input
              type="number"
              required
              min="-10"
              max="10"
              className="w-full bg-void border border-border-glass rounded-panel px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan transition-colors"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-sfpro font-medium text-text-muted mb-1.5">
              Version Notes
            </label>
            <input
              type="text"
              className="w-full bg-void border border-border-glass rounded-panel px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan transition-colors"
              placeholder="Reason for change..."
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
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving..." : "Save Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
