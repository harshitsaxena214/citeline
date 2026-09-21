"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function HowItWorks() {
  return (
    <Dialog>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
        How it works
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>How it works</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-sm text-muted-foreground space-y-4">
          <p>1. Upload and chunk the PDF.</p>
          <p>2. A router picks summarize, Q&A or compare.</p>
          <p>3. Relevant chunks are retrieved and the answer is written.</p>
          <p>4. The answer is checked against the sources.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
