import { useState, useMemo } from 'react';
import { Megaphone, Calendar as CalendarIcon, Plus, X, CheckCircle2, Circle } from 'lucide-react';
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

  // Calendar Modal State
  const [activeProject, setActiveProject] = useState<any>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
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

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'Post': return 'bg-blue-100 text-blue-700';
      case 'Reel': return 'bg-pink-100 text-pink-700';
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
            <Megaphone className="w-6 h-6 text-pink-500" />
            Social Media
          </h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">
            Manage your social media projects and their content calendars.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {smProjects.length > 0 ? (
          smProjects.map((proj, idx) => (
            <div key={idx} className="glass-panel border border-white/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{proj.name}</h3>
                  <p className="text-sm font-semibold text-gray-500 mt-1">{proj.clientName} • {proj.clientContact}</p>
                </div>
                <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">{proj.status}</span>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <span className="block text-xl font-black text-gray-800">{proj.contentCalendar?.length || 0}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Posts Planned</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenCalendar(proj)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold rounded-xl shadow-md shadow-pink-500/20 hover:shadow-lg hover:shadow-pink-500/30 transition-all hover:-translate-y-0.5"
                >
                  <CalendarIcon className="w-4 h-4" />
                  Content Calendar
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-white/30 rounded-2xl border border-white/50 border-dashed">
            <Megaphone className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">No Social Media Projects</h3>
            <p className="text-gray-500 max-w-sm mx-auto text-sm">
              Create a new project in the Clients tab and set its category to "Social Media" to manage it here.
            </p>
          </div>
        )}
      </div>

      {/* Content Calendar Modal */}
      {isCalendarModalOpen && activeProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseCalendar}></div>
          <div className="relative bg-[#f8fafc] shadow-2xl rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-pink-500" />
                  Content Calendar
                </h2>
                <p className="text-sm font-semibold text-gray-500 mt-1">{activeProject.name} • {activeProject.clientName}</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsAddingItem(true)}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Idea
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
                      <input required type="text" value={newItemForm.title} onChange={e => setNewItemForm({...newItemForm, title: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50" placeholder="e.g. Product Launch Reel" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Type</label>
                      <select value={newItemForm.type} onChange={e => setNewItemForm({...newItemForm, type: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50">
                        <option value="Post">Post</option>
                        <option value="Reel">Reel</option>
                        <option value="Story">Story</option>
                        <option value="Carousel">Carousel</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Scheduled Date</label>
                      <input type="date" value={newItemForm.date} onChange={e => setNewItemForm({...newItemForm, date: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50" />
                    </div>
                    <div className="md:col-span-4 flex justify-end mt-2">
                      <button type="submit" className="px-5 py-2 bg-pink-500 text-white text-sm font-bold rounded-xl hover:bg-pink-600 transition-colors">Save Content</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-3">
                {activeProject.contentCalendar && activeProject.contentCalendar.length > 0 ? (
                  [...activeProject.contentCalendar].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-pink-300 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                          {item.status === 'Published' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-gray-300" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">{item.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${getTypeColor(item.type)}`}>{item.type}</span>
                            <span className="text-xs font-medium text-gray-500">{item.date ? formatDate(item.date, dateFormat) : 'No date set'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <select 
                          value={item.status}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            const updatedCalendar = activeProject.contentCalendar.map((i: any) => i.id === item.id ? {...i, status: newStatus} : i);
                            const updatedProjectData = { ...activeProject, contentCalendar: updatedCalendar };
                            const { clientId, clientName, clientContact, originalProjectIndex, ...pureProjectData } = updatedProjectData;
                            updateProject(activeProject.clientId, activeProject.originalProjectIndex, pureProjectData);
                            setActiveProject(updatedProjectData);
                          }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border focus:outline-none ${
                            item.status === 'Published' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                            item.status === 'Approved' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                            item.status === 'In Progress' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            'bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                        >
                          <option value="To Do">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Pending Approval">Pending Approval</option>
                          <option value="Approved">Approved</option>
                          <option value="Published">Published</option>
                        </select>
                        <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                    <CalendarIcon className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-700 mb-1">Calendar is empty</h3>
                    <p className="text-sm text-gray-500">Click 'Add Idea' to start planning content.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
