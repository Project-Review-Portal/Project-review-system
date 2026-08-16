import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";

const CoordinatorInstructionTemplate = () => {
  const [instructions, setInstructions] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([null]);
  const [isDragging, setIsDragging] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const fileInputRef = useRef(null);

  // Handle text input updates
  const handleTextChange = (e) => {
    setInstructions(e.target.value);
  };

  // Form submission handling using Axios
  const handleSubmit = async (e) => {
    e.preventDefault();

    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isReadOnly = storedUser.role === 'assistant coordinator';
    if (isReadOnly) {
      alert("Action forbidden in Read-Only Mode.");
      return;
    }

    if (!instructions.trim()) {
      alert("Please enter detailed review instructions.");
      return;
    }

    const formData = new FormData();
    formData.append('reviewInstructions', instructions);
    
    selectedFiles.forEach(file => {
      console.log("file is",file);

      if (file) {
        formData.append('reviewTemplate', file);
        // console.log({formData})
      }
    });

    //debug
    for (let [key, val] of formData.entries()) {
      console.log(key, val);
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${SERVER_API_KEY}/api/panels/coordinator/instruction-template`, formData, {
        headers: {
           'Authorization': `Bearer ${token}`
        },
      });
      console.log('Submission successful:', response.data);
      alert('Instructions and uploaded documents dispatched successfully to teams!');
      setInstructions('');
      setSelectedFiles([null]);
      fetchHistory();
    } catch (error) {
      console.error('Error submitting template details:', error);
      alert('Failed to submit form data. Please try again.');
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${SERVER_API_KEY}/api/panels/coordinator/instruction-templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data && response.data.success) {
        setHistoryData(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDownload = async (templateId, actualFileName) => {
    if (!templateId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${SERVER_API_KEY}/api/student/download-template/${templateId}?fileName=${encodeURIComponent(actualFileName)}`, {
        responseType: 'blob', 
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.type === "application/json" || response.headers['content-type']?.includes('application/json')) {
        const text = await response.data.text();
        const errorObj = JSON.parse(text);
        alert(`Download Failed: ${errorObj.message}`);
        return;
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', actualFileName || 'instruction_document.txt'); 
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download pipeline failed:", err);
      alert("Could not process your file download. Please try again later.");
    }
  };

  const handleCancel = () => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.role === 'assistant coordinator') return;
    setInstructions('');
    setSelectedFiles([null]);
  };

  const getTemplateFiles = (template) => {
    const files = [];
    if (template.attachments && template.attachments.length > 0) {
      files.push(...template.attachments);
    } else if (template.fileName && template.filePath) {
      files.push({ fileName: template.fileName, filePath: template.filePath });
    }
    return files;
  };

  return (
    <>
      <div className="bg-white-50 min-h-screen p-6 w-full">
        <div className="max-w-4xl mx-auto bg-white rounded border border-gray-200 shadow-sm p-6 mb-6">
          
          {(() => {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const isReadOnly = storedUser.role === 'assistant coordinator';
            window.isReadOnly = isReadOnly;
            return null;
          })()}
          
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h1 className="text-xl font-bold text-gray-900">Announcement to Student Teams</h1>
            {window.isReadOnly && (
              <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded font-medium text-center">
                ℹ️ You are viewing this page in Read-Only Mode as an Assistant Coordinator.
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div>
              <label htmlFor="instructions" className="block text-sm font-semibold text-gray-900 mb-2">
                Review / Viva Instructions
              </label>
              <textarea
                id="instructions"
                value={instructions}
                onChange={handleTextChange}
                rows={6}
                className="w-full px-3 py-2 text-sm rounded border border-gray-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 placeholder-gray-400 transition-all duration-200 resize-y min-h-[120px]"
                placeholder="Provide instructions, review expectations, presentation guidelines, and important updates for student teams"
                disabled={window.isReadOnly}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Review / Viva Resources
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([...selectedFiles, null])}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={window.isReadOnly}
                >
                  + Add Material
                </button>
              </div>
              
              <div className="space-y-3 bg-gray-50/50 p-4 border border-gray-200 rounded">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-gray-150 pb-2 last:border-0 last:pb-0">
                    <input
                      type="file"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const updated = [...selectedFiles];
                          updated[idx] = e.target.files[0];
                          setSelectedFiles(updated);
                        }
                      }}
                      className="text-xs text-gray-500 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      disabled={window.isReadOnly}
                    />
                    {file && (
                      <span className="text-xs text-green-600 font-semibold truncate max-w-xs">
                        Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                    {selectedFiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = selectedFiles.filter((_, i) => i !== idx);
                          setSelectedFiles(updated);
                        }}
                        className="text-xs text-red-500 hover:text-red-700 font-bold self-start sm:self-center"
                        disabled={window.isReadOnly}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCancel}
                disabled={window.isReadOnly}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Changes
              </button>
              <button
                type="submit"
                disabled={window.isReadOnly}
                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Broadcast to Teams
              </button>
            </div>

          </form>
        </div>

        <div className="max-w-4xl mx-auto space-y-6 mt-8 pb-12">
          <div className="border-b border-gray-200 pb-2">
            <h2 className="text-lg font-bold text-gray-900">Broadcast History</h2>
            <p className="text-xs text-gray-500 mt-0.5">Track and view all previously sent announcements and instructions.</p>
          </div>

          {loadingHistory ? (
            <div className="text-center text-gray-500 text-sm py-4">Loading broadcast history...</div>
          ) : historyData.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-6 bg-white border rounded border-dashed">No announcements sent yet.</div>
          ) : (
            <div className="space-y-4">
              {historyData.map((template) => (
                <div 
                  key={template._id} 
                  className="w-full bg-white border border-gray-200 rounded shadow-sm p-6 space-y-4 transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Instructions/Guidelines
                    </span>
                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                      {new Date(template.createdAt).toLocaleDateString()} • {new Date(template.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="w-full text-gray-700 text-sm leading-relaxed bg-gray-50/50 rounded-lg p-4 border border-gray-100 whitespace-pre-wrap">
                    {template.reviewInstructions}
                  </div>

                  {getTemplateFiles(template).length > 0 && (
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Attachments:</span>
                      <div className="flex flex-wrap gap-2">
                        {getTemplateFiles(template).map((file, fIdx) => (
                          <button
                            key={fIdx}
                            onClick={() => handleDownload(template._id, file.fileName)}
                            className="inline-flex items-center justify-center bg-[#583be2] hover:bg-[#472fc5] text-white font-medium py-1.5 px-3 rounded-lg transition-colors duration-200 shadow-sm text-xs"
                          >
                            <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"></path>
                            </svg>
                            {file.fileName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
};

export default CoordinatorInstructionTemplate;