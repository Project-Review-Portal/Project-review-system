import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DocumentEditor } from '@onlyoffice/document-editor-react';

// Update this if you run OnlyOffice Document Server elsewhere
const DOC_SERVER_URL = 'http://localhost:8080';

const CoordinatorLetterLiveEditor = () => {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const editorRef = useRef(null);

  // Load list of templates from public/templates/templates.json
  useEffect(() => {
    fetch('/templates/templates.json')
      .then(res => res.json())
      .then(data => setTemplates(data.templates || []))
      .catch(() => setTemplates([]));
  }, []);

  const onSelectTemplate = (e) => {
    const id = e.target.value;
    setSelected(id);
    const t = templates.find(x => x.id === id);
    setDocUrl(t ? t.file : '');
  };

  const getEditorConfig = useCallback(() => {
    if (!docUrl) return null;
    const fileName = (docUrl.split('/').pop() || 'document.docx');

    return {
      document: {
        fileType: 'docx',
        key: `${fileName}-${Date.now()}`,
        title: fileName,
        url: `${docUrl}` // public URL (served by CRA/Vite dev/prod)
      },
      editorConfig: {
        mode: 'edit',
        lang: 'en',
        customization: {
          chat: false,
          toolbarNoTabs: false,
          hideRightMenu: false
        }
      },
      permissions: {
        edit: true,
        download: true,
        print: true
      },
      height: '80vh',
      width: '100%',
      type: 'desktop'
    };
  }, [docUrl]);

  const onEditorLoad = (instance) => {
    // OnlyOffice injects a global API; the React wrapper passes the instance
    editorRef.current = instance;
  };

  const handleDownload = () => {
    if (editorRef.current) {
      // Trigger client-side download as .docx
      editorRef.current.downloadAs('docx');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h1 className="text-2xl font-bold mb-4">Letter Generation (Live Editor)</h1>
        <div className="flex flex-wrap items-center gap-3">
          <label className="font-medium">Select Template</label>
          <select
            className="border rounded p-2"
            value={selected}
            onChange={onSelectTemplate}
          >
            <option value="">-- Select --</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={handleDownload}
            disabled={!docUrl}
            className={`px-4 py-2 rounded ${docUrl ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
          >
            Download (.docx)
          </button>
        </div>
      </div>

      {docUrl && getEditorConfig() && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <DocumentEditor
            id="onlyoffice-editor"
            documentServerUrl={`${DOC_SERVER_URL}/`}
            config={getEditorConfig()}
            onLoad={onEditorLoad}
          />
        </div>
      )}
    </div>
  );
};

export default CoordinatorLetterLiveEditor;
