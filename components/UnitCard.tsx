
import React from 'react';
import { Unit } from '../types';

interface UnitCardProps {
  unit: Unit;
  onSelect: (unit: Unit) => void;
}

export const UnitCard: React.FC<UnitCardProps> = ({ unit, onSelect }) => {
  const icons = ["🏛️", "🌿", "👷", "⚡", "🏭", "💧"];
  const icon = icons[(unit.id - 1) % icons.length];
  
  return (
    <button
      onClick={() => onSelect(unit)}
      className="group bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all border-4 border-transparent hover:border-yellow-400 text-left flex flex-col gap-4 active:scale-95"
    >
      <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-800">Unit {unit.id}</h3>
        <p className="text-gray-600 font-medium leading-tight">{unit.title}</p>
      </div>
      <div className="mt-auto flex items-center text-yellow-600 font-bold text-sm">
        Explore {unit.lessons.length} Lessons →
      </div>
    </button>
  );
};
