import React, { useState, useEffect } from 'react';

const LetterGeneration = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [placeholders, setPlaceholders] = useState({ tablePlaceholders: [], singlePlaceholders: [] });
  const [singleValues, setSingleValues] = useState({});
  const [tableRows, setTableRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
  const total = tableRows.reduce((acc, row) => {
    const val = parseFloat(row.netAmount || 0);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);
  setSingleValues(prev => ({ ...prev, totalNetAmount: total }));
}, [tableRows]);


  // Fetch available templates (list .docx files in backend/uploads/templates/)
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/documents/templates', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();
        if (data.success) {
          setTemplates(data.templates || []);
        } else {
          setError(data.message || 'Could not load templates');
        }
      } catch (err) {
        setError('Could not load templates');
      }
    };
    fetchTemplates();
  }, []);

  // Fetch placeholders for selected template
  useEffect(() => {
    if (!selectedTemplate) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    fetch(`/api/documents/templates/${selectedTemplate}/structure`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.structure) {
          const structure = data.structure;
          const singlePlaceholders = structure.fields ? structure.fields.map(field => field.name) : [];
          const tablePlaceholders = structure.tables && structure.tables.length > 0 ? 
            structure.tables[0].columns.map(col => col.name) : [];
          
          setPlaceholders({
            tablePlaceholders: tablePlaceholders,
            singlePlaceholders: singlePlaceholders,
          });
          setTableRows([{ ...Object.fromEntries(tablePlaceholders.map(ph => [ph, ''])) }]);
          setSingleValues(Object.fromEntries(singlePlaceholders.map(ph => [ph, ''])));
        } else {
          setError(data.message || 'Could not fetch placeholders');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Could not fetch placeholders');
        setLoading(false);
      });
  }, [selectedTemplate]);

  // Handle single value change
  const handleSingleChange = (e) => {
    setSingleValues({ ...singleValues, [e.target.name]: e.target.value });
  };

  // Handle table row change
  const handleTableChange = (rowIdx, e) => {
    const newRows = tableRows.map((row, idx) =>
      idx === rowIdx ? { ...row, [e.target.name]: e.target.value } : row
    );
    setTableRows(newRows);
  };

  // Add new table row
  const addTableRow = () => {
    setTableRows([...tableRows, { ...Object.fromEntries(placeholders.tablePlaceholders.map(ph => [ph, ''])) }]);
  };

  // Remove table row
  const removeTableRow = (idx) => {
    setTableRows(tableRows.filter((_, i) => i !== idx));
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          data: {
            ...singleValues,
            tableRows: tableRows
          }
        }),
      });
      if (!res.ok) throw new Error('Failed to generate letter');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTemplate}_filled.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to generate letter');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-xl font-semibold mb-4">Letter Generation</h2>
      {error && <div className="mb-4 text-red-700">{error}</div>}
      <div className="mb-4">
        <label className="block mb-2 font-medium">Select Letter Template:</label>
        <select
          className="border rounded p-2"
          value={selectedTemplate}
          onChange={e => setSelectedTemplate(e.target.value)}
        >
          <option value="">-- Select --</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      {loading && <div>Loading...</div>}
      {selectedTemplate && !loading && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Single-value placeholders */}
          {placeholders.singlePlaceholders.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Letter Details</h3>
              {placeholders.singlePlaceholders.map(ph => (
                <div key={ph} className="mb-2">
                  <label className="block mb-1">{ph}</label>
                  <input
                    type="text"
                    name={ph}
                    value={singleValues[ph] || ''}
                    onChange={handleSingleChange}
                    className="border rounded p-2 w-full"
                  />
                </div>
              ))}
            </div>
          )}
          {/* Table placeholders */}
          {placeholders.tablePlaceholders.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Table Rows</h3>
              <table className="w-full border mb-2">
                <thead>
                  <tr>
                    {placeholders.tablePlaceholders.map(ph => (
                      <th key={ph} className="border p-1">{ph}</th>
                    ))}
                    <th className="border p-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, idx) => (
                    <tr key={idx}>
                      {placeholders.tablePlaceholders.map(ph => (
                        <td key={ph} className="border p-1">
                          <input
                            type="text"
                            name={ph}
                            value={row[ph] || ''}
                            onChange={e => handleTableChange(idx, e)}
                            className="border rounded p-1 w-full"
                          />
                        </td>
                      ))}
                      <td className="border p-1">
                        <button type="button" onClick={() => removeTableRow(idx)} className="text-red-600">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={addTableRow} className="bg-blue-500 text-white px-3 py-1 rounded">Add Row</button>
            </div>
          )}
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Generate Letter</button>
        </form>
      )}
    </div>
  );
};

export default LetterGeneration; 