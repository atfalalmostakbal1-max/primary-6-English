
import React, { useEffect, useState, useRef } from 'react';
import { teacherService, decodeBase64, encodeBase64, decodeAudioData } from '../services/geminiService';
import { LiveServerMessage } from '@google/genai';

export const LiveClassroom: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const startSession = async () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    audioCtxRef.current = audioCtx;

    const sessionPromise = teacherService.connectLive(
      async (message: LiveServerMessage) => {
        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (audioData && audioCtxRef.current) {
          const decodedData = decodeBase64(audioData);
          const buffer = await decodeAudioData(decodedData, audioCtxRef.current, 24000, 1);

          const source = audioCtxRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtxRef.current.destination);
          
          const startTime = Math.max(nextStartTimeRef.current, audioCtxRef.current.currentTime);
          source.start(startTime);
          nextStartTimeRef.current = startTime + buffer.duration;
        }

        if (message.serverContent?.interrupted) {
          nextStartTimeRef.current = 0;
        }
      },
      async () => {
        setIsActive(true);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          
          processor.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
              int16[i] = input[i] * 32768;
            }
            const base64 = encodeBase64(new Uint8Array(int16.buffer));
            
            sessionPromise.then((session) => {
              session.sendRealtimeInput({ 
                media: { data: base64, mimeType: 'audio/pcm;rate=16000' } 
              });
            });
          };
          
          source.connect(processor);
          processor.connect(inputCtx.destination);
        } catch (err) {
          console.error("Mic error:", err);
        }
      }
    );
    
    sessionPromiseRef.current = sessionPromise;
  };

  useEffect(() => {
    return () => {
      if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 p-12 bg-blue-900 rounded-[4rem] text-white shadow-3xl border-8 border-blue-400 relative">
      {/* Return Arrow */}
      <button 
        onClick={onClose} 
        className="absolute top-4 left-4 text-4xl hover:scale-125 transition-transform brightness-150 z-10"
        title="Exit Live Class"
      >
        🔙
      </button>

      <div className="text-center mt-4">
        <h2 className="text-5xl font-black mb-2 italic">On-Air Microphone 🎙️</h2>
        <p className="text-blue-200 text-xl font-medium">Talk to Miss Nour! She's listening to your English practice.</p>
      </div>

      <div className={`w-64 h-64 rounded-full flex items-center justify-center text-9xl bg-blue-800 border-8 border-blue-600 shadow-[0_0_50px_rgba(59,130,246,0.5)] transition-all ${isActive ? 'animate-pulse scale-110 border-green-400 shadow-[0_0_80px_rgba(34,197,94,0.6)]' : ''}`}>
        {isActive ? '👩‍🏫' : '🔌'}
      </div>

      {!isActive ? (
        <button 
          onClick={startSession}
          className="bg-green-500 hover:bg-green-600 px-12 py-6 rounded-3xl font-black text-3xl shadow-[0_10px_0_rgb(21,128,61)] hover:scale-105 transition-all"
        >
          Connect Now! ⚡
        </button>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-3 items-end h-20">
            <div className="w-4 bg-green-400 animate-bounce delay-75 rounded-full" style={{ height: '40%' }}></div>
            <div className="w-4 bg-green-400 animate-bounce delay-150 rounded-full" style={{ height: '80%' }}></div>
            <div className="w-4 bg-green-400 animate-bounce delay-300 rounded-full" style={{ height: '60%' }}></div>
            <div className="w-4 bg-green-400 animate-bounce delay-500 rounded-full" style={{ height: '100%' }}></div>
            <div className="w-4 bg-green-400 animate-bounce delay-75 rounded-full" style={{ height: '40%' }}></div>
          </div>
          <button 
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 px-10 py-5 rounded-2xl font-black text-xl shadow-[0_8px_0_rgb(153,27,27)] hover:translate-y-1 transition-all"
          >
            End Conversation 👋
          </button>
        </div>
      )}
    </div>
  );
};
