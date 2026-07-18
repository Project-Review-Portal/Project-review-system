import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";

const CoordinatorInstructionTemplate = () => {
  const [instructions, setInstructions] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Handle text input updates
  const handleTextChange = (e) => {
    setInstructions(e.target.value);
  };

  // Handle native file selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Drag and Drop visual indicator handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
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

    if (!instructions.trim() && !selectedFile) {
      alert("Please enter detailed review instructions or attach a resource.");
      return;
    }

    const formData = new FormData();
    formData.append('reviewInstructions', instructions);
    if (selectedFile) {
      formData.append('reviewTemplate', selectedFile);
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${SERVER_API_KEY}/api/panels/coordinator/instruction-template`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
           'Authorization': `Bearer ${token}`
        },
      });
      console.log('Submission successful:', response.data);
      alert('Instructions and uploaded documents dispatched successfully to teams!');
    } catch (error) {
      console.error('Error submitting template details:', error);
      alert('Failed to submit form data. Please try again.');
    }
  };

  const handleCancel = () => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.role === 'assistant coordinator') return;
    setInstructions('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      {/* Main Base Canvas matching platform container flow */}
      <div className="bg-white-50 min-h-screen p-6 w-full">
        
        {/* Centralized Form Block Frame matching the exact width and clean alignment rules */}
        <div className="max-w-4xl mx-auto bg-white rounded border border-gray-200 shadow-sm p-6 mb-6">
          
          {/* Read user role context */}
          {(() => {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const isReadOnly = storedUser.role === 'assistant coordinator';
            window.isReadOnly = isReadOnly; // temp share with component markup below
            return null;
          })()}
          
          {/* Section Header */}
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h1 className="text-xl font-bold text-gray-900">Announcement to Student Teams</h1>
            {window.isReadOnly && (
              <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded font-medium text-center">
                ℹ️ You are viewing this page in Read-Only Mode as an Assistant Coordinator.
              </div>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {/*Publish review guidelines, grading structures, and baseline templates ahead of the scheduled project review.*/}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Input Element 1: Review Guidelines Textbox */}
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

            {/* Input Element 2: Review Template File Drop Zone */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Review / Viva Resources
              </label>
              
              <div
                onDragOver={window.isReadOnly ? undefined : handleDragOver}
                onDragLeave={window.isReadOnly ? undefined : handleDragLeave}
                onDrop={window.isReadOnly ? undefined : handleDrop}
                onClick={window.isReadOnly ? undefined : () => fileInputRef.current?.click()}
                className={`mt-1 flex justify-center px-6 pt-6 pb-6 border-2 border-dashed rounded relative group transition-all duration-200 ${
                  window.isReadOnly 
                    ? 'border-gray-200 bg-gray-50/50 cursor-not-allowed'
                    : isDragging 
                      ? 'border-indigo-500 bg-indigo-50/30 cursor-pointer' 
                      : 'border-gray-300 hover:border-indigo-400 bg-gray-50/50 cursor-pointer'
                }`}
              >
                <input
                  type="file"
                  id="templateFile"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={window.isReadOnly}
                />
                
                <div className="space-y-2 text-center pointer-events-none">
                  {/* Styled Document Vector Icon */}
                  <svg 
                    className={`mx-auto h-10 w-10 transition-colors duration-200 ${isDragging || selectedFile ? 'text-indigo-500' : 'text-gray-400 group-hover:text-indigo-500'}`} 
                    stroke="currentColor" 
                    fill="none" 
                    viewBox="0 0 48 48" 
                    aria-hidden="true"
                  >
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4-4m4-4h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  
                  <div className="flex text-sm text-gray-600 justify-center">
                    <span className="relative font-medium text-indigo-600 group-hover:text-indigo-700 transition-colors duration-200">
                      Select file
                    </span>
                    <p className="pl-1">or drag it directly here</p>
                  </div>

                  {selectedFile ? (
                    <p className="text-xs text-green-600 font-semibold bg-green-50 border border-green-100 px-3 py-1 rounded inline-block mt-2">
                      Selected Document: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  ) : (
                    <><p className="text-xs text-gray-400">Upload templates, guidelines, reference documents, evaluation rubrics, presentation formats, or other review-related resources.</p><p className="text-xs text-gray-400">Supported formats: PDF, DOCX, PPTX, XLSX and other academic resource files.</p></>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Panel aligning buttons right matching your structural layouts */}
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
      </div>
    </>
  );
};

export default CoordinatorInstructionTemplate;