import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from '../../utils/toast';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || 'http://localhost:3626';

const CoordinatorMarkingScheme = () => {
    const [panels, setPanels] = useState([]);
    const [selectedPanelId, setSelectedPanelId] = useState('');
    const [slotTypes, setSlotTypes] = useState([]);
    const [activeSlot, setActiveSlot] = useState('');
    const [components, setComponents] = useState([{ name: '', maxMarks: '' }]);
    const [loading, setLoading] = useState(true);
    const [schemeLoading, setSchemeLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        if (error) {
            toast.error(error);
            setError('');
        }
    }, [error]);

    useEffect(() => {
        if (success) {
            toast.success(success);
            setSuccess('');
        }
    }, [success]);

    // Initial load: fetch panels and slot types
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            setError('');
            try {
                const [panelsRes, settingsRes] = await Promise.all([
                    axios.get(`${SERVER_API_KEY}/api/marking-scheme/coordinator/my-panels`, { headers }),
                    axios.get(`${SERVER_API_KEY}/api/auth/review-settings`, { headers })
                ]);

                const fetchedPanels = panelsRes.data || [];
                setPanels(fetchedPanels);

                const validSlots = (settingsRes.data.validSlotTypes || ['review1', 'review2', 'review3', 'viva'])
                    .filter(s => s !== 'review0');
                setSlotTypes(validSlots);

                if (fetchedPanels.length > 0) setSelectedPanelId(fetchedPanels[0]._id);
                if (validSlots.length > 0) setActiveSlot(validSlots[0]);
            } catch (err) {
                setError('Failed to load panels or review settings.');
            } finally {
                setLoading(false);
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch scheme whenever panel or slot changes
    const fetchScheme = useCallback(async () => {
        if (!selectedPanelId || !activeSlot) return;
        setSchemeLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await axios.get(
                `${SERVER_API_KEY}/api/marking-scheme/coordinator?panelId=${selectedPanelId}&slotType=${activeSlot}`,
                { headers }
            );
            const fetchedComponents = res.data?.components || [];
            setComponents(fetchedComponents.length > 0
                ? fetchedComponents.map(c => ({ name: c.name, maxMarks: c.maxMarks }))
                : [{ name: '', maxMarks: '' }]
            );
        } catch (err) {
            setError('Failed to load marking scheme.');
            setComponents([{ name: '', maxMarks: '' }]);
        } finally {
            setSchemeLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPanelId, activeSlot]);

    useEffect(() => { fetchScheme(); }, [fetchScheme]);

    const addComponent = () => setComponents(prev => [...prev, { name: '', maxMarks: '' }]);

    const removeComponent = (idx) => {
        if (components.length === 1) return;
        setComponents(prev => prev.filter((_, i) => i !== idx));
    };

    const updateComponent = (idx, field, value) => {
        setComponents(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
    };

    const totalMaxMarks = components.reduce((sum, c) => sum + (Number(c.maxMarks) || 0), 0);

    const handleSave = async () => {
        setError('');
        setSuccess('');
        for (const c of components) {
            if (!c.name.trim()) { setError('Each component must have a name.'); return; }
            if (!c.maxMarks || Number(c.maxMarks) <= 0) { setError(`Component "${c.name}" must have a positive max marks value.`); return; }
        }
        setSaving(true);
        try {
            await axios.post(`${SERVER_API_KEY}/api/marking-scheme/coordinator`, {
                panelId: selectedPanelId,
                slotType: activeSlot,
                components: components.map(c => ({ name: c.name.trim(), maxMarks: Number(c.maxMarks) }))
            }, { headers });
            setSuccess('Marking scheme saved successfully!');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save marking scheme.');
        } finally {
            setSaving(false);
        }
    };

    const formatSlotLabel = (s) => s === 'viva' ? 'VIVA' : `REVIEW ${s.replace('review', '')}`;

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-600 font-medium">Loading...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Marking Scheme</h2>
                        <p className="text-sm text-gray-500">Define mark components for each review/viva type for your panel.</p>
                    </div>
                </div>
            </div>

            {panels.length === 0 ? (
                <div className="p-10 bg-white rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <p className="font-medium">No panels found for your programme.</p>
                    <p className="text-sm mt-1 text-gray-400">Contact admin to assign you as a coordinator to a panel.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Panel selector */}
                    <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Panel</label>
                        <div className="flex flex-wrap gap-2">
                            {panels.map(p => (
                                <button
                                    key={p._id}
                                    onClick={() => setSelectedPanelId(p._id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 border ${
                                        selectedPanelId === p._id
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                            : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400 hover:text-indigo-600'
                                    }`}
                                >
                                    {p.name}
                                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                                        selectedPanelId === p._id ? 'bg-indigo-500 text-indigo-100' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {p.panelType === 'viva' ? 'Viva' : 'Review'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Slot type tabs */}
                    <div className="px-5 pt-4 border-b border-gray-100">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Review / Viva</label>
                        <div className="flex gap-1 flex-wrap">
                            {slotTypes.map(st => (
                                <button
                                    key={st}
                                    onClick={() => setActiveSlot(st)}
                                    className={`px-4 py-1.5 rounded-t-md text-sm font-semibold transition-colors border-b-2 ${
                                        activeSlot === st
                                            ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50'
                                            : 'text-gray-500 border-transparent hover:text-gray-700'
                                    }`}
                                >
                                    {formatSlotLabel(st)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Components editor */}
                    <div className="p-5">
                        {schemeLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                                <span className="ml-2 text-gray-500 text-sm">Loading scheme...</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <span className="text-sm font-semibold text-gray-700">Components for&nbsp;
                                            <span className="text-indigo-600">{formatSlotLabel(activeSlot)}</span>
                                        </span>
                                        {totalMaxMarks > 0 && (
                                            <span className="ml-2 text-xs text-gray-400">
                                                Total: <span className="font-semibold text-gray-600">{totalMaxMarks} marks</span>
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={addComponent}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        Add Component
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {/* Table header */}
                                    <div className="grid grid-cols-12 gap-3 px-3 py-1.5">
                                        <div className="col-span-1 text-xs font-semibold text-gray-400 uppercase">#</div>
                                        <div className="col-span-7 text-xs font-semibold text-gray-400 uppercase">Component Name</div>
                                        <div className="col-span-3 text-xs font-semibold text-gray-400 uppercase">Max Marks</div>
                                        <div className="col-span-1"></div>
                                    </div>

                                    {components.map((comp, idx) => (
                                        <div
                                            key={idx}
                                            className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-indigo-200 transition-colors"
                                        >
                                            <div className="col-span-1">
                                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">
                                                    {idx + 1}
                                                </span>
                                            </div>
                                            <div className="col-span-7">
                                                <input
                                                    type="text"
                                                    value={comp.name}
                                                    onChange={e => updateComponent(idx, 'name', e.target.value)}
                                                    placeholder="e.g. Presentation, Methodology, Code Quality"
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={comp.maxMarks}
                                                        onChange={e => updateComponent(idx, 'maxMarks', e.target.value)}
                                                        placeholder="20"
                                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white pr-8 text-center font-semibold"
                                                    />
                                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">pts</span>
                                                </div>
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                <button
                                                    onClick={() => removeComponent(idx)}
                                                    disabled={components.length === 1}
                                                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="Remove"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Summary bar */}
                                {components.length > 0 && totalMaxMarks > 0 && (
                                    <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center justify-between">
                                        <div className="text-sm text-indigo-700">
                                            <span className="font-semibold">{components.filter(c => c.name.trim()).length}</span> components
                                            {' · '}
                                            <span className="font-semibold">{totalMaxMarks}</span> total marks
                                        </div>
                                        <div className="flex gap-1">
                                            {components.filter(c => c.name.trim() && c.maxMarks).map((c, i) => (
                                                <span key={i} className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                                                    {c.name.trim()} ({c.maxMarks})
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="mt-5 flex justify-end gap-3">
                                    <button
                                        onClick={fetchScheme}
                                        className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className={`px-6 py-2 text-sm font-semibold text-white rounded-lg transition-all duration-150 shadow-sm ${
                                            saving
                                                ? 'bg-indigo-400 cursor-not-allowed'
                                                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                                        }`}
                                    >
                                        {saving ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                                Saving...
                                            </span>
                                        ) : 'Save Scheme'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoordinatorMarkingScheme;
