'use client';

import React from 'react';
import { Clock } from 'lucide-react';

export default function TimerBar({ timeLeft, totalTime = 60, isRunning = true }) {
  const percentage = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
  const isUrgent = timeLeft <= 10;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  let barColor = 'var(--primary)';
  if (timeLeft <= 15) barColor = 'var(--accent-amber)';
  if (timeLeft <= 5) barColor = 'var(--accent-rose)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          <Clock size={16} color={isUrgent ? 'var(--accent-rose)' : 'var(--primary)'} />
          <span>Tempo Restante</span>
        </div>
        <span className={`tac-timer-digits ${isUrgent ? 'urgent' : ''}`}>
          {formattedTime}
        </span>
      </div>

      <div style={{
        width: '100%',
        height: '6px',
        backgroundColor: '#e2e8f0',
        borderRadius: '999px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: barColor,
          transition: 'width 1s linear, background-color 0.3s ease'
        }} />
      </div>
    </div>
  );
}
