"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

interface TextExpandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  title: string;
  placeholder?: string;
  /** Use "code" for JS fields with syntax highlighting */
  mode?: "text" | "code";
}

export function TextExpandModal({
  open,
  onOpenChange,
  value,
  onChange,
  title,
  placeholder,
  mode = "text",
}: TextExpandModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Local copy so parent re-renders don't touch the controlled textarea's value
  // (which would reset the cursor position on every keystroke).
  const [localValue, setLocalValue] = useState(value);

  // When the modal opens, sync the latest value from the parent and move cursor to end.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open || mode !== "text") return;
    setLocalValue(value);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
    // Intentionally only [open] — we do NOT want to re-sync while the user is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setLocalValue(e.target.value);
    onChange(e.target.value);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[65vw] max-w-[65vw] sm:max-w-[65vw] bg-[#1a1a1c] border-white/[0.08] text-white p-0 gap-0"
      >
        <DialogHeader className="flex flex-row items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <DialogTitle className="text-[13px] font-semibold text-white/70 uppercase tracking-wider">
            {title}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white/30 hover:text-white/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="p-4">
          {mode === "code" ? (
            <div className="rounded-lg overflow-hidden border border-white/[0.08]">
              <CodeMirror
                value={value}
                onChange={onChange}
                theme={vscodeDark}
                extensions={[javascript()]}
                height="380px"
                placeholder={placeholder}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: true,
                  indentOnInput: true,
                }}
              />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={handleTextChange}
              placeholder={placeholder}
              spellCheck={false}
              rows={18}
              className={cn(
                "w-full bg-[#252527] border border-white/[0.08] rounded-lg",
                "px-3 py-2.5 text-[13px] text-white/90 leading-relaxed resize-none",
                "focus:outline-none focus:border-violet-500/40 placeholder:text-white/20"
              )}
            />
          )}
          <p className="mt-2 text-[10px] text-white/20">
            Esc or click outside to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
