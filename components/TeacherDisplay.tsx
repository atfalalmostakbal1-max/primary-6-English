
import React, { useEffect, useState, useRef } from 'react';
import { TeachingStep, TeachingMode } from '../types';
import { teacherService } from '../services/geminiService';

interface TeacherDisplayProps {
  step: TeachingStep;
  onNext: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  mode: TeachingMode;
}

export const TeacherDisplay: React.FC<TeacherDisplayProps> = ({ step, onNext, onBack, isFirst, isLast, mode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const stopAudio = () => {
    if (audioRef.current) {
      try { audioRef.current.stop(); } catch (e) {}
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  const playVoice = async (text: string) => {
    stopAudio();
    setIsPlaying(true);
    const buffer = await teacherService.speak(text);
    if (buffer) {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtxRef.current.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      audioRef.current = source;
    } else {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    playVoice(step.audioText);
    return () => stopAudio();
  }, [step]);

  const isExercise = step.type === 'exercise';

  return (
    <div className={`bg-white rounded-[3rem] p-8 shadow-2xl border-8 relative overflow-hidden flex flex-col md:flex-row gap-8 items-center transition-all duration-500 ${isExercise ? 'border-yellow-400' : 'border-blue-400'}`}>
      {isExercise && (
        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 px-8 py-2 font-black rounded-bl-3xl shadow-md z-10 animate-pulse">
          BOOK EXERCISE • تدريبات الكتاب
        </div>
      )}
      
      <button onClick={onBack} className="absolute top-4 left-4 text-4xl hover:scale-125 transition-transform z-10">🔙</button>

      <div className="w-full md:w-1/3 flex flex-col items-center mt-8 md:mt-0">
        <div className={`w-48 h-48 rounded-full border-4 flex items-center justify-center text-8xl shadow-inner mb-4 transition-all duration-500 
          ${isPlaying ? 'animate-bounce scale-110 border-pink-200 bg-pink-50' : 'bg-blue-50 border-blue-100'}`}>
          {isExercise ? '📖' : '👩‍🏫'}
        </div>
        <div className="px-6 py-2 rounded-full font-bold shadow-lg bg-blue-500 text-white">
          Miss Nour
        </div>
      </div>

      <div className="w-full md:w-2/3 flex flex-col gap-6">
        <div className={`transition-all duration-300 bg-opacity-40 p-6 rounded-3xl border-2 border-dashed relative 
          ${isExercise ? 'bg-yellow-50 border-yellow-400 shadow-inner' : 'bg-blue-50 border-blue-300'}`}>
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-inherit border-l-2 border-b-2 border-inherit rotate-45 hidden md:block"></div>
          
          <h2 className="text-3xl font-bold text-gray-800 mb-4 whitespace-pre-wrap leading-tight">
            {step.content}
          </h2>
          
          <p className="text-xl text-blue-700 italic font-medium mt-4">
            "{step.instruction}"
          </p>

          {isExercise && (
            <div className="mt-6 p-4 bg-red-100 border-2 border-red-300 rounded-2xl flex items-center gap-4 animate-bounce">
              <span className="text-3xl">🎙️</span>
              <p className="text-red-800 font-black leading-tight">
                Use the Live Microphone at the top to answer this! ⬆️<br/>
                <span className="text-sm font-normal">استخدم ميكروفون الهواء في الأعلى للإجابة على ميس نور</span>
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-4">
            <button onClick={() => playVoice(step.audioText)} disabled={isPlaying} className="w-12 h-12 flex items-center justify-center rounded-full bg-white border-2 border-blue-400 shadow-md hover:scale-110 active:scale-95">🔊</button>
          </div>
          
          <button
            onClick={onNext}
            className={`px-10 py-4 rounded-3xl font-black text-xl transition-all flex items-center gap-3
              bg-green-500 shadow-[0_8px_0_rgb(21,128,61)] text-white hover:translate-y-1 active:translate-y-2`}
          >
            {isLast ? "Summary! ⭐" : isExercise ? "Done! Next ➔" : "Next Step! ➔"}
          </button>
        </div>
      </div>
    </div>
  );
};
