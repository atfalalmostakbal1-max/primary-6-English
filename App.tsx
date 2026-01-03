
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { UnitCard } from './components/UnitCard';
import { TeacherDisplay } from './components/TeacherDisplay';
import { ExamModule } from './components/ExamModule';
import { CURRICULUM } from './constants';
import { Unit, Lesson, TeachingMode, TeachingStep, LessonSummary } from './types';
import { teacherService } from './services/geminiService';

const App: React.FC = () => {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [isTeaching, setIsTeaching] = useState(false);
  const [isExaming, setIsExaming] = useState(false);
  const [script, setScript] = useState<TeachingStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  const [mode, setMode] = useState<TeachingMode>(TeachingMode.ARABIC);

  const startLesson = async (lesson: Lesson) => {
    setIsLoading(true);
    setCurrentLesson(lesson);
    try {
      const generatedScript = await teacherService.generateLessonScript(selectedUnit!, lesson, mode);
      setScript(generatedScript);
      setCurrentStepIndex(0);
      setIsTeaching(true);
    } catch (e) {
      console.error("Lesson generation failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (currentStepIndex < script.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setIsLoading(true);
      if (currentLesson) {
        const s = await teacherService.generateSummary(currentLesson);
        setSummary(s);
      }
      setIsTeaching(false);
      setIsLoading(false);
    }
  };

  const resetToUnits = () => {
    setIsTeaching(false);
    setIsExaming(false);
    setCurrentLesson(null);
    setSummary(null);
  };

  const resetAll = () => {
    resetToUnits();
    setSelectedUnit(null);
  };

  if (isLoading) return <Layout><div className="flex-grow flex flex-col items-center justify-center gap-6"><div className="text-8xl animate-bounce">🎒</div><h2 className="text-3xl font-black text-yellow-800">Miss Nour is ready!</h2></div></Layout>;

  return (
    <Layout>
      {!isTeaching && !isExaming && !summary && (
        <div className="flex justify-center gap-4 mb-10">
          <button 
            onClick={() => setMode(TeachingMode.ARABIC)} 
            className={`px-8 py-3 rounded-2xl font-bold transition-all border-4 shadow-sm ${mode === TeachingMode.ARABIC ? 'bg-blue-500 text-white border-blue-600' : 'bg-white border-blue-100 text-blue-800 hover:border-blue-300'}`}
          >
            🟢 شرح بالعربي
          </button>
          <button 
            onClick={() => setMode(TeachingMode.ENGLISH)} 
            className={`px-8 py-3 rounded-2xl font-bold transition-all border-4 shadow-sm ${mode === TeachingMode.ENGLISH ? 'bg-blue-500 text-white border-blue-600' : 'bg-white border-blue-100 text-blue-800 hover:border-blue-300'}`}
          >
            🔵 English Only
          </button>
        </div>
      )}

      {isExaming ? (
        <ExamModule unit={selectedUnit!} onFinish={() => setIsExaming(false)} onBack={() => setIsExaming(false)} />
      ) : summary ? (
        <div className="bg-white p-12 rounded-[3rem] border-8 border-green-400 shadow-2xl relative">
          <button onClick={resetToUnits} className="absolute top-6 left-6 text-4xl hover:scale-125 transition-transform">🔙</button>
          <h2 className="text-5xl font-black mb-6 text-center mt-4">Star Student! ⭐</h2>
          <p className="text-2xl text-green-600 mb-8 font-bold text-center">{summary.encouragement}</p>
          <div className="bg-yellow-50 p-6 rounded-3xl border-2 border-yellow-200 mb-8">
            <h3 className="font-bold mb-2">🏠 Home Fun:</h3>
            <p className="text-xl">{summary.homeActivity}</p>
          </div>
          <button onClick={resetToUnits} className="w-full bg-green-500 text-white py-6 rounded-3xl font-black text-2xl shadow-[0_10px_0_rgb(21,128,61)] hover:brightness-110 active:translate-y-1 transition-all">Back to Lessons</button>
        </div>
      ) : isTeaching ? (
        <TeacherDisplay 
          step={script[currentStepIndex]} 
          onNext={handleNextStep} 
          onBack={() => setIsTeaching(false)} 
          isFirst={currentStepIndex===0} 
          isLast={currentStepIndex===script.length-1}
          mode={mode}
        />
      ) : !selectedUnit ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CURRICULUM.map(u => <UnitCard key={u.id} unit={u} onSelect={setSelectedUnit} />)}
        </div>
      ) : (
        <div className="bg-white p-10 rounded-[3rem] border-8 border-yellow-400 shadow-2xl relative">
          <button onClick={resetAll} className="absolute top-6 left-6 text-4xl hover:scale-125 transition-transform">🔙</button>
          <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4 mt-8">
            <h2 className="text-4xl font-black text-yellow-900">{selectedUnit.title}</h2>
            <button onClick={() => setIsExaming(true)} className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-transform border-4 border-purple-700">📝 Skills Test</button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {selectedUnit.lessons.map(l => (
              <button key={l.id} onClick={() => startLesson(l)} className="p-8 bg-yellow-50 rounded-3xl border-4 border-yellow-100 hover:bg-yellow-100 hover:border-yellow-300 flex justify-between items-center group transition-all">
                <div className="text-left">
                  <h4 className="text-2xl font-bold text-yellow-800">Lesson {l.id}</h4>
                  <p className="text-gray-600 text-xl font-medium">{l.title}</p>
                </div>
                <div className="text-4xl transform group-hover:translate-x-2 transition-transform">➡️</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
