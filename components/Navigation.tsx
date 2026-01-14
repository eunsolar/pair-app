
import React from 'react';
import { Home, Calendar, Sparkles, Users, AlertCircle } from 'lucide-react';
import { ViewState } from '../types';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView }) => {
  const tabs: { id: ViewState; icon: any; label: string }[] = [
    { id: 'characters', icon: Users, label: '캐릭터' },
    { id: 'fortune', icon: Sparkles, label: '운세' },
    { id: 'home', icon: Home, label: '홈' },
    { id: 'calendar', icon: Calendar, label: '달력' },
    { id: 'reports', icon: AlertCircle, label: '신고' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 flex justify-around items-center py-3 px-2 pb-8 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentView === tab.id || (tab.id === 'home' && (currentView === 'detail' || currentView === 'add' || currentView === 'edit'));
        const isCenter = tab.id === 'home';

        return (
          <button 
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative ${isActive ? 'text-rose-500' : 'text-slate-300'}`}
          >
            <div className={`transition-all duration-500 ${isCenter && isActive ? 'bg-rose-50 p-3 rounded-2xl -translate-y-1' : isCenter ? 'p-3' : ''}`}>
              <Icon size={isCenter ? 26 : 22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[9px] font-bold tracking-tighter ${isActive ? 'opacity-100' : 'opacity-60'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default Navigation;
