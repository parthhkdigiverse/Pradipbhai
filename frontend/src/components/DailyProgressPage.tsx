import { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { 
  Search, Filter, CheckCircle2, Clock, X, Star, AlertCircle, MessageSquare, Activity, 
  Award, BarChart3, ChevronRight, Calendar
} from "lucide-react";

export function DailyProgressPage() {
  const { dailyProgressRecords: records, updateDailyProgress, currentUserRole, currentUser, hasPermission } = useData();
  const canVerifyRate = hasPermission(currentUserRole, 'Verify & Rate Reports');
  const isAdminOrManager = currentUserRole === 'Admin' || currentUserRole === 'Manager';
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [activeTab, setActiveTab] = useState<"reports" | "employeeRatings">("reports");
  
  // Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [pendingListModalOpen, setPendingListModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [currentRating, setCurrentRating] = useState<number>(0);
  const [currentRemarks, setCurrentRemarks] = useState("");

  // Filtered daily reports by search, status, date, and user role
  const filteredRecords = records.filter(rec => {
    const matchesSearch = rec.employeeName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || rec.verificationStatus === statusFilter;
    const matchesDate = rec.date >= startDate && rec.date <= endDate;
    const matchesUser = isAdminOrManager || rec.employeeName.toLowerCase() === currentUser.name.toLowerCase();
    return matchesSearch && matchesStatus && matchesDate && matchesUser;
  });

  // Calculate Overall Ratings per Employee for the selected Date Range
  const employeeRatingStats = useMemo(() => {
    const map: Record<string, { totalRating: number; verifiedCount: number; totalReports: number; role: string }> = {};
    
    records.forEach(rec => {
      if (rec.date >= startDate && rec.date <= endDate) {
        if (!map[rec.employeeName]) {
          map[rec.employeeName] = { totalRating: 0, verifiedCount: 0, totalReports: 0, role: rec.role || "Staff Member" };
        }
        map[rec.employeeName].totalReports += 1;
        if (rec.verificationStatus === "Verified" && rec.rating) {
          map[rec.employeeName].totalRating += rec.rating;
          map[rec.employeeName].verifiedCount += 1;
        }
      }
    });

    return Object.entries(map).map(([name, data]) => {
      const numericAvg = data.verifiedCount > 0 ? (data.totalRating / data.verifiedCount) : 0;
      return {
        employeeName: name,
        role: data.role,
        avgRating: data.verifiedCount > 0 ? numericAvg.toFixed(1) : "N/A",
        numericAvg,
        verifiedCount: data.verifiedCount,
        totalReports: data.totalReports
      };
    }).sort((a, b) => b.numericAvg - a.numericAvg);
  }, [records, startDate, endDate]);

  // Overall stats for selected date range
  const rangeVerifiedRecords = records.filter(r => r.date >= startDate && r.date <= endDate && r.verificationStatus === "Verified" && r.rating);
  const rangeAvgRating = rangeVerifiedRecords.length > 0 
    ? (rangeVerifiedRecords.reduce((acc, curr) => acc + (curr.rating || 0), 0) / rangeVerifiedRecords.length).toFixed(1)
    : "N/A";

  const pendingCount = records.filter(r => r.verificationStatus === "Pending").length;

  const handleOpenVerify = (record: any) => {
    setSelectedRecord(record);
    setCurrentRating(record.rating || 0);
    setCurrentRemarks(record.managerRemarks || "");
    setVerifyModalOpen(true);
  };

  const handleVerifySubmit = () => {
    if (!selectedRecord) return;
    
    updateDailyProgress(selectedRecord.id, {
      verification_status: "Verified",
      rating: currentRating,
      manager_remarks: currentRemarks,
      verified_by: "Current Manager"
    });
    
    setVerifyModalOpen(false);
    setSelectedRecord(null);
  };

  const getRatingBadgeColor = (avg: number | string) => {
    if (avg === "N/A") return "bg-gray-100 text-gray-600 border-gray-200";
    const num = Number(avg);
    if (num >= 4.5) return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
    if (num >= 3.5) return "bg-sky-500/10 text-sky-700 border-sky-500/30";
    if (num >= 2.5) return "bg-amber-500/10 text-amber-700 border-amber-500/30";
    return "bg-rose-500/10 text-rose-700 border-rose-500/30";
  };

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
            Track daily work, verify completed tasks, and monitor employee ratings across date ranges.
          </p>
        </div>

        {/* View Mode Tab Switcher */}
        <div className="flex items-center gap-1 bg-white/40 backdrop-blur-md p-1.5 border border-white/60 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "reports" 
                ? "bg-primary text-white shadow-md" 
                : "text-gray-600 hover:bg-white/50"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Daily Reports
          </button>
          <button
            onClick={() => setActiveTab("employeeRatings")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "employeeRatings" 
                ? "bg-primary text-white shadow-md" 
                : "text-gray-600 hover:bg-white/50"
            }`}
          >
            <Award className="w-4 h-4" />
            Overall Employee Ratings
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-sm">
          <div className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-1">Reports in Selected Range</div>
          <div className="text-4xl font-black text-gray-900">{filteredRecords.length}</div>
          <div className="text-[11px] font-semibold text-gray-400 mt-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400" /> {startDate} to {endDate}
          </div>
        </div>

        <div 
          className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 shadow-sm cursor-pointer hover:bg-amber-500/10 transition-colors group"
          onClick={() => setPendingListModalOpen(true)}
        >
          <div className="text-amber-600 font-bold text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
            Pending Verification
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-md font-bold">View All</span>
          </div>
          <div className="text-4xl font-black text-amber-700">{pendingCount}</div>
          <div className="text-[11px] font-semibold text-amber-600/80 mt-1">Requires manager review</div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 shadow-sm">
          <div className="text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">Range Avg Rating</div>
          <div className="text-4xl font-black text-emerald-700 flex items-end gap-2">
            {rangeAvgRating} {rangeAvgRating !== "N/A" && <Star className="w-7 h-7 text-emerald-500 mb-1 fill-emerald-500" />}
          </div>
          <div className="text-[11px] font-semibold text-emerald-600/80 mt-1">Based on verified range records</div>
        </div>
      </div>

      {/* Date Range & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/40 backdrop-blur-md border border-white/60 p-4 rounded-2xl shadow-sm">
        
        {/* Search Box */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search employee name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
          />
        </div>

        {/* Date Range Controls & Filters */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-white/50 border border-white/60 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">Range:</span>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-1 py-1 bg-transparent focus:outline-none text-xs font-bold text-gray-800 cursor-pointer"
            />
            <span className="text-gray-400 text-xs font-bold">to</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-1 py-1 bg-transparent focus:outline-none text-xs font-bold text-gray-800 cursor-pointer"
            />
          </div>

          {activeTab === "reports" && (
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 z-10" />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)} 
                className="h-[40px] pl-9 pr-4 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-xs font-bold cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending Verification</option>
                <option value="Verified">Verified</option>
              </select>
            </div>
          )}

          {(search !== "" || statusFilter !== "All") && (
            <button 
              onClick={() => {
                setSearch("");
                setStatusFilter("All");
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area based on Tab */}
      {activeTab === "employeeRatings" ? (
        
        /* OVERALL EMPLOYEE RATING SUMMARY SECTION */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" /> Overall Employee Ratings ({startDate} to {endDate})
            </h2>
            <span className="text-xs font-bold text-gray-500 bg-white/50 border border-white/60 px-3 py-1.5 rounded-xl">
              {employeeRatingStats.length} Employees Rated
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {employeeRatingStats
              .filter(emp => emp.employeeName.toLowerCase().includes(search.toLowerCase()))
              .map(emp => (
                <div key={emp.employeeName} className="bg-white/40 backdrop-blur-md border border-white/60 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-4 relative group">
                  
                  {/* Top Avatar & Name Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-black text-xl border-2 border-white shadow-sm">
                        {emp.employeeName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base leading-tight">{emp.employeeName}</h3>
                        <p className="text-xs font-semibold text-gray-500">{emp.role}</p>
                      </div>
                    </div>
                    
                    {/* Rating Badge */}
                    <div className={`px-3 py-1.5 rounded-2xl border text-sm font-black flex items-center gap-1 shadow-sm ${getRatingBadgeColor(emp.avgRating)}`}>
                      <span>{emp.avgRating}</span>
                      {emp.avgRating !== "N/A" && <Star className="w-4 h-4 fill-current" />}
                    </div>
                  </div>

                  {/* Rating Visual Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-500">
                      <span>Performance Score</span>
                      <span>{emp.avgRating !== "N/A" ? `${((Number(emp.avgRating) / 5) * 100).toFixed(0)}%` : "0%"}</span>
                    </div>
                    <div className="w-full bg-gray-200/60 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          Number(emp.avgRating) >= 4.5 ? 'bg-emerald-500' :
                          Number(emp.avgRating) >= 3.5 ? 'bg-sky-500' :
                          Number(emp.avgRating) >= 2.5 ? 'bg-amber-500' : 'bg-gray-400'
                        }`}
                        style={{ width: emp.avgRating !== "N/A" ? `${(Number(emp.avgRating) / 5) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>

                  {/* Stats Breakdown */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/60 text-xs">
                    <div className="bg-white/50 p-2.5 rounded-xl border border-white/60">
                      <span className="text-gray-400 font-bold block text-[10px] uppercase">Verified Reports</span>
                      <span className="text-sm font-black text-gray-800">{emp.verifiedCount} / {emp.totalReports}</span>
                    </div>
                    <div className="bg-white/50 p-2.5 rounded-xl border border-white/60">
                      <span className="text-gray-400 font-bold block text-[10px] uppercase">Rating Range</span>
                      <span className="text-sm font-black text-gray-800">
                        {emp.avgRating !== "N/A" ? `${emp.avgRating} / 5.0` : "Unrated"}
                      </span>
                    </div>
                  </div>

                  {/* Filter by this Employee Action */}
                  <button
                    onClick={() => {
                      setSearch(emp.employeeName);
                      setActiveTab("reports");
                    }}
                    className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 group-hover:bg-primary group-hover:text-white"
                  >
                    View Individual Reports <ChevronRight className="w-4 h-4" />
                  </button>

                </div>
              ))}

            {employeeRatingStats.length === 0 && (
              <div className="col-span-full p-12 text-center text-gray-500 bg-white/40 backdrop-blur-md border border-dashed border-white/60 rounded-3xl">
                No verified ratings found for the selected date range ({startDate} to {endDate}).
              </div>
            )}
          </div>
        </div>

      ) : (

        /* DAILY REPORTS GRID VIEW */
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
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${
                    record.verificationStatus === "Verified"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  }`}>
                    {record.verificationStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {record.date}</span>
                  <span className="text-[10px] text-gray-400">Submitted {record.submittedAt}</span>
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
                      <li key={task.id} className="text-xs text-gray-600 line-clamp-1 flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        {task.description}
                      </li>
                    ))}
                    {record.tasksDone.length > 2 && (
                      <li className="text-xs text-gray-400 font-medium pl-3">
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
                        <li key={task.id} className="text-xs text-gray-600 line-clamp-1 flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
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
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < (record.rating || 0) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`} 
                      />
                    ))}
                    <span className="text-xs font-bold text-gray-700 ml-1">{record.rating}.0</span>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                    Needs Review
                  </div>
                )}
                
                <button 
                  onClick={() => handleOpenVerify(record)}
                  className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  {canVerifyRate ? (record.verificationStatus === "Verified" ? "View Details" : "Verify & Rate") : "View Details"}
                </button>
              </div>

            </div>
          ))}

          {filteredRecords.length === 0 && (
            <div className="col-span-full p-12 text-center text-gray-500 bg-white/40 backdrop-blur-md border border-dashed border-white/60 rounded-3xl">
              No daily progress reports match your search criteria for the range ({startDate} to {endDate}).
            </div>
          )}
        </div>
      )}

      {/* Verification Modal */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                  {selectedRecord?.employeeName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedRecord?.employeeName}</h2>
                  <p className="text-sm text-gray-500">{selectedRecord?.role} • Submitted on {selectedRecord?.date} at {selectedRecord?.submittedAt}</p>
                </div>
              </div>
              <button onClick={() => setVerifyModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Tasks List */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold flex items-center gap-2 text-emerald-600 mb-3 pb-2 border-b border-gray-100">
                      <CheckCircle2 className="w-5 h-5" />
                      Completed Tasks
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
                      <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-xl text-center">No tasks completed today.</div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold flex items-center gap-2 text-amber-600 mb-3 pb-2 border-b border-gray-100">
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
                      <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-xl text-center">No pending tasks! 🎉</div>
                    )}
                  </div>
                </div>

                {/* Rating & Verification Section */}
                <div className="bg-gray-50/70 p-6 rounded-2xl border border-gray-100 flex flex-col space-y-6">
                  <div>
                    <h3 className="font-bold flex items-center gap-2 mb-4 text-gray-800">
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                      Rate Performance (1 to 5 Stars)
                    </h3>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setCurrentRating(star)}
                          className={`p-2 rounded-xl transition-all hover:scale-110 ${
                            currentRating >= star 
                              ? "bg-amber-400/20 text-amber-500" 
                              : "bg-gray-100 text-gray-300 hover:bg-gray-200"
                          }`}
                        >
                          <Star className={`w-7 h-7 ${currentRating >= star ? "fill-amber-400" : ""}`} />
                        </button>
                      ))}
                    </div>
                    {currentRating > 0 && (
                      <p className="text-xs font-bold text-amber-600 mt-2">
                        {currentRating} out of 5 stars selected
                      </p>
                    )}
                  </div>

                  <div className="flex-grow flex flex-col">
                    <h3 className="font-bold flex items-center gap-2 mb-3 text-gray-800">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      Manager Remarks
                    </h3>
                    <textarea
                      value={currentRemarks}
                      onChange={(e) => setCurrentRemarks(e.target.value)}
                      placeholder="Add feedback or performance notes..."
                      className="w-full flex-grow min-h-[100px] px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium resize-none"
                    />
                  </div>
                  
                  {selectedRecord?.verificationStatus === "Verified" && (
                    <div className="bg-emerald-500/10 text-emerald-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" />
                      Verified by {selectedRecord?.verifiedBy}
                    </div>
                  )}
                </div>
                
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 md:px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 mt-auto shrink-0">
              <button 
                onClick={() => setVerifyModalOpen(false)}
                className="px-4 py-2.5 font-bold text-gray-500 hover:bg-gray-200/60 rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleVerifySubmit}
                disabled={currentRating === 0}
                className="px-6 py-2.5 bg-primary text-white hover:bg-primary/90 font-bold rounded-xl transition-colors disabled:opacity-50 shadow-md text-sm"
              >
                {selectedRecord?.verificationStatus === "Verified" ? "Update Rating" : "Approve & Verify"}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Pending List Modal */}
      {pendingListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Pending Verifications
                </h2>
                <p className="text-sm text-gray-500 mt-1">Reports waiting for manager review.</p>
              </div>
              <button 
                onClick={() => setPendingListModalOpen(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-3 overflow-y-auto max-h-[70vh]">
              {records.filter(r => r.verificationStatus === "Pending").map(record => (
                <div key={record.id} className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50 flex justify-between items-center hover:border-primary/50 transition-colors">
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
                    className="text-xs font-bold bg-primary text-white px-3 py-1.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Review
                  </button>
                </div>
              ))}
              {records.filter(r => r.verificationStatus === "Pending").length === 0 && (
                <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-2xl font-medium text-sm">
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
