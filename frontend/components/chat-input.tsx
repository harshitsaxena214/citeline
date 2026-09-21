"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  disabled: boolean;
  isPending: boolean;
  value?: string;
}

export function ChatInput({ onSendMessage, disabled, isPending, value = "" }: ChatInputProps) {
  const [text, setText] = useState(value);
  const maxLength = 1000;

  // Sync initial value if changed from outside (e.g. clicking a suggested question)
  if (value && text !== value && text === "") {
    setText(value);
  }

  const handleSend = () => {
    if (text.trim() && !disabled && !isPending && text.length <= maxLength) {
      onSendMessage(text.trim());
      setText("");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask a question about the selected documents..."
          className="min-h-[60px] pr-12 resize-none"
          maxLength={maxLength}
          disabled={isPending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          size="icon"
          className="absolute bottom-2 right-2 h-8 w-8"
          disabled={!text.trim() || disabled || isPending || text.length > maxLength}
          onClick={handleSend}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex justify-end">
        <span
          className={`text-xs ${
            text.length >= maxLength - 50 ? "text-red-500" : "text-muted-foreground"
          }`}
        >
          {text.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
