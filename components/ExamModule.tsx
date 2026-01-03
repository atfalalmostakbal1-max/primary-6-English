
import React, { useState, useEffect } from 'react';
import { Unit, ExamQuestion, SkillType } from '../types';
import { teacherService } from '../services/geminiService';

export const ExamModule: React.FC<{ unit: Unit; onFinish: () => void; onBack: () => void }> = ({ unit, onFinish, onBack }) => {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teacherService.generateExam(unit).then(q => {
      setQuestions(q);
      setLoading(false);
    });
  }, [unit]);

  const next = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setUserInput("");
    } else {
      onFinish();
    }
  };

  if (loading) return <div className="p-20 text-center text-2xl font-black animate-bounce text-yellow-800 bg-white rounded-[3rem] shadow-xl">Preparing Exam... 📝</div>;

  const q = questions[currentIdx];

  return (
    <div className="bg-white rounded-[3rem] p-10 border-8 border-purple-400 shadow-2xl relative">
      {/* Return Arrow */}
      <button 
        onClick={onBack} 
        className="absolute top-4 left-4 text-4xl hover:scale-125 transition-transform z-10"
        title="Back to Unit"
      >
        🔙
      </button>

      <div className="flex justify-between items-center mb-8 mt-4">
        <span className="bg-purple-100 text-purple-800 px-6 py-2 rounded-full font-black text-lg">Skill: {q.skill} Exam</span>
        <span className="font-bold text-gray-400">Question {currentIdx + 1} of {questions.length}</span>
      </div>

      <div className="mb-8">
        <h3 className="text-3xl font-bold text-gray-800 mb-4 leading-tight">{q.question}</h3>
        <p className="text-purple-600 italic font-semibold text-xl">Instruction: {q.instruction}</p>
      </div>

      {q.skill === 'Writing' || q.skill === 'Reading' ? (
        <textarea 
          className="w-full h-40 p-6 border-4 border-purple-100 rounded-3xl focus:border-purple-300 outline-none text-2xl transition-colors"
          placeholder="Type your answer here..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
        />
      ) : q.skill === 'Listening' ? (
        <div className="flex flex-col items-center gap-6 bg-purple-50 p-8 rounded-[2rem] border-4 border-purple-100">
          <button 
            onClick={() => teacherService.speak(q.question)}
            className="bg-purple-500 text-white p-10 rounded-full text-5xl shadow-xl hover:scale-110 transition-transform active:scale-95"
          >
            🔊
          </button>
          <p className="font-bold text-purple-800">Tap to hear the sentence</p>
          <input 
            className="w-full p-5 border-4 border-purple-200 rounded-2xl text-center text-2xl outline-none focus:border-purple-500 transition-colors"
            placeholder="What did you hear?"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 bg-red-50 p-8 rounded-[2rem] border-4 border-red-100">
          <div className="text-8xl animate-pulse">🎙️</div>
          <p className="text-red-800 font-black text-2xl">Speaking Task!</p>
          <p className="text-gray-600 font-medium">Miss Nour is listening...</p>
          <button className="bg-red-500 text-white px-10 py-5 rounded-full border-4 border-red-600 font-black text-xl shadow-lg active:bg-red-700 active:translate-y-1 transition-all">
            Tap to Record 🔴
          </button>
        </div>
      )}

      <button 
        onClick={next}
        className="w-full mt-10 bg-purple-500 hover:bg-purple-600 text-white py-6 rounded-3xl font-black text-2xl shadow-[0_10px_0_rgb(107,33,168)] hover:brightness-110 active:translate-y-1 transition-all"
      >
        Submit Answer ➔
      </button>
    </div>
  );
};
