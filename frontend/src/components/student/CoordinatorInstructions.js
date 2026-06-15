import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CoordinatorInstructions = () => {
  const [instructionData, setInstructionData] = useState([]);
  const [panelId, setPanelId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [errorState, setErrorState] = useState({
    isError: false,
    statusCode: null,
    message: ""
  });

  useEffect(() => {
    const fetchCoordinatorData = async () => {
      try {
        const storedUserRaw = localStorage.getItem('user');
        if (!storedUserRaw) {
          setErrorState({
            isError: true,
            statusCode: 401,
            message: "User session not found. Please log in again."
          });
          setLoading(false);
          return;
        }

        const user = JSON.parse(storedUserRaw);

        // Fetch instructions based on user id lookup chain
        const response = await axios.get('/api/student/get-instructions-template', {
          params: { userId: user.id },
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.data && response.data.success) {
          setInstructionData(response.data.data);
          setPanelId(response.data.panelId);
        }

      } catch (err) {
        const statusCode = err.response?.status;
        const serverMessage = err.response?.data?.message;

        setErrorState({
          isError: true,
          statusCode: statusCode || 500,
          message: serverMessage || "A network error occurred. Please try again later."
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCoordinatorData();
  }, []);

  // Secure file download using blob streams to handle header tokens cleanly
  const handleDownload = async (templateId, actualFileName) => {
    if (!templateId) return;
    
    try {
      const response = await axios.get(`/api/student/download-template/${templateId}`, {
        responseType: 'blob', 
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Intercept and extract backend error responses sent as JSON inside blobs
      if (response.data.type === "application/json" || response.headers['content-type']?.includes('application/json')) {
        const text = await response.data.text();
        const errorObj = JSON.parse(text);
        alert(`Download Failed: ${errorObj.message}`);
        return;
      }

      // Generate virtual asset click payload to prompt clean file assembly
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500 font-medium">Loading panel updates...</div>
      </div>
    );
  }

  // Handle 404 blockages (e.g., Team not formed / Panel unassigned)
  if (errorState.isError && errorState.statusCode === 404) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-8 shadow-sm text-center">
          <svg className="w-12 h-12 text-amber-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <h3 className="text-lg font-bold text-amber-900 mb-2">Notice From Panel Coordinator </h3>
          <p className="text-sm leading-relaxed max-w-md mx-auto text-amber-700">{errorState.message}</p>
        </div>
      </div>
    );
  }

  // Handle server errors (e.g., 500 Server Crashes, 401 Expirations)
  if (errorState.isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 shadow-sm">
          <p className="font-semibold text-red-800">System Error ({errorState.statusCode}):</p>
          <p className="text-sm mt-1 text-red-600">{errorState.message}</p>
        </div>
      </div>
    );
  }

  const coordinatorName = instructionData[0]?.uploadedBy?.name || "Not Assigned";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start p-6 font-sans">
      <div className="w-full max-w-3xl space-y-6">
        
        {/* Top Header Card */}
        <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Announcement by the Coordinator</h2>
              <p className="text-xs text-gray-500 mt-0.5">Access instructions, announcements, and resources for upcoming reviews/viva.</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-800 self-start sm:self-center">
              <span className="text-xs text-gray-400 font-normal mr-1">Coordinator:</span> 
              {coordinatorName}
            </div>
          </div>
        </div>

        {/* Dynamic Instructions List */}
        {instructionData.map((template) => (
          <div 
            key={template._id} 
            className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4 transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Instructions/Guidelines
              </span>
              <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                {new Date(template.createdAt).toLocaleDateString()} • {new Date(template.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="w-full text-gray-700 text-sm leading-relaxed bg-gray-50/50 rounded-lg p-4 border border-gray-100">
              {template.reviewInstructions}
            </div>

            {/* Downloader trigger bound cleanly with specific mapped data arguments */}
            {template.fileName && (
              <div className="pt-1">
                <button
                  onClick={() => handleDownload(template._id, template.fileName)}
                  className="inline-flex items-center justify-center bg-[#583be2] hover:bg-[#472fc5] text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm text-xs"
                >
                  <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"></path>
                  </svg>
                  Download Attachment: {template.fileName}
                </button>
              </div>
            )}
          </div>
        ))}

      </div>
    </div>
  );
};

export default CoordinatorInstructions;