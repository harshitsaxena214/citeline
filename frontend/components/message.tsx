"use client";

import { ChatResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MessageProps {
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
  error?: string;
  onRetry?: () => void;
}

export function Message({ role, content, response, error, onRetry }: MessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] break-words">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  const modeLabels: Record<string, string> = {
    summarize: "Summary",
    qa: "Answer",
    compare: "Comparison",
  };

  return (
    <div className="flex justify-start mb-6">
      <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm max-w-[90%] text-foreground">
        {error ? (
          <div className="flex flex-col gap-3 text-destructive">
            <p className="whitespace-pre-wrap">{error}</p>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry} className="self-start">
                Retry
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="whitespace-pre-wrap">{content}</p>
            
            {response && (
              <div className="flex flex-wrap gap-2 items-center mt-2 pt-2 border-t border-border">
                {response.mode && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {modeLabels[response.mode] || response.mode}
                  </Badge>
                )}
                
                {response.citations?.map((cit, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal bg-background">
                    {cit.document}, p. {cit.page}
                  </Badge>
                ))}
              </div>
            )}

            {response && response.supported === false && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Could not fully verify this against the document.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
