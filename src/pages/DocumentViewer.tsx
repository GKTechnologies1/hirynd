import React from 'react';
import { useSearchParams } from 'react-router-dom';
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFileUrl } from '@/services/api';

const DocumentViewer = () => {
  const [searchParams] = useSearchParams();
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return <div className="p-8 text-center text-muted-foreground">No document URL provided.</div>;
  }

  const fileUrl = getFileUrl(rawUrl);
  const fileType = fileUrl.split('?')[0].split('.').pop()?.toLowerCase();
  const docs = [{ uri: fileUrl, fileType: fileType }];
  const isDoc = fileUrl.toLowerCase().match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i);
  const isLocalHost = fileUrl.includes('localhost') || fileUrl.includes('127.0.0.1');


  return (
    <div className="flex flex-col h-screen w-full bg-background">
      <header className="flex items-center justify-between p-4 border-b shrink-0">
        <h1 className="text-lg font-semibold">Document Preview</h1>
        <Button variant="outline" size="sm" asChild>
          <a href={fileUrl} download target="_blank" rel="noopener noreferrer" className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </a>
        </Button>
      </header>
      
      {isDoc && isLocalHost && (
        <div className="bg-amber-50/50 border-b border-amber-200 text-amber-800 px-4 py-2.5 text-sm shrink-0">
          <span className="font-semibold">Local Environment Notice:</span> The Microsoft Office viewer requires a public URL to render documents. Since you are running locally (127.0.0.1), the preview cannot be generated. Please use the <strong>Download</strong> button above to view the file.
        </div>
      )}
      
      <main className="flex-1 overflow-hidden relative">
        <DocViewer
          pluginRenderers={DocViewerRenderers}
          documents={docs}
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
          config={{
            header: {
              disableHeader: true,
              disableFileName: true,
              retainURLParams: false
            }
          }}
        />
      </main>
    </div>
  );
};

export default DocumentViewer;
