import React from 'react';
import { useSearchParams } from 'react-router-dom';
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";
import { Download, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFileUrl } from '@/services/api';

const DocumentViewer = () => {
  const [searchParams] = useSearchParams();
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8 text-center">
        <div className="p-4 bg-muted/50 rounded-full mb-4">
          <FileText className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No Document Provided</h2>
        <p className="text-muted-foreground max-w-sm mb-6">We couldn't find a valid URL for document preview.</p>
        <Button onClick={() => window.close()}>Close Window</Button>
      </div>
    );
  }

  const fileUrl = getFileUrl(rawUrl);
  const fileType = fileUrl.split('?')[0].split('.').pop()?.toLowerCase();
  const docs = [{ uri: fileUrl, fileType: fileType }];
  const isDoc = fileUrl.toLowerCase().match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i);
  const isLocalHost = fileUrl.includes('localhost') || fileUrl.includes('127.0.0.1');

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Premium Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-card shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/5 rounded-lg text-primary">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight">Document Preview</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{fileType} file</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-9 gap-2 text-xs font-semibold rounded-xl border-border/80 shadow-sm hover:bg-muted/50 transition-colors">
            <a href={fileUrl} download target="_blank" rel="noopener noreferrer">
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              Download
            </a>
          </Button>
        </div>
      </header>
      
      {isDoc && isLocalHost && (
        <div className="bg-amber-50/80 border-b border-amber-200 text-amber-900 px-6 py-3 text-xs shrink-0 flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-semibold">Local Environment Notice:</span> The Microsoft Office viewer requires a public URL to render documents. Since you are running locally (127.0.0.1), the preview cannot be generated. Please use the <strong>Download</strong> button above to view the file.
        </div>
      )}
      
      <main className="flex-1 overflow-hidden relative bg-muted/30">
        <div className="absolute inset-0 doc-viewer-wrapper">
          <DocViewer
            pluginRenderers={DocViewerRenderers}
            documents={docs}
            style={{ width: '100%', height: '100%' }}
            config={{
              header: {
                disableHeader: true,
                disableFileName: true,
                retainURLParams: false
              }
            }}
          />
        </div>
      </main>
    </div>
  );
};

export default DocumentViewer;
