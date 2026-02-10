
import { useState } from 'react';
import React from 'react';
import { 
  LayoutDashboard, 
  Camera, 
  History, 
  Settings, 
  CheckCircle2, 
  XCircle,
  BarChart3,
  Search,
  RefreshCcw,
  Zap,
  Package,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { InspectionResult, InspectionStatus, QCStats } from './types';
import InspectionView from './components/InspectionView';
import { analyzeProductImage } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inspect' | 'history'>('dashboard');
  const [history, setHistory] = useState<InspectionResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [stats, setStats] = useState<QCStats>({
    totalInspected: 0,
    passed: 0,
    failed: 0,
    defectTrends: [
      { name: 'Scratches', count: 0 },
      { name: 'Misalign', count: 0 },
      { name: 'Color', count: 0 },
      { name: 'Cracks', count: 0 },
      { name: 'Label', count: 0 },
    ]
  });

  const handleNewInspection = async (imageData: string) => {
    setIsAnalyzing(true);
    try {
      const cleanBase64 = imageData.split(',')[1];
      const result = await analyzeProductImage(cleanBase64);
      
      const newResult: InspectionResult = {
        id: `QC-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        status: result.status as InspectionStatus,
        confidence: result.confidence,
        defects: result.defects,
        imageUrl: imageData,
        productType: result.productType || "Detected Item"
      };

      setHistory(prev => [newResult, ...prev].slice(0, 50));
      
      setStats(prev => ({
        ...prev,
        totalInspected: prev.totalInspected + 1,
        passed: result.status === 'PASS' ? prev.passed + 1 : prev.passed,
        failed: result.status === 'FAIL' ? prev.failed + 1 : prev.failed,
        defectTrends: result.status === 'FAIL' 
          ? prev.defectTrends.map(dt => {
              const defectFound = result.defects.find((d: any) => d.type.toLowerCase().includes(dt.name.toLowerCase()));
              return defectFound ? { ...dt, count: dt.count + 1 } : dt;
            })
          : prev.defectTrends
      }));

    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <nav className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">VisionQC</span>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('inspect')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'inspect' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Camera className="w-5 h-5" />
            <span className="font-medium">Live Inspection</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <History className="w-5 h-5" />
            <span className="font-medium">History Log</span>
          </button>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase font-bold mb-2">System Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">AI Core Active</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-slate-800">
            {activeTab === 'dashboard' && 'Operations Dashboard'}
            {activeTab === 'inspect' && 'Dynamic AI Inspection'}
            {activeTab === 'history' && 'Audit History'}
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              <span>Shift: A-Morning</span>
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  label="Total Inspected" 
                  value={stats.totalInspected.toLocaleString()} 
                  icon={<Package className="text-blue-600" />} 
                  trend="Monitoring live"
                />
                <StatCard 
                  label="Yield Rate" 
                  value={stats.totalInspected > 0 ? `${((stats.passed / stats.totalInspected) * 100).toFixed(1)}%` : '0%'} 
                  icon={<CheckCircle2 className="text-emerald-600" />} 
                  trend="Target: 95%"
                  trendColor="text-emerald-600"
                />
                <StatCard 
                  label="Rejection Count" 
                  value={stats.failed.toLocaleString()} 
                  icon={<XCircle className="text-rose-600" />} 
                  trend="Active shift"
                  trendColor="text-rose-600"
                />
                <StatCard 
                  label="AI Accuracy" 
                  value="99.2%" 
                  icon={<Zap className="text-amber-600" />} 
                  trend="Certified Model"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-800">Defect Distribution</h2>
                    <select className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                      <option>Last 24 Hours</option>
                      <option>Last 7 Days</option>
                    </select>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.defectTrends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {stats.defectTrends.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'][index % 5]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-lg font-bold text-slate-800 mb-6">Recent Inspections</h2>
                  <div className="space-y-4">
                    {history.length > 0 ? (
                      history.slice(0, 5).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${item.status === 'PASS' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                            <div>
                              <p className="text-sm font-semibold text-slate-700">{item.id}</p>
                              <p className="text-xs text-slate-500">{item.productType}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${item.status === 'PASS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {item.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-400">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No scans yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inspect' && (
            <div className="max-w-4xl mx-auto">
              <InspectionView 
                onInspect={handleNewInspection} 
                isAnalyzing={isAnalyzing} 
                lastResult={history[0]}
              />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search logs..." 
                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button className="flex items-center gap-2 text-sm text-blue-600 font-semibold">
                  <RefreshCcw className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-sm">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Asset ID</th>
                    <th className="px-6 py-4 font-semibold">Product Type</th>
                    <th className="px-6 py-4 font-semibold">Timestamp</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Confidence</th>
                    <th className="px-6 py-4 font-semibold">Defects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700">{item.id}</td>
                      <td className="px-6 py-4 text-slate-600">{item.productType}</td>
                      <td className="px-6 py-4 text-slate-500">{item.timestamp}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.status === 'PASS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {item.status === 'PASS' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{(item.confidence * 100).toFixed(0)}%</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {item.defects.length > 0 ? (
                            item.defects.map((d, i) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] uppercase font-bold">
                                {d.type}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                        No inspection history recorded for this shift.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  trendColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, trend, trendColor = 'text-slate-500' }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
      <span className={`text-xs font-medium ${trendColor}`}>{trend}</span>
    </div>
    <p className="text-slate-500 text-sm mb-1">{label}</p>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

export default App;
