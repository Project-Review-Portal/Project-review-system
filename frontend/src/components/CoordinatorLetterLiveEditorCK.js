import React, { useEffect, useState } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import * as mammoth from 'mammoth';
import htmlDocx from 'html-docx-js/dist/html-docx';
import { saveAs } from 'file-saver';

const CoordinatorLetterLiveEditorCK = () => {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState('');
  const [editorData, setEditorData] = useState('<p>Select a template to start editing...</p>');
  const [fileNameBase, setFileNameBase] = useState('document');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load templates manifest
  useEffect(() => {
    fetch('/templates/templates.json')
      .then(r => r.json())
      .then(d => setTemplates(d.templates || []))
      .catch(() => setTemplates([]));
  }, []);

  const loadTemplate = async (fileUrl, baseName) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(fileUrl);
      const arrayBuffer = await res.arrayBuffer();
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer }, {
        styleMap: [
          // Add any custom style mappings if needed
        ],
        convertImage: mammoth.images.inline(function(element) {
          return element.read('base64').then(function(imageBuffer) {
            return { src: 'data:' + element.contentType + ';base64,' + imageBuffer };
          });
        })
      });
      // Normalize manual page breaks coming from the template (if present)
      // Mammoth emits inline styles like page-break-before: always for manual breaks.
      const normalized = (html || '<p></p>')
        .replace(/page-break-before\s*:\s*always/gi, 'page-break-before: always')
        .replace(/<p[^>]*>\s*<br[^>]*style=["']?page-break-before\s*:\s*always;?["']?\s*\/?>(\s*)<\/p>/gi,
          '<div class="page-break"></div>')
        .replace(/<br[^>]*style=["']?page-break-before\s*:\s*always;?["']?\s*\/?>(\s*)/gi,
          '<div class="page-break"></div>');

      setEditorData(normalized);
      setFileNameBase(baseName || 'document');
    } catch (e) {
      setError('Failed to load template.');
    } finally {
      setLoading(false);
    }
  };

  const onSelectTemplate = async (e) => {
    const id = e.target.value;
    setSelected(id);
    const t = templates.find(x => x.id === id);
    if (t?.file) {
      const base = (t.file.split('/').pop() || 'document.docx').replace(/\.docx$/i, '');
      await loadTemplate(t.file, base);
    } else {
      setEditorData('<p>Select a template to start editing...</p>');
    }
  };

  const handleDownload = () => {
    try {
      // Wrap content in a minimal HTML document and enforce table borders so they are visible in exported .docx
      const html = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            /* Page setup to better preserve pagination similar to template */
            @page { size: A4; margin: 1in; }
            body { font-family: "Times New Roman", serif; line-height: 1.15; }
            p { margin: 0 0 8pt; }
            h1, h2, h3 { page-break-after: avoid; }
            .page-break { page-break-before: always; }
            /* Avoid breaking inside key blocks */
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            td, th { page-break-inside: avoid; }
            /* Ensure tables render with visible borders in the generated DOCX */
            table { border-collapse: collapse; width: 100%; border: 1px solid #000; }
            th, td { border: 1px solid #000; padding: 6px; }
          </style>
        </head>
        <body>${editorData}</body>
      </html>`;
      const blob = htmlDocx.asBlob(html, { orientation: 'portrait' });
      saveAs(blob, `${fileNameBase}_edited.docx`);
    } catch (e) {
      setError('Failed to export .docx');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h1 className="text-2xl font-bold mb-4">Letter Generation (CKEditor, No Docker)</h1>
        {error && <div className="mb-3 p-2 bg-red-100 text-red-700 rounded">{error}</div>}
        <div className="flex flex-wrap items-center gap-3">
          <label className="font-medium">Select Template</label>
          <select className="border rounded p-2" value={selected} onChange={onSelectTemplate} disabled={loading}>
            <option value="">-- Select --</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={handleDownload}
            className={`px-4 py-2 rounded ${editorData ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
            disabled={!editorData || loading}
          >
            Download (.docx)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-3">
        {loading ? (
          <div className="p-4">Loading template...</div>
        ) : (
          <CKEditor
            editor={ClassicEditor}
            data={editorData}
            onChange={(evt, editor) => setEditorData(editor.getData())}
            config={{
              toolbar: [
                'undo','redo','|','heading','|','bold','italic','underline','strikethrough','|',
                'bulletedList','numberedList','|','link','blockQuote','insertTable','imageUpload','|','alignment:left','alignment:center','alignment:right','alignment:justify'
              ],
              table: {
                contentToolbar: [ 'tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties' ]
              },
              image: {
                toolbar: [ 'imageTextAlternative', 'imageStyle:full', 'imageStyle:side' ]
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CoordinatorLetterLiveEditorCK;
