import { useState } from 'react';
import { 
  LayoutDashboard, 
  Boxes, 
  GitBranch, 
  Database, 
  MapPin,
  AlertTriangle,
  ChevronRight,
  Menu,
  X,
  Frame
} from 'lucide-react';
import { Overview } from '@/sections/Overview';
import { Modules } from '@/sections/Modules';
import { Flows } from '@/sections/Flows';
import { DataModel } from '@/sections/DataModel';
import { Roadmap } from '@/sections/Roadmap';
import { Limitations } from '@/sections/Limitations';
import { Wireframes } from '@/sections/Wireframes';

const navItems = [
  { id: 'overview', label: 'Arquitectura', icon: LayoutDashboard },
  { id: 'modules', label: 'Módulos', icon: Boxes },
  { id: 'flows', label: 'Flujos', icon: GitBranch },
  { id: 'data', label: 'Base de Datos', icon: Database },
  { id: 'wireframes', label: 'Wireframes', icon: Frame },
  { id: 'roadmap', label: 'Roadmap', icon: MapPin },
  { id: 'limitations', label: 'Limitaciones', icon: AlertTriangle },
];

function App() {
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderSection = () => {
    switch (activeSection) {
      case 'overview': return <Overview />;
      case 'modules': return <Modules />;
      case 'flows': return <Flows />;
      case 'data': return <DataModel />;
      case 'wireframes': return <Wireframes />;
      case 'roadmap': return <Roadmap />;
      case 'limitations': return <Limitations />;
      default: return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-300 grid-pattern">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#0a0a0f]/90 backdrop-blur border-b border-gray-800 z-50 flex items-center px-4">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="ml-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            P
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">PollosPro</h1>
            <p className="text-xs text-gray-500">Plan Técnico del Sistema</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          <span className="badge badge-orange">v1.0</span>
          <span className="badge badge-green">Planificación</span>
        </div>
      </header>

      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-14 bottom-0 bg-[#0f0f16] border-r border-gray-800 transition-all duration-300 z-40 ${
          sidebarOpen ? 'w-60' : 'w-0 overflow-hidden'
        }`}
      >
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive 
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="text-xs text-gray-500 space-y-1">
            <p>Última actualización:</p>
            <p className="text-gray-400">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={`pt-14 transition-all duration-300 ${
          sidebarOpen ? 'ml-60' : 'ml-0'
        }`}
      >
        <div className="p-6 max-w-7xl">
          {renderSection()}
        </div>
      </main>
    </div>
  );
}

export default App;
