"use client";

import { useEffect, useState } from "react";
import { DocumentPanel } from "@/components/document-panel";
import { UploadButton } from "@/components/upload-button";
import { ChatWindow } from "@/components/chat-window";
import { ChatInput } from "@/components/chat-input";
import { HowItWorks } from "@/components/how-it-works";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import { health, listDocuments, deleteDocument, chat } from "@/lib/api";
import { getSessionId } from "@/lib/session";
import { Document } from "@/lib/types";
import { MessageProps } from "@/components/message";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const [isWaking, setIsWaking] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [inputText, setInputText] = useState("");

  const MAX_DOCS = 5;

  useEffect(() => {
    getSessionId(); // Ensure session is created
    
    let isMounted = true;
    
    const init = async () => {
      try {
        await health();
        if (!isMounted) return;
        setIsWaking(false);
        fetchDocuments();
      } catch {
        // Will continue to show waking alert if health fails
      }
    };
    
    init();
    return () => { isMounted = false; };
  }, []);

  const fetchDocuments = async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch {
      toast.error("Failed to load documents");
    }
  };

  const handleUploadComplete = async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
      if (docs.length > 0 && selectedDocs.length < 2) {
        // Auto-select the newest doc if we have room
        const newest = docs[0];
        if (!selectedDocs.includes(newest.id)) {
          setSelectedDocs(prev => [...prev, newest.id]);
        }
      }
    } catch {}
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteDocument(id);
      setDocuments(docs => docs.filter(d => d.id !== id));
      setSelectedDocs(selected => selected.filter(sid => sid !== id));
      toast.success("Document deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleDoc = (id: string) => {
    setSelectedDocs(prev => {
      if (prev.includes(id)) return prev.filter(sid => sid !== id);
      if (prev.length >= 2) return prev; // max 2
      return [...prev, id];
    });
  };

  const handleSend = async (text: string) => {
    if (selectedDocs.length === 0) return;
    
    const userMsg: MessageProps = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsPending(true);
    setInputText("");

    try {
      const response = await chat({
        question: text,
        document_ids: selectedDocs
      });
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.answer,
        response
      }]);
    } catch (err: unknown) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "",
        error: err instanceof Error ? err.message : "An error occurred",
        onRetry: () => handleSend(text)
      }]);
    } finally {
      setIsPending(false);
    }
  };

  const loadSamplePdf = async () => {
    try {
      const res = await fetch("/sample.pdf");
      if (!res.ok) throw new Error("Could not fetch sample.pdf");
      const blob = await res.blob();
      const file = new File([blob], "sample.pdf", { type: "application/pdf" });
      
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      
      // We will reuse uploadDocument logic directly here since we can't trigger the input safely with a programmatic File
      const { uploadDocument } = await import("@/lib/api");
      await uploadDocument(file);
      await handleUploadComplete();
      toast.success("Sample PDF uploaded successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load sample");
    }
  };

  const suggestedQuestions = [
    "What is the main topic of this document?",
    "Can you summarize the key findings?",
    "What are the main conclusions drawn?"
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full gap-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Documents</h2>
        {documents.length === 0 ? (
          <div className="text-sm text-muted-foreground space-y-4">
            <p>Citeline allows you to chat with your PDFs securely. Upload a document to get started.</p>
            <Button variant="outline" className="w-full" onClick={loadSamplePdf}>
              Try with a sample PDF
            </Button>
          </div>
        ) : (
          <DocumentPanel
            documents={documents}
            selectedDocumentIds={selectedDocs}
            onToggleSelection={handleToggleDoc}
            onDeleteDocument={handleDelete}
            isDeleting={isDeleting}
          />
        )}
      </div>

      <div className="mt-auto pt-6 border-t border-border">
        {documents.length >= MAX_DOCS ? (
          <div className="text-sm text-muted-foreground text-center mb-2">
            Maximum of {MAX_DOCS} documents reached. Please delete one to upload more.
          </div>
        ) : null}
        <UploadButton
          disabled={documents.length >= MAX_DOCS || isWaking}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-9 w-9">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px]">
              <div className="py-6 h-full">
                <SidebarContent />
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-xl font-bold tracking-tight">Citeline</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <HowItWorks />
        </div>
      </header>

      {isWaking && (
        <div className="p-6 pb-0">
          <Alert>
            <AlertDescription>
              Waking up the server, this can take up to a minute on the free tier.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:block w-80 border-r border-border p-6 overflow-y-auto">
          <SidebarContent />
        </aside>

        <main className="flex-1 flex flex-col min-w-0 min-h-0 p-6 relative">
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col max-w-4xl w-full mx-auto">
            <ChatWindow messages={messages} isPending={isPending} />
            
            {messages.length === 0 && documents.length === 0 && !isPending && (
              <div className="grid grid-cols-1 gap-2 mb-6 max-w-lg mx-auto w-full">
                {suggestedQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="justify-start h-auto py-3 text-sm font-normal whitespace-normal text-left"
                    onClick={() => setInputText(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            )}
            
            <div className="mt-4 shrink-0">
              <ChatInput
                value={inputText}
                onSendMessage={handleSend}
                disabled={selectedDocs.length === 0 || isWaking}
                isPending={isPending}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
