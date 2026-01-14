
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  ChevronRight, 
  Heart, 
  Trash2, 
  Edit3,
  ExternalLink,
  ArrowLeft,
  Camera,
  Upload,
  CheckCircle2,
  Circle,
  Clock,
  Bell,
  Settings,
  AlignLeft,
  Sparkles,
  MessageCircle,
  AlertCircle,
  MoreVertical,
  UserPlus,
  Send,
  User,
  Quote,
  ChevronLeft
} from 'lucide-react';
import { 
  format, 
  parseISO, 
  isSameMinute, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  addMonths, 
  subMonths,
  differenceInMinutes,
  isBefore,
  addDays,
  startOfDay,
  isAfter
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { Pair, ViewState, Todo, DailyFortune, Character, Report } from './types';
import { calculateDDay, getMilestones, getGoogleCalendarLink } from './utils/dateUtils';
import { generateCharacterDialogue, analyzeCharacterProfile } from './services/geminiService';
import Navigation from './components/Navigation';

const FORTUNE_LEVELS = ['대길', '중길', '소길', '길', '말', '흉', '소흉', '중흉', '대흉'];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [editingPairId, setEditingPairId] = useState<string | null>(null);
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [dailyFortune, setDailyFortune] = useState<DailyFortune | null>(null);
  const [fortuneCharId, setFortuneCharId] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);

  const [activeBubbles, setActiveBubbles] = useState<Record<string, { text: string, charId: string }>>({});

  const [charName, setCharName] = useState('');
  const [charPersonality, setCharPersonality] = useState('');
  const [charSetting, setCharSetting] = useState('');
  const [charImage, setCharImage] = useState('https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=400&auto=format&fit=crop');
  const [charSampleDialogue, setCharSampleDialogue] = useState('');

  const [pairName, setPairName] = useState('');
  const [pairDesc, setPairDesc] = useState('');
  const [pairDate, setPairDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pairImage, setPairImage] = useState('https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=800&auto=format&fit=crop');
  const [char1Id, setChar1Id] = useState('');
  const [char2Id, setChar2Id] = useState('');

  const [reportTargetId, setReportTargetId] = useState('');
  const [reportContent, setReportContent] = useState('');

  const [todoText, setTodoText] = useState('');
  const [todoTargetDate, setTodoTargetDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [todoTime, setTodoTime] = useState(format(new Date(), 'HH:mm'));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pairImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedPairs = localStorage.getItem('pair_records_v11_pairs');
    const savedChars = localStorage.getItem('pair_records_v11_chars');
    const savedReports = localStorage.getItem('pair_records_v11_reports');
    const savedFortune = localStorage.getItem('pair_records_v11_fortune');
    const savedFmtCharId = localStorage.getItem('pair_records_v11_fortune_char');
    
    if (savedPairs) setPairs(JSON.parse(savedPairs));
    if (savedChars) setCharacters(JSON.parse(savedChars));
    if (savedReports) setReports(JSON.parse(savedReports));
    if (savedFortune) setDailyFortune(JSON.parse(savedFortune));
    if (savedFmtCharId) setFortuneCharId(savedFmtCharId);

    if ("Notification" in window) Notification.requestPermission();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      if (!isSameDay(selectedDate, now) && format(now, 'HH:mm') === '00:00') {
        setSelectedDate(now);
      }

      let hasChanges = false;
      const updatedPairs = await Promise.all(pairs.map(async (pair) => {
        let pairUpdated = false;
        
        for (const todo of pair.todos) {
          const todoDateTime = new Date(`${todo.date}T${todo.time}`);
          
          if (!todo.completed && isSameMinute(now, todoDateTime)) {
             const charIds = [pair.char1Id, pair.char2Id].filter(id => !!id);
             const randomCharId = charIds[Math.floor(Math.random() * charIds.length)];
             const assignedChar = characters.find(c => c.id === randomCharId);
             if (assignedChar) {
               const msg = await generateCharacterDialogue(assignedChar, 'nag', { taskName: todo.text });
               if (Notification.permission === "granted") {
                 new Notification(`[${assignedChar.name}] 목표 시간이야!`, { body: msg, icon: assignedChar.imageUrl });
               }
               setActiveBubbles(prev => ({ ...prev, [todo.id]: { text: msg, charId: assignedChar.id } }));
             }
          }

          const diff = differenceInMinutes(now, todoDateTime);
          if (!todo.completed && diff === 10) {
            const charIds = [pair.char1Id, pair.char2Id].filter(id => !!id);
            const randomCharId = charIds[Math.floor(Math.random() * charIds.length)];
            const assignedChar = characters.find(c => c.id === randomCharId);
            if (assignedChar) {
              const msg = await generateCharacterDialogue(assignedChar, 'nag', { taskName: todo.text });
              setActiveBubbles(prev => ({ ...prev, [todo.id]: { text: `(독촉) ${msg}`, charId: assignedChar.id } }));
            }
          }
        }

        const filteredTodos = pair.todos.filter(todo => {
          if (todo.completed && todo.completedAt) {
            const diff = differenceInMinutes(now, parseISO(todo.completedAt));
            if (diff >= 120) {
              pairUpdated = true;
              return false;
            }
          }
          return true;
        });

        if (pairUpdated || filteredTodos.length !== pair.todos.length) {
          hasChanges = true;
          return { ...pair, todos: filteredTodos };
        }
        return pair;
      }));

      if (hasChanges) savePairs(updatedPairs);
    }, 60000);
    return () => clearInterval(interval);
  }, [pairs, characters, selectedDate]);

  const savePairs = (updated: Pair[]) => {
    setPairs(updated);
    localStorage.setItem('pair_records_v11_pairs', JSON.stringify(updated));
  };

  const saveCharacters = (updated: Character[]) => {
    setCharacters(updated);
    localStorage.setItem('pair_records_v11_chars', JSON.stringify(updated));
  };

  const saveReports = (updated: Report[]) => {
    setReports(updated);
    localStorage.setItem('pair_records_v11_reports', JSON.stringify(updated));
  };

  const handleDeletePair = (pairId: string) => {
    if (window.confirm('이 페어를 삭제하시겠습니까? 기록된 투두도 함께 삭제됩니다.')) {
      const updated = pairs.filter(p => p.id !== pairId);
      savePairs(updated);
      setView('home');
    }
  };

  const handleDeleteCharacter = (charId: string) => {
    if (window.confirm('이 캐릭터를 삭제하시겠습니까? 관련 페어의 설정에 오류가 생길 수 있습니다.')) {
      const updated = characters.filter(c => c.id !== charId);
      saveCharacters(updated);
    }
  };

  const handleSaveCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!charName) return;
    if (editingCharId) {
      const updated = characters.map(c => c.id === editingCharId ? { ...c, name: charName, personality: charPersonality, detailedSetting: charSetting, imageUrl: charImage, sampleDialogue: charSampleDialogue } : c);
      saveCharacters(updated);
    } else {
      const newChar: Character = { id: Date.now().toString(), name: charName, personality: charPersonality, detailedSetting: charSetting, imageUrl: charImage, reports: [], sampleDialogue: charSampleDialogue };
      saveCharacters([...characters, newChar]);
    }
    setCharName(''); setCharPersonality(''); setCharSetting(''); setCharSampleDialogue(''); setEditingCharId(null);
    setView('characters');
  };

  const handleSavePair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairName || !char1Id || !char2Id) return;
    if (editingPairId) {
      const updated = pairs.map(p => p.id === editingPairId ? { ...p, name: pairName, description: pairDesc, anniversaryDate: new Date(pairDate).toISOString(), imageUrl: pairImage, char1Id, char2Id } : p);
      savePairs(updated);
    } else {
      const newPair: Pair = { id: Date.now().toString(), name: pairName, description: pairDesc, anniversaryDate: new Date(pairDate).toISOString(), imageUrl: pairImage, char1Id, char2Id, createdAt: new Date().toISOString(), todos: [] };
      savePairs([...pairs, newPair]);
    }
    setView('home');
  };

  const handleDrawFortune = async () => {
    if (!fortuneCharId) {
      setView('fortune_settings');
      return;
    }
    setIsDrawing(true);
    const char = characters.find(c => c.id === fortuneCharId);
    if (char) {
      const level = FORTUNE_LEVELS[Math.floor(Math.random() * FORTUNE_LEVELS.length)];
      const msg = await generateCharacterDialogue(char, 'fortune', { fortuneLevel: level });
      const newFortune = { lastDrawDate: format(selectedDate, 'yyyy-MM-dd'), characterId: char.id, characterName: char.name, message: msg, resultLevel: level };
      setDailyFortune(newFortune);
      localStorage.setItem('pair_records_v11_fortune', JSON.stringify(newFortune));
    }
    setIsDrawing(false);
  };

  const handleToggleTodo = async (pairId: string, todoId: string) => {
    const updatedPairs = await Promise.all(pairs.map(async (p) => {
      if (p.id === pairId) {
        let msg = '';
        let randomCharId = '';
        const updatedTodos = await Promise.all(p.todos.map(async (t) => {
          if (t.id === todoId) {
            const isNowCompleted = !t.completed;
            if (isNowCompleted) {
              const charIds = [p.char1Id, p.char2Id].filter(id => !!id);
              randomCharId = charIds[Math.floor(Math.random() * charIds.length)];
              const assignedChar = characters.find(c => c.id === randomCharId);
              if (assignedChar) msg = await generateCharacterDialogue(assignedChar, 'praise', { taskName: t.text });
            }
            return { ...t, completed: isNowCompleted, completedAt: isNowCompleted ? new Date().toISOString() : undefined };
          }
          return t;
        }));
        if (msg && randomCharId) {
          setActiveBubbles(prev => ({ ...prev, [todoId]: { text: msg, charId: randomCharId } }));
        }
        return { ...p, todos: updatedTodos };
      }
      return p;
    }));
    savePairs(updatedPairs);
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoText || !selectedPairId) return;
    const newTodo: Todo = { id: Date.now().toString(), text: todoText, date: todoTargetDate, time: todoTime, completed: false };
    savePairs(pairs.map(p => p.id === selectedPairId ? { ...p, todos: [...p.todos, newTodo] } : p));
    setTodoText('');
  };

  const renderDetail = () => {
    const selectedPair = pairs.find(p => p.id === selectedPairId);
    if (!selectedPair) return null;
    const char1 = characters.find(c => c.id === selectedPair.char1Id);
    const char2 = characters.find(c => c.id === selectedPair.char2Id);
    const milestones = getMilestones(new Date(selectedPair.anniversaryDate));
    const upcomingMilestones = milestones.filter(m => !m.isPassed).slice(0, 5);
    const dateTodos = selectedPair.todos.filter(t => t.date === format(selectedDate, 'yyyy-MM-dd'));
    const now = new Date();

    return (
      <div className="pb-32 animate-in slide-in-from-right-4 duration-300">
        <div className="relative h-[55vh] w-full">
          <img src={selectedPair.imageUrl} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-black/10 to-transparent" />
          <div className="absolute top-10 left-6 right-6 flex justify-between z-10">
            <button onClick={() => setView('home')} className="w-12 h-12 rounded-2xl bg-black/20 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white"><ArrowLeft size={24} /></button>
            <button onClick={() => { setEditingPairId(selectedPair.id); setPairName(selectedPair.name); setPairDesc(selectedPair.description || ''); setPairDate(format(parseISO(selectedPair.anniversaryDate), 'yyyy-MM-dd')); setPairImage(selectedPair.imageUrl); setChar1Id(selectedPair.char1Id); setChar2Id(selectedPair.char2Id); setView('edit'); }} className="w-12 h-12 rounded-2xl bg-black/20 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white"><Edit3 size={20} /></button>
          </div>
          <div className="absolute bottom-16 left-8 right-8 text-slate-900">
             <h1 className="text-5xl font-black mb-4 tracking-tighter leading-[0.9]">{selectedPair.name}</h1>
             <div className="flex gap-3">
                {char1 && <span className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black tracking-widest">{char1.name}</span>}
                {char2 && <span className="px-4 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-xl text-[10px] font-black tracking-widest">{char2.name}</span>}
             </div>
          </div>
        </div>

        <div className="px-8 -mt-10 relative bg-white rounded-t-[4rem] pt-14">
          <div className="flex flex-col items-center mb-10 text-center">
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.4em] mb-1">Record Date</p>
            <div className="flex items-center gap-4">
               <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="p-2 text-slate-300 hover:text-rose-500"><ChevronLeft size={20}/></button>
               <h2 className="text-2xl font-black text-slate-800">{format(selectedDate, 'yyyy. MM. dd')}</h2>
               <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 text-slate-300 hover:text-rose-500"><ChevronRight size={20}/></button>
            </div>
          </div>

          <section className="mb-14">
            <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3 px-2">
              <Bell className="text-rose-500" size={24} />
              투두 기록장
            </h2>
            <form onSubmit={handleAddTodo} className="bg-slate-50 p-6 rounded-[2.5rem] mb-10 space-y-4">
               <input type="text" placeholder="새로운 할 일을 입력하세요" value={todoText} onChange={(e) => setTodoText(e.target.value)} className="w-full bg-white rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:outline-none" />
               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase pl-2">목표 날짜</label>
                   <input type="date" value={todoTargetDate} onChange={(e) => setTodoTargetDate(e.target.value)} className="w-full bg-white rounded-xl px-4 py-3 text-xs font-bold focus:outline-none" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase pl-2">목표 시간</label>
                   <input type="time" value={todoTime} onChange={(e) => setTodoTime(e.target.value)} className="w-full bg-white rounded-xl px-4 py-3 text-xs font-bold focus:outline-none" />
                 </div>
               </div>
               <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-xl text-sm shadow-lg active:scale-95 transition-all">추가</button>
            </form>

            <div className="space-y-12">
              {dateTodos.length === 0 ? (
                <p className="text-center py-10 text-slate-300 font-bold text-xs uppercase">기록된 할 일이 없습니다</p>
              ) : dateTodos.map(todo => {
                 const bubbleData = activeBubbles[todo.id];
                 const char = bubbleData ? characters.find(c => c.id === bubbleData.charId) : null;
                 const todoDateTime = new Date(`${todo.date}T${todo.time}`);
                 const diffToTarget = differenceInMinutes(todoDateTime, now);
                 const isUrgent = !todo.completed && diffToTarget >= 0 && diffToTarget <= 3;
                 
                 return (
                   <div key={todo.id} className="relative group">
                     <div className={`flex items-start gap-4 p-7 rounded-[2.5rem] border-2 transition-all duration-500 ${todo.completed ? 'bg-slate-50 border-slate-100 opacity-60 scale-[0.98]' : isUrgent ? 'bg-red-50 border-red-200 shadow-lg shadow-red-100' : 'bg-white border-slate-50 shadow-xl'}`}>
                        <button onClick={() => handleToggleTodo(selectedPair.id, todo.id)} className={`mt-1 flex-shrink-0 transition-transform active:scale-125 ${todo.completed ? 'text-rose-500' : 'text-slate-200'}`}>
                          {todo.completed ? <CheckCircle2 size={28} strokeWidth={2.5} className="animate-in zoom-in" /> : <Circle size={28} strokeWidth={2} />}
                        </button>
                        <div className="flex-1">
                          <p className={`font-black text-slate-800 text-lg transition-all ${todo.completed ? 'line-through text-slate-300' : ''}`}>{todo.text}</p>
                          <div className="flex items-center gap-4 mt-3 text-[10px] font-black">
                             <span className={`flex items-center gap-1 ${isUrgent ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}><Clock size={12}/> {todo.time} {isUrgent && '(마감 임박!)'}</span>
                             <span className="text-slate-300 ml-auto">{todo.date}</span>
                          </div>
                        </div>
                     </div>
                     {bubbleData && char && (
                       <div className="mt-4 ml-10 flex items-start gap-3 animate-in slide-in-from-top-2 duration-500">
                          <img src={char.imageUrl} className="w-10 h-10 rounded-2xl object-cover shadow-md border-2 border-white" />
                          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl rounded-tl-none relative shadow-sm max-w-[80%]">
                             <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">{char.name}</span>
                                <button onClick={() => { setReportTargetId(char.id); setView('reports'); }} className="text-rose-200 hover:text-rose-500"><AlertCircle size={10} /></button>
                             </div>
                             <p className="text-xs font-bold text-slate-700 leading-relaxed">"{bubbleData.text}"</p>
                          </div>
                       </div>
                     )}
                   </div>
                 );
              })}
            </div>
          </section>
        </div>
      </div>
    );
  };

  const renderFortune = () => {
    const todayStr = format(selectedDate, 'yyyy-MM-dd');
    const isDone = dailyFortune?.lastDrawDate === todayStr;

    if (!fortuneCharId && !isDone) {
      return (
        <div className="pb-32 px-8 pt-16 animate-in fade-in duration-500 flex flex-col items-center justify-center text-center">
           <AlertCircle className="text-rose-200 mb-6" size={80} />
           <h2 className="text-2xl font-black text-slate-800 mb-4">운세 캐릭터 미설정</h2>
           <button onClick={() => setView('fortune_settings')} className="bg-rose-500 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">설정하러 가기</button>
        </div>
      );
    }

    const currentFortuneChar = characters.find(c => c.id === dailyFortune?.characterId);

    return (
      <div className="pb-32 px-8 pt-16 animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">오늘의 운세</h1>
            <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">{format(selectedDate, 'yyyy. MM. dd')}</p>
          </div>
          <button onClick={() => setView('fortune_settings')} className="text-rose-300 hover:text-rose-500 transition-colors p-2 bg-white rounded-xl shadow-sm"><Settings size={22} /></button>
        </div>
        <div className={`relative min-h-[480px] rounded-[3.5rem] p-10 flex flex-col items-center justify-center text-center transition-all duration-1000 ${isDone ? 'bg-white border-4 border-rose-50 shadow-2xl shadow-rose-200' : 'bg-white border-2 border-dashed border-rose-100 shadow-sm'}`}>
          {isDrawing ? (
             <div className="animate-pulse space-y-4">
               <Sparkles className="mx-auto text-rose-300 animate-spin" size={60} />
               <p className="font-black uppercase tracking-widest text-sm text-rose-400">기운을 모으는 중...</p>
             </div>
          ) : isDone ? (
            <div className="animate-in zoom-in duration-700 w-full space-y-6">
               <div className="absolute top-8 right-8">
                 <button onClick={() => { if(currentFortuneChar) { setReportTargetId(currentFortuneChar.id); setView('reports'); } }} className="text-rose-200 hover:text-rose-500"><AlertCircle size={20} /></button>
               </div>
               <div className="w-28 h-28 rounded-[2.5rem] overflow-hidden border-4 border-rose-100 mb-6 mx-auto shadow-xl">
                 <img src={currentFortuneChar?.imageUrl || charImage} className="w-full h-full object-cover" />
               </div>
               <div className="flex flex-col items-center">
                 <span className="text-[11px] font-black text-rose-400 tracking-[0.4em] uppercase mb-2">Result</span>
                 <h3 className="text-4xl font-black text-rose-500 mb-2">{dailyFortune?.resultLevel}</h3>
               </div>
               <div className="bg-rose-50/50 p-6 rounded-[2rem] border border-rose-100 relative">
                 <Quote className="absolute -top-3 -left-3 text-rose-200 rotate-180" size={24} />
                 <p className="text-base font-bold text-slate-700 leading-relaxed italic">"{dailyFortune?.message}"</p>
                 <Quote className="absolute -bottom-3 -right-3 text-rose-200" size={24} />
               </div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mt-4">Consulted by {dailyFortune?.characterName}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <Sparkles className="mx-auto text-rose-200" size={100} />
              <h2 className="text-lg font-black text-slate-800">오늘은 어떤 하루가 될까요?</h2>
              <button onClick={handleDrawFortune} className="bg-rose-500 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-rose-100 active:scale-95 transition-all">운세 뽑기</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReports = () => (
    <div className="pb-32 px-8 pt-16 animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">캐릭터 피드백</h1>
          <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">Reports & Correction</p>
        </div>
      </div>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!reportContent || !reportTargetId) return;
        const char = characters.find(c => c.id === reportTargetId);
        if (!char) return;
        const newReport: Report = { id: Date.now().toString(), charId: reportTargetId, charName: char.name, content: reportContent, timestamp: new Date().toISOString() };
        saveReports([...reports, newReport]);
        saveCharacters(characters.map(c => c.id === reportTargetId ? { ...c, reports: [...(c.reports || []), reportContent] } : c));
        setReportContent(''); setReportTargetId('');
        alert("신고가 접수되었습니다. AI가 말투 수정을 위해 반영합니다.");
      }} className="bg-white p-6 rounded-[2.5rem] shadow-lg shadow-slate-100 border border-slate-50 space-y-4 mb-8">
        <div className="space-y-1">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">캐릭터 선택</label>
           <select 
            value={reportTargetId} 
            onChange={(e) => setReportTargetId(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-xs focus:outline-none"
            required
           >
             <option value="">캐릭터를 선택해 주세요</option>
             {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
           </select>
        </div>
        <div className="space-y-1">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">내용</label>
           <textarea 
            placeholder="어색하거나 수정이 필요한 내용을 적어주세요." 
            value={reportContent} 
            onChange={(e) => setReportContent(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-medium resize-none h-24 focus:outline-none"
            required
           />
        </div>
        <button type="submit" className="w-full bg-rose-500 text-white font-black py-3 rounded-xl shadow-md active:scale-95 transition-all text-sm">
          피드백 보내기
        </button>
      </form>
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900 pl-2">최근 피드백</h2>
        {reports.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
            <p className="text-slate-300 font-bold text-xs">접수된 내역이 없습니다.</p>
          </div>
        ) : (
          reports.slice().reverse().map(report => (
            <div key={report.id} className="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[8px] font-black uppercase">{report.charName}</span>
                <span className="text-[8px] font-bold text-slate-300">{format(parseISO(report.timestamp), 'yyyy.MM.dd')}</span>
              </div>
              <p className="text-xs font-medium text-slate-600 italic">"{report.content}"</p>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="pb-32 animate-in fade-in duration-500">
      <header className="px-10 pt-16 pb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">기록지 홈</h1>
          <p className="text-slate-400 text-xs font-bold mt-3 uppercase tracking-[0.2em]">Pair Stories</p>
        </div>
        <button onClick={() => { setPairName(''); setPairDesc(''); setPairDate(format(new Date(), 'yyyy-MM-dd')); setPairImage('https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=800&auto=format&fit=crop'); setChar1Id(''); setChar2Id(''); setEditingPairId(null); setView('add'); }} className="w-14 h-14 bg-rose-500 text-white rounded-[1.8rem] shadow-2xl shadow-rose-200 flex items-center justify-center"><Plus size={28} /></button>
      </header>
      <div className="px-6 flex flex-col gap-10">
         {pairs.length === 0 ? (
           <div className="py-24 text-center bg-white border-2 border-dashed border-slate-100 rounded-[3.5rem] flex flex-col items-center gap-4">
              <Heart size={60} className="text-rose-100" />
              <p className="text-slate-300 font-black text-sm">첫 번째 페어를 등록해보세요!</p>
           </div>
         ) : (
           pairs.map(pair => (
             <div key={pair.id} onClick={() => { setSelectedPairId(pair.id); setSelectedDate(new Date()); setView('detail'); }} className="bg-white rounded-[3.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 group active:scale-[0.98] transition-all">
                <div className="relative h-80 overflow-hidden">
                   <img src={pair.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                   <div className="absolute bottom-8 left-8 right-8">
                      <h3 className="text-3xl font-black text-white tracking-tighter">{pair.name}</h3>
                      <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-2">D+{calculateDDay(new Date(pair.anniversaryDate))}</p>
                   </div>
                </div>
             </div>
           ))
         )}
      </div>
    </div>
  );

  const renderPairForm = (isEdit: boolean) => (
    <div className="pb-32 px-8 pt-16 animate-in slide-in-from-right-4 duration-300">
      <header className="flex items-center gap-4 mb-10">
        <button onClick={() => setView(isEdit ? 'detail' : 'home')} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><ArrowLeft size={20} /></button>
        <h1 className="text-2xl font-black text-slate-900">{isEdit ? '페어 수정' : '새 페어 등록'}</h1>
        {isEdit && (
          <button onClick={() => handleDeletePair(editingPairId!)} className="ml-auto w-10 h-10 rounded-xl bg-red-50 text-red-400 flex items-center justify-center"><Trash2 size={20}/></button>
        )}
      </header>
      <form onSubmit={handleSavePair} className="space-y-8">
        <div className="flex flex-col items-center">
           <div onClick={() => pairImageInputRef.current?.click()} className="relative w-full h-56 rounded-[3rem] overflow-hidden bg-slate-100 border-4 border-white shadow-xl cursor-pointer group">
              <img src={pairImage} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" /></div>
           </div>
           <input type="file" ref={pairImageInputRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onload=()=>setPairImage(r.result as string); r.readAsDataURL(f); } }} />
        </div>
        <div className="space-y-6">
           <input type="text" placeholder="페어 이름" value={pairName} onChange={(e) => setPairName(e.target.value)} className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 font-black focus:outline-none" required />
           <div className="grid grid-cols-2 gap-4">
              <select value={char1Id} onChange={(e) => setChar1Id(e.target.value)} className="bg-white border border-slate-100 rounded-xl px-4 py-4 text-xs font-bold focus:outline-none" required>
                 <option value="">캐릭터 1</option>
                 {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={char2Id} onChange={(e) => setChar2Id(e.target.value)} className="bg-white border border-slate-100 rounded-xl px-4 py-4 text-xs font-bold focus:outline-none" required>
                 <option value="">캐릭터 2</option>
                 {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
           </div>
           <input type="date" value={pairDate} onChange={(e) => setPairDate(e.target.value)} className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 font-black focus:outline-none" required />
           <textarea placeholder="소개글" value={pairDesc} onChange={(e) => setPairDesc(e.target.value)} rows={3} className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium resize-none focus:outline-none" />
        </div>
        <button type="submit" className="w-full bg-rose-500 text-white font-black py-5 rounded-[1.5rem] shadow-xl active:scale-95 transition-all">{isEdit ? '수정 완료' : '등록 완료'}</button>
      </form>
    </div>
  );

  const renderCharacters = () => (
    <div className="pb-32 px-8 pt-16 animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">캐릭터 관리</h1>
        </div>
        <button onClick={() => { setEditingCharId(null); setCharName(''); setCharPersonality(''); setCharSetting(''); setCharImage('https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=400&auto=format&fit=crop'); setCharSampleDialogue(''); setView('edit_character'); }} className="w-12 h-12 bg-rose-500 text-white rounded-2xl shadow-xl flex items-center justify-center"><UserPlus size={22} /></button>
      </div>
      <div className="grid grid-cols-1 gap-6">
        {characters.length === 0 ? (
          <div className="py-20 text-center bg-white border-2 border-dashed border-slate-100 rounded-[3rem]">
            <p className="text-slate-300 font-bold">등록된 캐릭터가 없습니다.</p>
          </div>
        ) : characters.map(char => (
          <div key={char.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-50 shadow-xl flex gap-5 items-center">
            <img src={char.imageUrl} className="w-20 h-20 rounded-3xl object-cover shadow-lg" />
            <div className="flex-1">
              <h3 className="font-black text-slate-800 text-lg">{char.name}</h3>
              <p className="text-rose-400 text-[10px] font-black uppercase tracking-wider">{char.personality}</p>
              <div className="mt-2 flex gap-2">
                 <button onClick={() => { setEditingCharId(char.id); setCharName(char.name); setCharPersonality(char.personality); setCharSetting(char.detailedSetting); setCharImage(char.imageUrl); setCharSampleDialogue(char.sampleDialogue || ''); setView('edit_character'); }} className="text-slate-300 hover:text-rose-500"><Edit3 size={16} /></button>
                 <button onClick={() => handleDeleteCharacter(char.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEditCharacter = () => (
    <div className="pb-32 px-8 pt-16 animate-in slide-in-from-right-4 duration-300">
      <header className="flex items-center gap-4 mb-10">
        <button onClick={() => setView('characters')} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><ArrowLeft size={20} /></button>
        <h1 className="text-2xl font-black text-slate-900">{editingCharId ? '캐릭터 수정' : '캐릭터 추가'}</h1>
      </header>
      <form onSubmit={handleSaveCharacter} className="space-y-8">
        <div className="flex flex-col items-center">
          <div onClick={() => fileInputRef.current?.click()} className="relative w-40 h-40 rounded-[3rem] overflow-hidden bg-slate-100 cursor-pointer group border-4 border-white shadow-xl">
             <img src={charImage} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
             <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" /></div>
          </div>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onload=()=>setCharImage(r.result as string); r.readAsDataURL(f); } }} className="hidden" />
        </div>
        <div className="space-y-5">
           <input type="text" placeholder="이름" value={charName} onChange={(e) => setCharName(e.target.value)} className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 font-black focus:outline-none" required />
           <textarea placeholder="말투 예시" value={charSampleDialogue} onChange={(e) => setCharSampleDialogue(e.target.value)} rows={2} className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 font-bold text-sm focus:outline-none resize-none" required />
           <input type="text" placeholder="성격" value={charPersonality} onChange={(e) => setCharPersonality(e.target.value)} className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 font-bold focus:outline-none" required />
           <textarea placeholder="상세 설정 (길이 제한 없음)" value={charSetting} onChange={(e) => setCharSetting(e.target.value)} rows={8} className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 font-medium text-sm focus:outline-none" />
        </div>
        <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-xl active:scale-95 transition-all">캐릭터 저장</button>
      </form>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FDFDFE] relative overflow-x-hidden no-scrollbar pb-10">
      <main>
        {view === 'home' && renderHome()}
        {view === 'characters' && renderCharacters()}
        {view === 'edit_character' && renderEditCharacter()}
        {view === 'fortune' && renderFortune()}
        {view === 'fortune_settings' && (
           <div className="pb-32 px-8 pt-16 animate-in slide-in-from-right-4 duration-300">
             <header className="flex items-center gap-4 mb-10">
                <button onClick={() => setView('fortune')} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><ArrowLeft size={20} /></button>
                <h1 className="text-2xl font-black text-slate-900">운세 담당 설정</h1>
             </header>
             <div className="grid grid-cols-1 gap-4">
                {characters.map(char => (
                  <button key={char.id} onClick={() => { setFortuneCharId(char.id); localStorage.setItem('pair_records_v11_fortune_char', char.id); }} className={`flex items-center gap-4 p-5 rounded-3xl border-2 transition-all ${fortuneCharId === char.id ? 'border-rose-500 bg-rose-50' : 'border-slate-100 bg-white'}`}>
                     <img src={char.imageUrl} className="w-12 h-12 rounded-2xl object-cover" />
                     <span className="font-black text-slate-800">{char.name}</span>
                     {fortuneCharId === char.id && <CheckCircle2 className="ml-auto text-rose-500" size={20} />}
                  </button>
                ))}
             </div>
           </div>
        )}
        {view === 'reports' && renderReports()}
        {view === 'detail' && renderDetail()}
        {view === 'add' && renderPairForm(false)}
        {view === 'edit' && renderPairForm(true)}
        {view === 'calendar' && (
           <div className="pb-32 animate-in fade-in duration-500 pt-16 px-8">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-10">기록지 달력</h1>
              <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl">
                 <div className="flex justify-between items-center mb-10">
                    <h2 className="text-2xl font-black">{format(currentMonth, 'yyyy. MM')}</h2>
                    <div className="flex gap-2">
                       <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center">&lt;</button>
                       <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center">&gt;</button>
                    </div>
                 </div>
                 <div className="grid grid-cols-7 gap-y-10 text-center">
                    {([...Array(getDay(startOfMonth(currentMonth))).fill(null), ...eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })]).map((date, i) => (
                       <div key={i} className="min-h-[50px] flex flex-col items-center">
                          {date && (
                            <button onClick={() => { setSelectedDate(date); if (selectedPairId) setView('detail'); else setView('home'); }} className={`w-10 h-10 flex flex-col items-center justify-center rounded-xl transition-all ${isSameDay(date, selectedDate) ? 'bg-rose-500 text-white' : isSameDay(date, new Date()) ? 'bg-rose-50 text-rose-500' : 'text-slate-800'}`}>
                              <span className="text-xs font-black">{format(date, 'd')}</span>
                              <div className="flex gap-0.5 mt-1">
                                 {pairs.flatMap(p => getMilestones(new Date(p.anniversaryDate))).some(m => isSameDay(m.date, date)) && <div className={`w-1 h-1 rounded-full ${isSameDay(date, selectedDate) ? 'bg-white' : 'bg-rose-400'}`} />}
                                 {pairs.flatMap(p => p.todos).some(t => isSameDay(parseISO(t.date), date)) && <div className={`w-1 h-1 rounded-full ${isSameDay(date, selectedDate) ? 'bg-white' : 'bg-slate-900'}`} />}
                              </div>
                            </button>
                          )}
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}
      </main>
      <Navigation currentView={view} setView={setView} />
    </div>
  );
};

export default App;
