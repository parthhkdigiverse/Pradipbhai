import { useState } from "react";
import { useData } from "../context/DataContext";
import { Search, Filter, CheckCircle2, Clock, X, Star, AlertCircle, MessageSquare, Activity } from "lucide-react";






export function DailyProgressPage() {
  const { dailyProgressRecords: records, setDailyProgressRecords: setRecords } = useData();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<string>("All");
  

  // Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [pendingListModalOpen, setPendingListModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [currentRating, setCurrentRating] = useState<number>(0);
  const [currentRemarks, setCurrentRemarks] = useState("");

  const filteredRecords = records.filter(rec => {
    const matchesSearch = rec.employeeName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || rec.verificationStatus === statusFilter;
    const matchesDate = rec.date >= startDate && rec.date <= endDate;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleOpenVerify = (record: any) => {
    setSelectedRecord(record);
    setCurrentRating(record.rating || 0);
    setCurrentRemarks(record.managerRemarks || "");
    setVerifyModalOpen(true);
  };

  const handleVerifySubmit = () => {
    if (!selectedRecord) return;
    
    setRecords(records.map(rec => {
      if (rec.id === selectedRecord.id) {
        return {
          ...rec,
          verificationStatus: "Verified",
          rating: currentRating,
          managerRemarks: currentRemarks,
          verifiedBy: "Current Manager" // Mock active user
        };
      }
      return rec;
    }));
    
    setVerifyModalOpen(false);
    setSelectedRecord(null);
  };

  const pendingCount = records.filter(r => r.verificationStatus === "Pending").length;
  const verifiedCount = records.filter(r => r.verificationStatus === "Verified").length;
  
  const avgRating = verifiedCount > 0 
    ? (records.reduce((acc, curr) => acc + (curr.rating || 0), 0) / verifiedCount).toFixed(1)
    : "N/A";

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" />
            Daily Progress Hub
          </h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">
            Track daily work, verify completed tasks, and provide performance ratings.
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-sm">
          <div className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-1">Total Reports (All Time)</div>
          <div className="text-4xl font-black">{records.length}</div>
        </div>
        <div 
          className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 shadow-sm cursor-pointer hover:bg-amber-500/10 transition-colors group"
          onClick={() => setPendingListModalOpen(true)}
        >
          <div className="text-amber-600 font-bold text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
            Pending Verification
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-md">View All</span>
          </div>
          <div className="text-4xl font-black text-amber-700">{pendingCount}</div>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 shadow-sm">
          <div className="text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">Avg Rating (All Time)</div>
          <div className="text-4xl font-black text-emerald-700 flex items-end gap-2">
            {avgRating} <Star className="w-6 h-6 text-emerald-500 mb-1 fill-emerald-500" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/40 backdrop-blur-md border border-white/60 p-4 rounded-2xl shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search employee names..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto bg-white/50 border border-white/60 rounded-xl px-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto px-2 py-2.5 bg-transparent focus:outline-none text-sm font-bold appearance-none cursor-pointer"
            />
            <span className="text-gray-500 text-sm font-bold">to</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto px-2 py-2.5 bg-transparent focus:outline-none text-sm font-bold appearance-none cursor-pointer"
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 z-10" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-[200px] h-[42px] pl-9 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-bold cursor-pointer"><option value="All">All Statuses</option><option value="Pending">Pending Verification</option><option value="Verified">Verified</option></select>
          </div>
          {(search !== "" || statusFilter !== "All") && (
            <button 
              onClick={() => {
                setSearch("");
                setStatusFilter("All");
              }}
              className="ml-auto flex items-center gap-2 text-sm font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Progress Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredRecords.map((record) => (
          <div key={record.id} className="bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
            
            {/* Header info */}
            <div className="p-5 border-b border-white/60 bg-white/30">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-lg">
                    {record.employeeName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 leading-tight">{record.employeeName}</div>
                    <div className="text-xs text-gray-500">{record.role}</div>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase border Verified bg-emerald-500/10 text-emerald-600 border-emerald-500/20 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  {record.verificationStatus}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                {record.date} • Submitted at {record.submittedAt}
              </div>
            </div>

            {/* Task Summary */}
            <div className="p-5 flex-grow space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2 text-sm font-bold text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Completed Tasks ({record.tasksDone.length})
                </div>
                <ul className="space-y-1.5">
                  {record.tasksDone.slice(0, 2).map((task: any) => (
                    <li key={task.id} className="text-xs text-gray-500 line-clamp-1 flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      {task.description}
                    </li>
                  ))}
                  {record.tasksDone.length > 2 && (
                    <li className="text-xs text-gray-500 font-medium pl-2.5">
                      +{record.tasksDone.length - 2} more...
                    </li>
                  )}
                </ul>
              </div>

              {record.tasksPending.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-bold text-amber-600">
                    <Clock className="w-4 h-4" />
                    Pending Tasks ({record.tasksPending.length})
                  </div>
                  <ul className="space-y-1.5">
                    {record.tasksPending.slice(0, 2).map((task: any) => (
                      <li key={task.id} className="text-xs text-gray-500 line-clamp-1 flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        {task.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Actions / Rating Footer */}
            <div className="p-4 border-t border-white/60 bg-white/30 flex items-center justify-between">
              {record.verificationStatus === "Verified" ? (
                <div className="flex items-center gap-2 text-emerald-500 font-black">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      className="w-4 h-4 fill-emerald-500 text-emerald-500 fill-transparent text-emerald-500/30" 
                    />
                  ))}
                </div>
              ) : (
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Needs Review
                </div>
              )}
              
              <button 
                onClick={() => handleOpenVerify(record)}
                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                {record.verificationStatus === "Verified" ? "View Details" : "Verify & Rate"}
              </button>
            </div>
          </div>
        ))}
        {filteredRecords.length === 0 && (
          <div className="col-span-full p-12 text-center text-gray-500 bg-white/40 backdrop-blur-md border border-dashed border-white/60 rounded-2xl">
            No daily progress reports match your search criteria.
          </div>
        )}
      </div>

      {/* Verification Modal */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/60 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                  {selectedRecord?.employeeName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedRecord?.employeeName}</h2>
                  <p className="text-sm text-gray-500">{selectedRecord?.role} • Submitted at {selectedRecord?.submittedAt}</p>
                </div>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Tasks List */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold flex items-center gap-2 text-emerald-600 mb-3 pb-2 border-b border-white/60">
                      <CheckCircle2 className="w-5 h-5" />
                      Completed Today
                    </h3>
                    {selectedRecord && selectedRecord.tasksDone.length > 0 ? (
                      <ul className="space-y-3">
                        {selectedRecord.tasksDone.map((task: any) => (
                          <li key={task.id} className="flex items-start gap-3 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="text-sm font-medium text-gray-900">{task.description}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-gray-500 p-4 bg-white/50 rounded-xl text-center">No tasks completed today.</div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold flex items-center gap-2 text-amber-600 mb-3 pb-2 border-b border-white/60">
                      <Clock className="w-5 h-5" />
                      Pending / Blocked
                    </h3>
                    {selectedRecord && selectedRecord.tasksPending.length > 0 ? (
                      <ul className="space-y-3">
                        {selectedRecord.tasksPending.map((task: any) => (
                          <li key={task.id} className="flex items-start gap-3 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                            <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <span className="text-sm font-medium text-gray-900">{task.description}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-gray-500 p-4 bg-white/50 rounded-xl text-center">No pending tasks! 🎉</div>
                    )}
                  </div>
                </div>

                {/* Rating & Verification Section */}
                <div className="bg-white/30 p-6 rounded-2xl border border-white/60 flex flex-col space-y-6">
                  <div>
                    <h3 className="font-bold flex items-center gap-2 mb-4">
                      <Star className="w-5 h-5 text-primary" />
                      Rate Performance
                    </h3>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentRating(i + 1)}
                          className="p-2 rounded-xl transition-all hover:scale-110 text-emerald-500 bg-emerald-500/10 text-gray-500 bg-white/60 hover:bg-white/60"
                        >
                          <Star className="w-8 h-8 fill-emerald-500" />
                        </button>
                      ))}
                    </div>
                    {currentRating > 0 && (
                      <p className="text-sm font-bold text-emerald-600 mt-3">
                        {currentRating} out of 5 stars
                      </p>
                    )}
                  </div>

                  <div className="flex-grow flex flex-col">
                    <h3 className="font-bold flex items-center gap-2 mb-3">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      Manager Remarks
                    </h3>
                    <textarea
                      value={currentRemarks}
                      onChange={(e) => setCurrentRemarks(e.target.value)}
                      placeholder="Add constructive feedback or notes about today's work..."
                      className="w-full flex-grow min-h-[120px] px-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium resize-none"
                    />
                  </div>
                  
                  {selectedRecord?.verificationStatus === "Verified" && (
                    <div className="bg-emerald-500/10 text-emerald-700 p-4 rounded-xl text-sm font-medium flex items-center gap-2 border border-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5" />
                      Verified by {selectedRecord?.verifiedBy}
                    </div>
                  )}
                </div>
                
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 md:px-8 py-4 md:py-6 bg-white/50 border-t border-white/60 flex justify-end gap-3 mt-auto shrink-0">
              <button 
                onClick={() => setVerifyModalOpen(false)}
                className="px-4 py-2.5 font-bold text-gray-500 hover:bg-white/60 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleVerifySubmit}
                disabled={currentRating === 0}
                className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl transition-colors disabled:opacity-50 shadow-sm"
              >
                {selectedRecord?.verificationStatus === "Verified" ? "Update Verification" : "Approve & Verify"}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Pending List Modal */}
      {pendingListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          <div className="p-6 border-b border-white/60 bg-white/30 flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Pending Verifications
              </h2>
              <p className="text-sm text-gray-500 mt-1">All reports waiting for manager review.</p>
            </div>
            <button 
              onClick={() => setPendingListModalOpen(false)}
              className="p-2 text-gray-500 hover:bg-white/60 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[70vh]">
            {records.filter(r => r.verificationStatus === "Pending").map(record => (
              <div key={record.id} className="p-4 border border-white/60 rounded-xl bg-white/40 backdrop-blur-md flex justify-between items-center hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
                    {record.employeeName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{record.employeeName}</div>
                    <div className="text-xs text-gray-500">{record.date} • {record.submittedAt}</div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setPendingListModalOpen(false);
                    handleOpenVerify(record);
                  }}
                  className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Review
                </button>
              </div>
            ))}
            {records.filter(r => r.verificationStatus === "Pending").length === 0 && (
              <div className="text-center p-8 text-gray-500 bg-muted/20 rounded-xl">
                No pending verifications! 🎉
              </div>
            )}
          </div>
        </div>
      </div>
      )}

    </div>
  );
}
