"use client";

import { useEffect, useRef } from "react";
import { Message, MessageProps } from "./message";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatWindowProps {
  messages: MessageProps[];
  isPending: boolean;
}

export function ChatWindow({ messages, isPending }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or pending state changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isPending]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pr-4 custom-scrollbar" ref={scrollRef}>
      <div className="flex flex-col pb-4">
        {messages.length === 0 && !isPending && (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center text-muted-foreground px-4">
            <p className="mb-2 font-medium text-foreground">Welcome to Citeline</p>
            <p className="text-sm">Select up to two documents and ask a question to get started.</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <Message key={i} {...msg} />
        ))}
        
        {isPending && (
          <div className="flex justify-start mb-6">
            <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm w-[60%]">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-4 rounded-full" />
                <span className="text-sm text-muted-foreground ml-2">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
