"use client";

import { Document } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DocumentPanelProps {
  documents: Document[];
  selectedDocumentIds: string[];
  onToggleSelection: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  isDeleting: string | null;
}

export function DocumentPanel({
  documents,
  selectedDocumentIds,
  onToggleSelection,
  onDeleteDocument,
  isDeleting,
}: DocumentPanelProps) {
  const atMaxSelection = selectedDocumentIds.length >= 2;

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const isSelected = selectedDocumentIds.includes(doc.id);
        const isDisabled = atMaxSelection && !isSelected;

        return (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 border rounded-lg bg-card text-card-foreground"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <Checkbox
                checked={isSelected}
                disabled={isDisabled}
                onCheckedChange={() => onToggleSelection(doc.id)}
                id={`doc-${doc.id}`}
              />
              <div className="flex flex-col overflow-hidden">
                <label
                  htmlFor={`doc-${doc.id}`}
                  className={`text-sm font-medium leading-none truncate cursor-pointer ${
                    isDisabled ? "text-muted-foreground" : ""
                  }`}
                >
                  {doc.name}
                </label>
                <span className="text-xs text-muted-foreground mt-1">
                  {doc.pages} pages
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              disabled={isDeleting === doc.id}
              onClick={() => onDeleteDocument(doc.id)}
              aria-label={`Delete ${doc.name}`}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
