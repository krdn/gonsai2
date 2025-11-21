'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Search, Download, Trash2, Pause, Play, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { getSocketClient, type LogMessage } from '@/lib/socket-client';

interface LogStreamProps {
  className?: string;
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'all';

export function LogStream({ className = '' }: LogStreamProps) {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const MAX_LOGS = 500;

  useEffect(() => {
    const socket = getSocketClient();

    const handleLogMessage = (data: LogMessage) => {
      if (isPaused) return;

      setLogs((prev) => {
        const newLogs = [data, ...prev].slice(0, MAX_LOGS);
        return newLogs;
      });
    };

    socket.onLogMessage(handleLogMessage);

    return () => {
      socket.offLogMessage(handleLogMessage);
    };
  }, [isPaused]);

  // Filter logs based on search and level
  useEffect(() => {
    let filtered = logs;

    // Level filter
    if (selectedLevel !== 'all') {
      filtered = filtered.filter((log) => log.level === selectedLevel);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(query) ||
          log.executionId?.toLowerCase().includes(query) ||
          log.workflowId?.toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
  }, [logs, searchQuery, selectedLevel]);

  // Auto scroll
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [filteredLogs, autoScroll]);

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'debug':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getLevelLabel = (level: LogLevel) => {
    return level.toUpperCase().padEnd(5, ' ');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const content = filteredLogs
      .map(
        (log) =>
          `[${format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}] [${log.level.toUpperCase()}] ${log.message}`
      )
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${format(new Date(), 'yyyyMMdd-HHmmss')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900">실시간 로그</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title={isPaused ? '재개' : '일시정지'}
            >
              {isPaused ? (
                <Play className="w-4 h-4 text-gray-600" />
              ) : (
                <Pause className="w-4 h-4 text-gray-600" />
              )}
            </button>
            <button
              onClick={exportLogs}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="로그 내보내기"
            >
              <Download className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={clearLogs}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="로그 지우기"
            >
              <Trash2 className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="로그 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Level Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as LogLevel)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="all">전체</option>
              <option value="info">INFO</option>
              <option value="warn">WARN</option>
              <option value="error">ERROR</option>
              <option value="debug">DEBUG</option>
            </select>
          </div>
        </div>

        {/* Auto-scroll toggle */}
        <div className="mt-2 flex items-center">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            <span>자동 스크롤</span>
          </label>
          <span className="ml-auto text-xs text-gray-500">
            {filteredLogs.length} / {logs.length} 로그
          </span>
        </div>
      </div>

      {/* Log Content */}
      <div
        ref={logContainerRef}
        className="flex-1 p-4 bg-gray-900 text-gray-100 font-mono text-xs overflow-y-auto"
        style={{ maxHeight: '500px' }}
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {logs.length === 0 ? '로그가 없습니다' : '검색 결과가 없습니다'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`flex gap-3 p-2 rounded ${
                  log.level === 'error'
                    ? 'bg-red-900/20'
                    : log.level === 'warn'
                      ? 'bg-yellow-900/20'
                      : ''
                }`}
              >
                {/* Timestamp */}
                <span className="text-gray-500 flex-shrink-0">
                  {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                </span>

                {/* Level */}
                <span
                  className={`inline-block px-1.5 rounded font-semibold flex-shrink-0 ${getLevelColor(log.level)}`}
                >
                  {getLevelLabel(log.level)}
                </span>

                {/* Message */}
                <span className="flex-1 break-all">{log.message}</span>

                {/* Metadata */}
                {(log.executionId || log.workflowId) && (
                  <span className="text-gray-500 text-xs flex-shrink-0">
                    {log.executionId?.slice(0, 8)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
        <div className="flex gap-4">
          <span className="text-blue-600">
            INFO: {logs.filter((l) => l.level === 'info').length}
          </span>
          <span className="text-yellow-600">
            WARN: {logs.filter((l) => l.level === 'warn').length}
          </span>
          <span className="text-red-600">
            ERROR: {logs.filter((l) => l.level === 'error').length}
          </span>
          <span className="text-gray-600">
            DEBUG: {logs.filter((l) => l.level === 'debug').length}
          </span>
        </div>
        {isPaused && <span className="text-orange-600 font-semibold">⏸ 일시정지됨</span>}
      </div>
    </div>
  );
}
