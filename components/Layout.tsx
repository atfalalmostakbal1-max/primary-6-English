
import React, { useState, useRef, useEffect } from 'react';
import { teacherService, decodeBase64, encodeBase64, decodeAudioData } from '../services/geminiService';
import { LiveServerMessage } from '@google/genai';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const toggleLive = async () => {
    if (isLiveActive || isConnecting) {
      // Disconnect
      if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
      }
      setIsLiveActive(false);
      setIsConnecting(false);
      return;
    }

    // Connect
    setIsConnecting(true);
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
        setIsLiveActive(true);
        setIsConnecting(false);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
            const base64 = encodeBase64(new Uint8Array(int16.buffer));
            sessionPromise.then((session) => {
              session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
            });
          };
          source.connect(processor);
          processor.connect(inputCtx.destination);
        } catch (err) {
          console.error("Mic error:", err);
          setIsLiveActive(false);
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
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-4xl flex items-center justify-between mb-8 bg-white/90 backdrop-blur rounded-3xl p-4 shadow-xl border-4 border-yellow-400">
        <div className="flex items-center gap-4">
          <div className="bg-yellow-100 p-2 rounded-2xl">
            <span className="text-4xl">👩‍🏫</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-yellow-800">Miss Nour's Class</h1>
            <p className="text-sm text-yellow-600 font-medium">Primary 6 English - Term 1</p>
          </div>
        </div>

        {/* Live Mic Button integrated into the header rectangle */}
        <div className="flex items-center gap-3">
          {isLiveActive && (
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[10px] font-black text-red-500 animate-pulse">LIVE ON AIR</span>
              <div className="flex gap-1">
                <div className="w-1 h-3 bg-red-400 animate-bounce rounded-full"></div>
                <div className="w-1 h-5 bg-red-400 animate-bounce delay-75 rounded-full"></div>
                <div className="w-1 h-3 bg-red-400 animate-bounce delay-150 rounded-full"></div>
              </div>
            </div>
          )}
          
          <button 
            onClick={toggleLive}
            disabled={isConnecting}
            className={`relative group w-14 h-14 rounded-full flex items-center justify-center transition-all border-4 
              ${isLiveActive 
                ? 'bg-red-500 border-red-200 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-110' 
                : isConnecting 
                  ? 'bg-yellow-400 border-yellow-200 animate-spin cursor-wait' 
                  : 'bg-white border-yellow-100 hover:border-yellow-400 hover:scale-105 active:scale-95'}`}
          >
            {isLiveActive && (
               <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-75"></div>
            )}
            <span className={`text-2xl transition-transform ${isLiveActive ? 'scale-125' : ''}`}>
              {isConnecting ? '⏳' : isLiveActive ? '🎙️' : '🎤'}
            </span>
            
            {/* Tooltip */}
            <div className="absolute top-full mt-3 right-0 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {isLiveActive ? 'Click to Stop' : 'Talk to Miss Nour'}
            </div>
          </button>
        </div>
      </header>
      
      <main className="w-full max-w-4xl flex-grow flex flex-col">
        {children}
      </main>
      
      <footer className="mt-8 text-yellow-700/60 text-sm font-medium">
        Interactive Educational App for Grade 6 Students
      </footer>
    </div>
  );
};
