import { DashboardLayout } from './components/DashboardLayout';
import { 
  TrendingUp, 
  TrendingDown,
  Check,
  X,
  Settings,
  FileText
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend
} from 'recharts';

const sparklineData1 = [{ value: 10 }, { value: 15 }, { value: 12 }, { value: 18 }, { value: 25 }, { value: 20 }, { value: 30 }];
const sparklineData2 = [{ value: 20 }, { value: 15 }, { value: 18 }, { value: 12 }, { value: 25 }, { value: 22 }, { value: 35 }];
const sparklineData3 = [{ value: 5 }, { value: 10 }, { value: 8 }, { value: 15 }, { value: 20 }, { value: 18 }, { value: 25 }];
const sparklineData4 = [{ value: 15 }, { value: 20 }, { value: 15 }, { value: 25 }, { value: 22 }, { value: 30 }, { value: 28 }];

const projectData = [
  { name: '15 Jan', active: 85, inprogress: 20, completed: 40 },
  { name: '16 Jan', active: 45, inprogress: 70, completed: 40 },
  { name: '17 Jan', active: 85, inprogress: 20, completed: 40 },
  { name: '18 Jan', active: 45, inprogress: 20, completed: 80 },
  { name: '19 Jan', active: 60, inprogress: 20, completed: 45 },
  { name: '20 Jan', active: 25, inprogress: 20, completed: 45 },
  { name: '21 Jan', active: 75, inprogress: 20, completed: 45 },
];

const radarData = [
  { subject: '2025', male: 90, female: 60 },
  { subject: '2026', male: 70, female: 50 },
  { subject: '2027', male: 80, female: 90 },
  { subject: '2028', male: 60, female: 80 },
  { subject: '2029', male: 50, female: 70 },
];

function MetricCard({ title, value, change, isPositive, data, color }: any) {
  return (
    <div className="glass-panel rounded-2xl p-5 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300">
      <div className="text-gray-500 text-sm font-medium mb-2">{title}</div>
      <div className="flex justify-between items-end">
        <div>
          <div className="text-2xl font-bold text-gray-800 mb-4">{value}</div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {change}%
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">in Last 7 Days</span>
          </div>
        </div>
        <div className="w-24 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm">Admin Dashboard</h1>
        <div className="text-sm text-gray-500 bg-white/40 px-3 py-1.5 rounded-full border border-white/60 backdrop-blur-md">
          Home &gt; <span className="text-gray-800 font-medium">Admin Dashboard</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard title="Working Hours" value="950h 41m" change="20" isPositive={true} data={sparklineData1} color="#3b82f6" />
        <MetricCard title="Production" value="400h 15m" change="20" isPositive={false} data={sparklineData2} color="#f97316" />
        <MetricCard title="Unproductive" value="210h 15m" change="45" isPositive={true} data={sparklineData3} color="#3b82f6" />
        <MetricCard title="Manual Added" value="46h 45m" change="22" isPositive={true} data={sparklineData4} color="#10b981" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Top Members */}
        <div className="glass-panel rounded-2xl relative overflow-hidden">
          <div className="p-5 border-b border-white/40 font-bold text-lg text-gray-800 bg-white/20">Top Members</div>
          <div className="p-5 space-y-6">
            {[
              { name: 'Leon Baxter', role: 'Test Lead', salary: '$6595', img: 'https://i.pravatar.cc/150?u=1' },
              { name: 'Charles Cline', role: 'Security Engineer', salary: '$5145', img: 'https://i.pravatar.cc/150?u=2' },
              { name: 'James Higham', role: 'Android Developer', salary: '$7478', img: 'https://i.pravatar.cc/150?u=3' },
              { name: 'Thomas Ward', role: 'UI Designer', salary: '$4589', img: 'https://i.pravatar.cc/150?u=4' },
              { name: 'Aliza Duncan', role: 'Backend Developer', salary: '$6987', img: 'https://i.pravatar.cc/150?u=5' }
            ].map((member, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={member.img} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <div className="font-semibold text-sm text-gray-800">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.role}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Salary</div>
                  <div className="font-bold text-sm text-gray-800">{member.salary}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Members Overview */}
        <div className="glass-panel rounded-2xl relative overflow-hidden">
          <div className="p-5 border-b border-white/40 font-bold text-lg text-gray-800 bg-white/20">Members Overview</div>
          <div className="p-5 h-[350px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.6)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 12 }} />
                <Radar name="Female" dataKey="female" stroke="#ec4899" fill="#ec4899" fillOpacity={0.1} />
                <Radar name="Male" dataKey="male" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Request Approval */}
        <div className="glass-panel rounded-2xl relative">
          <div className="p-5 border-b border-white/40 font-bold text-lg text-gray-800 flex items-center justify-between bg-white/20 rounded-t-2xl">
            Request Approval
            <button className="w-8 h-8 rounded-lg bg-blue-500/80 backdrop-blur-md text-white flex items-center justify-center absolute -right-4 top-4 shadow-[0_4px_12px_rgba(59,130,246,0.3)] border border-blue-400">
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-6">
            {[
              { name: 'Jonathan King', date: '14 Sep 2025', img: 'https://i.pravatar.cc/150?u=6' },
              { name: 'Peter Brooks', date: '28 Aug 2025', img: 'https://i.pravatar.cc/150?u=7' },
              { name: 'Cindy Mateo', date: '20 Aug 2025', img: 'https://i.pravatar.cc/150?u=8' },
              { name: 'Thomas Walsh', date: '10 Aug 2025', img: 'https://i.pravatar.cc/150?u=9' },
              { name: 'Eliz Hiltner', date: '25 Jul 2025', img: 'https://i.pravatar.cc/150?u=10' }
            ].map((req, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={req.img} alt={req.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <div className="font-semibold text-sm text-gray-800">{req.name}</div>
                    <div className="text-xs text-gray-500">{req.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                  <button className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Statistics */}
        <div className="lg:col-span-2 glass-panel rounded-2xl relative overflow-hidden">
          <div className="p-5 border-b border-white/40 font-bold text-lg text-gray-800 bg-white/20">Project Statistics</div>
          <div className="p-5 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.6)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12 }} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', top: -10 }} />
                <Bar dataKey="active" name="Active" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={12} />
                <Bar dataKey="inprogress" name="Inprogress" fill="#9ca3af" radius={[2, 2, 0, 0]} barSize={12} />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[2, 2, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Projects */}
        <div className="glass-panel rounded-2xl relative">
          <div className="p-5 border-b border-white/40 font-bold text-lg text-gray-800 bg-white/20 rounded-t-2xl">Recent Projects</div>
          <button className="w-8 h-8 rounded-lg bg-blue-500/80 backdrop-blur-md text-white flex items-center justify-center absolute -right-4 top-[50%] shadow-[0_4px_12px_rgba(59,130,246,0.3)] border border-blue-400 z-10 hover:scale-110 transition-transform">
            <Settings className="w-4 h-4" />
          </button>
          <div className="p-5 space-y-4">
            {[
              { id: 'TZ', name: 'TaskZen - Productivity', color: 'bg-blue-100 text-blue-700', tasks: '08 Tasks', budget: '$3500' },
              { id: 'FS', name: 'FlowSpark - Workflow tools', color: 'bg-orange-100 text-orange-700', tasks: '32 Tasks', budget: '$8966' },
              { id: 'CL', name: 'Corelytics - Data tools', color: 'bg-pink-100 text-pink-700', tasks: '56 Tasks', budget: '$7896' },
              { id: 'CP', name: 'CodePulse - Cloud tools', color: 'bg-teal-100 text-teal-700', tasks: '40 Tasks', budget: '$4124' },
              { id: 'PD', name: 'Office Management', color: 'bg-purple-100 text-purple-700', tasks: '48 Tasks', budget: '$4578' }
            ].map((proj, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded font-bold flex items-center justify-center ${proj.color}`}>{proj.id}</div>
                  <div>
                    <div className="font-semibold text-sm text-gray-800">{proj.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <FileText className="w-3 h-3" /> {proj.tasks} | <span className="text-gray-800 font-medium">{proj.budget}</span>
                    </div>
                  </div>
                </div>
                <div className="flex -space-x-2">
                  <img src="https://i.pravatar.cc/150?u=11" className="w-6 h-6 rounded-full border-2 border-white/50 shadow-sm" />
                  <img src="https://i.pravatar.cc/150?u=12" className="w-6 h-6 rounded-full border-2 border-white/50 shadow-sm" />
                  <img src="https://i.pravatar.cc/150?u=13" className="w-6 h-6 rounded-full border-2 border-white/50 shadow-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default App;
