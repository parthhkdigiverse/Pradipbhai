import { useState, useMemo } from 'react';
import { Megaphone, Calendar as CalendarIcon, Plus, X, Maximize, Minimize, Search } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { formatDate } from '../utils/dateFormatter';

export function SocialMediaPage() {
  const { dateFormat } = useSettings();
  const { clients, updateProject } = useData();
  
  // Extract Social Media projects
  const smProjects = useMemo(() => {
    const projects: any[] = [];
    clients.forEach(client => {
      if (client.projects && client.projects.length > 0) {
        client.projects.forEach((proj: any, idx: number) => {
          if (proj.category === 'Social Media') {
            projects.push({
              ...proj,
              clientId: client.id,
              clientName: client.company,
              clientContact: client.contact,
              originalProjectIndex: idx,
              contentCalendar: proj.contentCalendar || [] // Array of { id, title, type, status, date }
            });
          }
        });
      }
    });
    return projects;
  }, [clients]);

  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredProjects = useMemo(() => {
    return smProjects.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [smProjects, searchTerm]);

  // Calendar Modal State
  const [activeProject, setActiveProject] = useState<any>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkSelectedDays, setBulkSelectedDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [bulkFormatType, setBulkFormatType] = useState('Post');
  const [bulkAddTab, setBulkAddTab] = useState<'range' | 'visual'>('range');
  const [visualSelectedDates, setVisualSelectedDates] = useState<string[]>([]);
  const [visualCurrentMonth, setVisualCurrentMonth] = useState<Date>(new Date());
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: string; value: string } | null>(null);

  const [newItemForm, setNewItemForm] = useState({
    title: '',
    type: 'Post',
    status: 'To Do',
    date: ''
  });

  const handleOpenCalendar = (project: any) => {
    setActiveProject(project);
    setIsCalendarModalOpen(true);
  };

  const handleCloseCalendar = () => {
    setIsCalendarModalOpen(false);
    setActiveProject(null);
    setIsAddingItem(false);
    setIsFullScreen(false);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const newItem = {
      ...newItemForm,
      id: Math.random().toString(36).substr(2, 9),
    };

    const updatedCalendar = [...activeProject.contentCalendar, newItem];
    const updatedProjectData = {
      ...activeProject,
      contentCalendar: updatedCalendar
    };

    // Remove the extra fields we injected before saving to global state
    const { clientId, clientName, clientContact, originalProjectIndex, ...pureProjectData } = updatedProjectData;
    
    updateProject(activeProject.clientId, activeProject.originalProjectIndex, pureProjectData);
    
    // Update local active project state to reflect instantly in the modal
    setActiveProject(updatedProjectData);
    
    setIsAddingItem(false);
    setNewItemForm({ title: '', type: 'Post', status: 'To Do', date: '' });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!activeProject) return;
    
    const updatedCalendar = activeProject.contentCalendar.filter((item: any) => item.id !== itemId);
    const updatedProjectData = { ...activeProject, contentCalendar: updatedCalendar };
    
    const { clientId, clientName, clientContact, originalProjectIndex, ...pureProjectData } = updatedProjectData;
    updateProject(activeProject.clientId, activeProject.originalProjectIndex, pureProjectData);
    setActiveProject(updatedProjectData);
  };

  const handleGenerateBulkSlots = () => {
    if (!bulkStartDate || !bulkEndDate) return;
    
    const start = new Date(bulkStartDate);
    const end = new Date(bulkEndDate);
    if (end < start) return;

    const generated = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (bulkSelectedDays.includes(d.getDay())) {
        generated.push({
          id: `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: `Bulk ${bulkFormatType}`,
          type: bulkFormatType,
          status: 'To Do',
          date: d.toISOString().split('T')[0]
        });
      }
    }

    if (generated.length === 0) return;

    const updatedCalendar = [...(activeProject.contentCalendar || []), ...generated];
    const updatedProjectData = { ...activeProject, contentCalendar: updatedCalendar };
    const { clientId, clientName, clientContact, originalProjectIndex, ...pureProjectData } = updatedProjectData;
    
    updateProject(activeProject.clientId, activeProject.originalProjectIndex, pureProjectData);
    setActiveProject(updatedProjectData);
    setIsBulkAddModalOpen(false);
  };

  const handleGenerateVisualSlots = () => {
    if (visualSelectedDates.length === 0) return;

    const generated = visualSelectedDates.map(dateStr => {
      return {
        id: `bulk-vis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `Visual ${bulkFormatType}`,
        type: bulkFormatType,
        status: 'To Do',
        date: dateStr
      };
    });

    const updatedCalendar = [...(activeProject.contentCalendar || []), ...generated];
    const updatedProjectData = { ...activeProject, contentCalendar: updatedCalendar };
    const { clientId, clientName, clientContact, originalProjectIndex, ...pureProjectData } = updatedProjectData;
    
    updateProject(activeProject.clientId, activeProject.originalProjectIndex, pureProjectData);
    setActiveProject(updatedProjectData);
    setIsBulkAddModalOpen(false);
  };

  const toggleBulkDay = (dayIdx: number) => {
    if (bulkSelectedDays.includes(dayIdx)) {
      setBulkSelectedDays(bulkSelectedDays.filter(d => d !== dayIdx));
    } else {
      setBulkSelectedDays([...bulkSelectedDays, dayIdx]);
    }
  };

  const daysConfig = [
    { label: "M", index: 1 },
    { label: "T", index: 2 },
    { label: "W", index: 3 },
    { label: "T", index: 4 },
    { label: "F", index: 5 },
    { label: "S", index: 6 },
    { label: "S", index: 0 },
  ];

  // Calendar rendering helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  
  const generateCalendarDays = () => {
    const year = visualCurrentMonth.getFullYear();
    const month = visualCurrentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push(dateStr);
    }
    return days;
  };

  const toggleVisualDate = (dateStr: string) => {
    if (visualSelectedDates.includes(dateStr)) {
      setVisualSelectedDates(visualSelectedDates.filter(d => d !== dateStr));
    } else {
      setVisualSelectedDates([...visualSelectedDates, dateStr]);
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'Post': return 'bg-blue-100 text-blue-700';
      case 'Reel': return 'bg-blue-100 text-blue-700';
      case 'Story': return 'bg-orange-100 text-orange-700';
      case 'Carousel': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-blue-500" />
            Social Media
          </h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">
            Manage your social media projects and their content calendars.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search projects by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white/60 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 w-64 shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="glass-panel border border-white/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col flex-1 bg-white/40 backdrop-blur-md">
        <div className="overflow-x-auto flex-1 p-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50">
                <th className="py-4 px-6">#</th>
                <th className="py-4 px-6">Project Name</th>
                <th className="py-4 px-6">Client Name</th>
                <th className="py-4 px-6 text-center">Posts Planned</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((proj, idx) => (
                  <tr key={idx} className="hover:bg-white/60 transition-colors group">
                    <td className="py-4 px-6 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="py-4 px-6 text-sm font-bold text-gray-800">{proj.name}</td>
                    <td className="py-4 px-6 text-gray-500 font-medium">{proj.clientName}</td>
                    <td className="py-4 px-6 text-center font-bold text-gray-800">{proj.contentCalendar?.length || 0}</td>
                    <td className="py-4 px-6 text-center">
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">{proj.status}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => handleOpenCalendar(proj)}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                          Calendar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Megaphone className="w-12 h-12 text-gray-300 mb-4" />
                      <p>No social media projects found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Content Calendar Modal */}
      {isCalendarModalOpen && activeProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseCalendar}></div>
          <div className={`relative bg-[#f8fafc] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-all ${
            isFullScreen 
              ? 'w-full h-[calc(100vh-2rem)] rounded-xl' 
              : 'w-full max-w-[1400px] max-h-[85vh] rounded-2xl'
          }`}>
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-500" />
                  Content Calendar
                </h2>
                <p className="text-sm font-semibold text-gray-500 mt-1">{activeProject.name} • {activeProject.clientName}</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    setBulkStartDate(today);
                    setBulkEndDate(nextWeek);
                    setBulkSelectedDays([1, 3, 5]);
                    setIsBulkAddModalOpen(true);
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  Bulk Add
                </button>
                <button 
                  onClick={() => setIsAddingItem(true)}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Idea
                </button>
                <div className="w-px h-6 bg-gray-200 mx-1"></div>
                <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors" title={isFullScreen ? "Exit Full Screen" : "Full Screen"}>
                  {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
                <button onClick={handleCloseCalendar} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 relative">
              {isAddingItem && (
                <div className="mb-6 p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800">New Content Idea</h3>
                    <button onClick={() => setIsAddingItem(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
                  </div>
                  <form onSubmit={handleSaveItem} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Title / Concept *</label>
                      <input required type="text" value={newItemForm.title} onChange={e => setNewItemForm({...newItemForm, title: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. Product Launch Reel" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Type</label>
                      <select value={newItemForm.type} onChange={e => setNewItemForm({...newItemForm, type: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                        <option value="Post">Post</option>
                        <option value="Reel">Reel</option>
                        <option value="Story">Story</option>
                        <option value="Carousel">Carousel</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Scheduled Date</label>
                      <input type="date" value={newItemForm.date} onChange={e => setNewItemForm({...newItemForm, date: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                    <div className="md:col-span-4 flex justify-end mt-2">
                      <button type="submit" className="px-5 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-colors">Save Content</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white/40 border border-gray-200 rounded-[2rem] shadow-sm overflow-hidden backdrop-blur-md">
                {!activeProject.contentCalendar || activeProject.contentCalendar.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl m-6">
                    <CalendarIcon className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-700 mb-1">Calendar is empty</h3>
                    <p className="text-sm text-gray-500">Click 'Add Idea' to start planning content.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50">
                          <th className="py-4 px-5 text-center whitespace-nowrap">Schedule</th>
                          <th className="py-4 px-5 text-center whitespace-nowrap">Type</th>
                          <th className="py-4 px-5 text-center whitespace-nowrap">Topic / Concept</th>
                          <th className="py-4 px-5 text-center whitespace-nowrap">Brand Person</th>
                          <th className="py-4 px-5 text-center whitespace-nowrap">Script</th>
                          <th className="py-4 px-5 text-center whitespace-nowrap">Shoot</th>
                          <th className="py-4 px-5 text-center whitespace-nowrap">Editing</th>
                          <th className="py-4 px-5 text-center whitespace-nowrap">Thumbnail</th>
                          <th className="py-4 px-5 text-center whitespace-nowrap">Caption</th>
                          <th className="py-4 px-5 text-center whitespace-nowrap">Instagram Status</th>
                          <th className="py-4 px-5 text-center whitespace-nowrap">Issues</th>
                          <th className="py-4 px-5 text-center whitespace-nowrap">Approval & Status</th>
                          <th className="py-4 px-5 text-center whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[...activeProject.contentCalendar].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((item: any) => {
                          
                          const saveInlineEdit = (field: string, value: string) => {
                            const updatedCalendar = activeProject.contentCalendar.map((x: any) =>
                              x.id === item.id ? { ...x, [field]: value } : x
                            );
                            const updatedProjectData = { ...activeProject, contentCalendar: updatedCalendar };
                            const { clientId, clientName, clientContact, originalProjectIndex, ...pureProjectData } = updatedProjectData;
                            updateProject(activeProject.clientId, activeProject.originalProjectIndex, pureProjectData);
                            setActiveProject(updatedProjectData);
                            setInlineEdit(null);
                          };

                          const startEdit = (e: React.MouseEvent, field: string, value: string) => {
                            e.stopPropagation();
                            setInlineEdit({ id: item.id, field, value: value || '' });
                          };

                          const isEd = (field: string) => inlineEdit?.id === item.id && inlineEdit?.field === field;

                          const InlineText = ({ field, value, placeholder }: { field: string; value?: string; placeholder?: string }) =>
                            isEd(field) ? (
                              <input
                                autoFocus
                                type="text"
                                value={inlineEdit!.value}
                                onChange={e => setInlineEdit({ ...inlineEdit!, value: e.target.value })}
                                onBlur={() => saveInlineEdit(field, inlineEdit!.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveInlineEdit(field, inlineEdit!.value); if (e.key === 'Escape') setInlineEdit(null); }}
                                onClick={e => e.stopPropagation()}
                                className="w-full px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-400 text-center"
                              />
                            ) : (
                              <span onClick={e => startEdit(e, field, value || '')} className="cursor-text hover:bg-gray-100 rounded px-1 py-0.5 transition-colors block text-center group/cell" title="Click to edit">
                                {value || <span className="text-gray-400 italic text-[10px]">{placeholder || 'Click to add'}</span>}
                                <span className="ml-1 opacity-0 group-hover/cell:opacity-50 transition-opacity text-[9px]">✏️</span>
                              </span>
                            );

                          const InlineDate = ({ field, value }: { field: string; value?: string }) =>
                            isEd(field) ? (
                              <input
                                autoFocus
                                type="date"
                                value={inlineEdit!.value}
                                onChange={e => setInlineEdit({ ...inlineEdit!, value: e.target.value })}
                                onBlur={() => saveInlineEdit(field, inlineEdit!.value)}
                                onKeyDown={e => { if (e.key === 'Escape') setInlineEdit(null); }}
                                onClick={e => e.stopPropagation()}
                                className="px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-400"
                              />
                            ) : (
                              <span onClick={e => startEdit(e, field, value || '')} className="cursor-text hover:bg-gray-100 rounded px-1 py-0.5 transition-colors inline-flex items-center gap-1 group/dc flex-col" title="Click to edit date">
                                {value ? (
                                  <>
                                    <span className="text-[11px] font-extrabold text-gray-800">{formatDate(value, dateFormat)}</span>
                                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded">{new Date(value).toLocaleDateString("en-US", { weekday: "short" })}</span>
                                  </>
                                ) : <span className="text-gray-400 text-[10px] italic hover:text-blue-500 transition-colors">+ Date</span>}
                                <span className="opacity-0 group-hover/dc:opacity-50 transition-opacity text-[9px]">✏️</span>
                              </span>
                            );

                          const InlineLink = ({ field, value, label }: { field: string; value?: string; label: string }) =>
                            isEd(field) ? (
                              <input 
                                autoFocus 
                                type="text" 
                                value={inlineEdit!.value} 
                                onChange={e => setInlineEdit({ ...inlineEdit!, value: e.target.value })} 
                                onBlur={() => saveInlineEdit(field, inlineEdit!.value)} 
                                onKeyDown={e => { if (e.key === 'Enter') saveInlineEdit(field, inlineEdit!.value); if (e.key === 'Escape') setInlineEdit(null); }} 
                                onClick={e => e.stopPropagation()} 
                                placeholder="Paste URL..." 
                                className="w-full max-w-[120px] px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-blue-400" 
                              />
                            ) : value ? (
                              <div className="flex items-center justify-center gap-0.5 group/lc">
                                <a href={value} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="px-2 py-0.5 font-bold rounded-md text-[10px] flex items-center gap-1 border bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100">{label}</a>
                                <button onClick={e => startEdit(e, field, value)} className="opacity-0 group-hover/lc:opacity-60 text-[9px] hover:opacity-100 transition-opacity ml-0.5">✏️</button>
                              </div>
                            ) : (
                              <button onClick={e => startEdit(e, field, '')} className="text-gray-400 text-[10px] italic hover:text-blue-500 transition-colors">+ {label}</button>
                            );

                          const InlineStatus = ({ field, value, options }: { field: string; value?: string; options: string[] }) => (
                            <select 
                              value={value || ''}
                              onChange={(e) => saveInlineEdit(field, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md border focus:outline-none cursor-pointer appearance-none text-center ${
                                value === 'Done' || value === 'Published' || value === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                value === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                value === 'Pending' || value === 'Pending Approval' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-gray-50 text-gray-700 border-gray-200'
                              }`}
                            >
                              <option value="">Select...</option>
                              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          );

                          return (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition-all group h-[80px]">
                              <td className="px-5 py-3">
                                <InlineDate field="date" value={item.date} />
                              </td>
                              <td className="px-5 py-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${getTypeColor(item.type)}`}>{item.type}</span>
                              </td>
                              <td className="px-5 py-3 max-w-[200px]">
                                <InlineText field="title" value={item.title} placeholder="Idea Name" />
                              </td>
                              <td className="px-5 py-3">
                                <InlineText field="brandPerson" value={item.brandPerson} placeholder="Assignee" />
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex flex-col items-center gap-1">
                                  <InlineDate field="scriptDate" value={item.scriptDate} />
                                  <InlineLink field="script" value={item.script} label="Doc" />
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex flex-col items-center gap-1">
                                  <InlineDate field="shootDate" value={item.shootDate} />
                                  <InlineStatus field="shootStatus" value={item.shootStatus} options={['Pending', 'In Progress', 'Done']} />
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex flex-col items-center gap-1">
                                  <InlineDate field="editingDate" value={item.editingDate} />
                                  <InlineStatus field="editingStatus" value={item.editingStatus} options={['Pending', 'In Progress', 'Done']} />
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex flex-col items-center gap-1">
                                  <InlineDate field="thumbnailDate" value={item.thumbnailDate} />
                                  <InlineLink field="thumbnail" value={item.thumbnail} label="Asset" />
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex flex-col items-center gap-1">
                                  <InlineDate field="captionDate" value={item.captionDate} />
                                  <InlineLink field="caption" value={item.caption} label="Doc" />
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex flex-col items-center gap-1">
                                  <InlineDate field="postingDate" value={item.postingDate} />
                                  <InlineStatus field="instagramStatus" value={item.instagramStatus} options={['Pending', 'Drafted', 'Scheduled', 'Published']} />
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <InlineText field="issues" value={item.issues} placeholder="No issues" />
                              </td>
                              <td className="px-5 py-3">
                                <InlineStatus field="status" value={item.status} options={['To Do', 'In Progress', 'Pending Approval', 'Approved', 'Published']} />
                              </td>
                              <td className="px-5 py-3">
                                <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50">
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {isBulkAddModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsBulkAddModalOpen(false)}></div>
          <div className="relative bg-[#f8fafc] shadow-2xl rounded-2xl w-full max-w-[550px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-gray-50/50">
              <div>
                <h2 className="text-xl font-black text-gray-800 tracking-tight">Bulk Add Options</h2>
                <p className="text-xs text-gray-500 mt-1">Select dates visually or generate using a range</p>
              </div>
              <button onClick={() => setIsBulkAddModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-gray-200 bg-gray-100/50 p-2 gap-2">
              <button
                onClick={() => setBulkAddTab('range')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  bulkAddTab === 'range' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                📅 Date Range & Weekdays
              </button>
              <button
                onClick={() => setBulkAddTab('visual')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  bulkAddTab === 'visual' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                ✨ Visual Calendar Sync
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              
              {bulkAddTab === 'range' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Start Date</label>
                      <input type="date" value={bulkStartDate} onChange={e => setBulkStartDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-gray-700" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">End Date</label>
                      <input type="date" value={bulkEndDate} onChange={e => setBulkEndDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-gray-700" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Days of the Week</label>
                    <div className="flex justify-between items-center gap-1.5 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                      {daysConfig.map((day, i) => (
                        <button
                          key={i}
                          onClick={() => toggleBulkDay(day.index)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black transition-all border ${
                            bulkSelectedDays.includes(day.index) ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Format Type</label>
                    <select value={bulkFormatType} onChange={e => setBulkFormatType(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-gray-700">
                      <option value="Post">Post</option>
                      <option value="Reel">Reel</option>
                      <option value="Story">Story</option>
                      <option value="Carousel">Carousel</option>
                    </select>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button onClick={handleGenerateBulkSlots} className="px-6 py-2.5 bg-blue-500 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md">
                      Generate Range Slots
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-[11px] text-gray-500 text-center font-medium px-4">
                    Click on dates below to select them. A <span className="font-bold text-blue-600">{bulkFormatType}</span> slot will be added for each selected date.
                  </p>
                  
                  {/* Calendar Widget */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm select-none">
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={() => setVisualCurrentMonth(new Date(visualCurrentMonth.getFullYear(), visualCurrentMonth.getMonth() - 1, 1))} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                        &larr;
                      </button>
                      <div className="font-bold text-sm text-gray-700">
                        {visualCurrentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </div>
                      <button onClick={() => setVisualCurrentMonth(new Date(visualCurrentMonth.getFullYear(), visualCurrentMonth.getMonth() + 1, 1))} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                        &rarr;
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-1">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {generateCalendarDays().map((dateStr, i) => {
                        if (!dateStr) return <div key={`empty-${i}`} className="h-8"></div>;
                        const dayNum = parseInt(dateStr.split('-')[2]);
                        const isSelected = visualSelectedDates.includes(dateStr);
                        
                        return (
                          <button
                            key={dateStr}
                            onClick={() => toggleVisualDate(dateStr)}
                            className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                              isSelected ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            {dayNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Format Type for Selected Dates</label>
                    <select value={bulkFormatType} onChange={e => setBulkFormatType(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-gray-700">
                      <option value="Post">Post</option>
                      <option value="Reel">Reel</option>
                      <option value="Story">Story</option>
                      <option value="Carousel">Carousel</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-bold text-gray-500">{visualSelectedDates.length} date(s) selected</span>
                    <button onClick={handleGenerateVisualSlots} className="px-6 py-2.5 bg-blue-500 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md">
                      Sync {visualSelectedDates.length} Slots
                    </button>
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
