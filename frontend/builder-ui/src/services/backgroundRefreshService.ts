interface BackgroundRefreshConfig {
  interval: number; // Refresh interval in milliseconds
  enabled: boolean;
  retryAttempts: number;
  retryDelay: number;
}

interface RefreshTask {
  id: string;
  name: string;
  refreshFunction: () => Promise<any>;
  lastRefresh: number;
  interval: number;
  enabled: boolean;
  retryCount: number;
}

class BackgroundRefreshService {
  private tasks: Map<string, RefreshTask> = new Map();
  private intervals: Map<string, number> = new Map();
  private config: BackgroundRefreshConfig;
  private isOnline: boolean = true;

  constructor(config: Partial<BackgroundRefreshConfig> = {}) {
    this.config = {
      interval: 60000, // 1 minute default
      enabled: true,
      retryAttempts: 3,
      retryDelay: 5000, // 5 seconds
      ...config
    };

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.resumeAllTasks();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.pauseAllTasks();
    });

    // Listen for visibility change (page visibility)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAllTasks();
      } else {
        this.resumeAllTasks();
      }
    });
  }

  registerTask(
    id: string,
    name: string,
    refreshFunction: () => Promise<any>,
    interval?: number
  ): void {
    const task: RefreshTask = {
      id,
      name,
      refreshFunction,
      lastRefresh: 0,
      interval: interval || this.config.interval,
      enabled: true,
      retryCount: 0
    };

    this.tasks.set(id, task);

    if (this.config.enabled && this.isOnline && !document.hidden) {
      this.startTask(id);
    }
  }

  unregisterTask(id: string): void {
    this.stopTask(id);
    this.tasks.delete(id);
  }

  private startTask(id: string): void {
    const task = this.tasks.get(id);
    if (!task || !task.enabled) return;

    this.stopTask(id); // Clear any existing interval

    const intervalId = setInterval(async () => {
      await this.executeTask(id);
    }, task.interval);

    this.intervals.set(id, intervalId);

    // Execute immediately if never refreshed
    if (task.lastRefresh === 0) {
      this.executeTask(id);
    }
  }

  private stopTask(id: string): void {
    const intervalId = this.intervals.get(id);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(id);
    }
  }

  private async executeTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task || !this.isOnline || document.hidden) return;

    try {
      await task.refreshFunction();
      task.lastRefresh = Date.now();
      task.retryCount = 0;
    } catch (error) {
      console.error(`Background refresh failed for task ${task.name}:`, error);
      
      task.retryCount++;
      if (task.retryCount >= this.config.retryAttempts) {
        console.warn(`Task ${task.name} failed after ${this.config.retryAttempts} attempts, disabling temporarily`);
        this.stopTask(id);
        
        // Re-enable after exponential backoff
        const backoffDelay = this.config.retryDelay * Math.pow(2, task.retryCount);
        setTimeout(() => {
          const retryTask = this.tasks.get(id);
          if (retryTask) {
            retryTask.retryCount = 0;
            retryTask.enabled = true;
            this.startTask(id);
          }
        }, backoffDelay);
      }
    }
  }

  pauseTask(id: string): void {
    this.stopTask(id);
    const task = this.tasks.get(id);
    if (task) {
      task.enabled = false;
    }
  }

  resumeTask(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.enabled = true;
      this.startTask(id);
    }
  }

  private pauseAllTasks(): void {
    for (const id of this.tasks.keys()) {
      this.pauseTask(id);
    }
  }

  private resumeAllTasks(): void {
    for (const id of this.tasks.keys()) {
      this.resumeTask(id);
    }
  }

  updateTaskInterval(id: string, interval: number): void {
    const task = this.tasks.get(id);
    if (task) {
      task.interval = interval;
      if (task.enabled) {
        this.startTask(id); // Restart with new interval
      }
    }
  }

  getTaskStatus(id: string): {
    enabled: boolean;
    lastRefresh: number;
    interval: number;
    retryCount: number;
  } | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    return {
      enabled: task.enabled,
      lastRefresh: task.lastRefresh,
      interval: task.interval,
      retryCount: task.retryCount
    };
  }

  getAllTasksStatus(): Array<{
    id: string;
    name: string;
    enabled: boolean;
    lastRefresh: number;
    interval: number;
    retryCount: number;
  }> {
    return Array.from(this.tasks.values()).map(task => ({
      id: task.id,
      name: task.name,
      enabled: task.enabled,
      lastRefresh: task.lastRefresh,
      interval: task.interval,
      retryCount: task.retryCount
    }));
  }

  setGlobalEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (enabled) {
      this.resumeAllTasks();
    } else {
      this.pauseAllTasks();
    }
  }

  cleanup(): void {
    // Clear all intervals
    for (const intervalId of this.intervals.values()) {
      clearInterval(intervalId);
    }
    this.intervals.clear();
    this.tasks.clear();
  }
}

// Create singleton instance
export const backgroundRefreshService = new BackgroundRefreshService({
  interval: 30000, // 30 seconds default
  enabled: true,
  retryAttempts: 3,
  retryDelay: 5000
});

export default BackgroundRefreshService;
