"use client";

import { useEffect, useState, useRef } from "react";
import { getQueue, replaceQueue, type QueueItem } from "@/lib/import-queue";

const statusColor = {
  pending: "text-amber-400",
  running: "text-blue-400",
  completed: "text-green-400",
  failed: "text-red-400",
};

export function ImportQueueClient() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [input, setInput] = useState("");
  const isProcessingRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    getQueue().then(storedQueue => {
      const restoredQueue = storedQueue.map(item => 
        item.status === 'running' ? { ...item, status: 'pending' as const, startedAt: undefined } : item
      );
      setQueue(restoredQueue);
      if (restoredQueue.some(item => item.status !== storedQueue.find(i => i.id === item.id)?.status)) {
        replaceQueue(restoredQueue);
      }
    });
  }, []);

  const addToQueue = () => {
    if (!input.trim()) return;

    const ids = Array.from(new Set(input.split(/[\n,]+/).map(id => id.trim()).filter(Boolean)));
    const existingIds = new Set(queue.map(item => item.novelId));
    
    const newItems: QueueItem[] = ids
      .filter(id => !existingIds.has(id))
      .map(id => ({
        id: `${Date.now()}-${id}`,
        provider: "mvlempyr",
        novelId: id,
        status: "pending",
        retryCount: 0,
        createdAt: Date.now(),
      }));

    if (newItems.length > 0) {
      const newQueue = [...queue, ...newItems];
      setQueue(newQueue);
      replaceQueue(newQueue);
      setInput("");
    }
  };

  const startQueue = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);

    let currentQueue = await getQueue();
    while (isProcessingRef.current) {
      const pendingItem = currentQueue.find(item => item.status === "pending");
      if (!pendingItem) break;

      const item = { ...pendingItem, status: "running" as const, startedAt: Date.now() };
      currentQueue = currentQueue.map(i => i.id === item.id ? item : i);
      setQueue([...currentQueue]);
      await replaceQueue(currentQueue);

      // SIMULATION: Wait 2 seconds instead of fetching
      await new Promise(resolve => setTimeout(resolve, 2000));

      const completedItem: QueueItem = {
        ...item,
        status: "completed",
        finishedAt: Date.now(),
      };
      
      currentQueue = currentQueue.map(i => i.id === item.id ? completedItem : i);
      setQueue([...currentQueue]);
      await replaceQueue(currentQueue);
    }

    isProcessingRef.current = false;
    setIsProcessing(false);
  };

  const stopQueue = () => {
    isProcessingRef.current = false;
    setIsProcessing(false);
  };

  const handleClearCompleted = async () => {
    const newQueue = queue.filter(item => item.status !== "completed");
    setQueue(newQueue);
    await replaceQueue(newQueue);
  };
  
  const handleClearAll = async () => {
    stopQueue();
    setQueue([]);
    await replaceQueue([]);
  };
  
  const retryFailed = async () => {
    const newQueue = queue.map(item => 
      item.status === 'failed' ? { 
        ...item, 
        status: 'pending' as const, 
        error: undefined, 
        startedAt: undefined,
        finishedAt: undefined,
        retryCount: item.retryCount + 1 
      } : item
    );
    setQueue(newQueue);
    await replaceQueue(newQueue);
  };

  const stats = queue.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<QueueItem['status'], number>);

  return (
    <div className="flex w-full flex-col gap-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Import Queue</h1>
        <p className="text-sm text-white/60 mt-1">Batch import MVLEMPYR novels sequentially.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pending" value={String(stats.pending || 0)} color="text-amber-400" />
        <StatCard label="Running" value={String(stats.running || 0)} color="text-blue-400" />
        <StatCard label="Completed" value={String(stats.completed || 0)} color="text-green-400" />
        <StatCard label="Failed" value={String(stats.failed || 0)} color="text-red-400" />
      </div>

      <div className="space-y-3">
        <label className="text-xs uppercase tracking-[0.2em] text-white/45 font-medium">Add to Queue</label>
        <textarea
          className="w-full p-4 border border-white/10 rounded-xl bg-black/40 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all resize-none font-mono text-sm"
          rows={5}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste numeric MVLEMPYR IDs here...&#10;One per line or comma-separated&#10;Example: 12124, 1230, 4189"
        />
        
        <div className="flex flex-wrap gap-3">
          <button 
            className="flex-1 sm:flex-none min-w-[120px] px-5 py-2.5 bg-accent text-black font-semibold rounded-lg hover:bg-accent/90 transition-colors" 
            onClick={addToQueue}
          >
            Add IDs
          </button>
          <div className="hidden sm:block w-px bg-white/10 mx-2" />
          <button 
            className="flex-1 sm:flex-none min-w-[120px] px-5 py-2.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={startQueue} 
            disabled={isProcessing || stats.pending === 0}
          >
            {isProcessing ? "Processing..." : "Start Queue"}
          </button>
          <button 
            className="flex-1 sm:flex-none min-w-[120px] px-5 py-2.5 bg-white/5 text-white/80 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={stopQueue} 
            disabled={!isProcessing}
          >
            Stop
          </button>
        </div>
      </div>

      <div className="pt-6 border-t border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Queue List</h2>
          <div className="flex gap-2">
            <button 
              className="px-3 py-1.5 bg-white/5 text-white/70 text-xs rounded hover:bg-white/10 transition-colors" 
              onClick={retryFailed}
              disabled={!stats.failed}
            >
              Retry Failed
            </button>
            <button 
              className="px-3 py-1.5 bg-white/5 text-white/70 text-xs rounded hover:bg-white/10 transition-colors" 
              onClick={handleClearCompleted}
              disabled={!stats.completed}
            >
              Clear Completed
            </button>
            <button 
              className="px-3 py-1.5 bg-red-500/10 text-red-300 text-xs rounded hover:bg-red-500/20 transition-colors border border-red-500/20" 
              onClick={handleClearAll}
              disabled={queue.length === 0}
            >
              Clear All
            </button>
          </div>
        </div>
        
        {queue.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
            <p className="text-white/40 text-sm">Queue is empty</p>
          </div>
        ) : (
          <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {queue.map(item => (
              <li key={item.id} className="p-4 border border-white/10 bg-black/20 rounded-xl flex flex-col sm:flex-row gap-4 justify-between transition-colors hover:bg-black/30">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-white">ID: {item.novelId}</span>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border border-current bg-current bg-opacity-10 ${statusColor[item.status]}`}>
                      {item.status}
                    </span>
                  </div>
                  {item.error && <p className="text-red-400 text-xs mt-2 break-words">{item.error}</p>}
                </div>
                <div className="flex flex-col sm:items-end text-[10px] sm:text-xs text-white/40 space-y-1 justify-center shrink-0">
                  {item.startedAt && <div>Started: {new Date(item.startedAt).toLocaleTimeString()}</div>}
                  {item.finishedAt && <div>Finished: {new Date(item.finishedAt).toLocaleTimeString()}</div>}
                  {item.retryCount > 0 && <div>Retries: {item.retryCount}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string, color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4 text-center sm:text-left">
      <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/45 font-medium">{label}</p>
      <p className={`mt-1 sm:mt-2 text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
