import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

const RealTimeClock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const requestRef = useRef<number>(0);

  const animate = () => {
    setTime(new Date());
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
      <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-none mb-0.5">
          {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <span className="text-sm font-mono font-bold text-gray-700 dark:text-gray-200 tabular-nums leading-none">
          {time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          <span className="text-xs text-gray-400 ml-0.5">.{time.getMilliseconds().toString().padStart(3, '0')}</span>
        </span>
      </div>
    </div>
  );
};

export default RealTimeClock;