import { UserEngagementEvent, FeatureUsageStats, UserSessionMetrics, EngagementAnalytics } from '../types/analytics';

class UserEngagementService {
  private events: UserEngagementEvent[] = [];
  private currentSession: UserSessionMetrics | null = null;
  private sessionStartTime: number = 0;
  private sessionId: string = '';
  private userId: string = '';
  private tenantId: string = '';

  // Initialize session tracking
  initializeSession(userId: string, tenantId: string): void {
    this.userId = userId;
    this.tenantId = tenantId;
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    
    this.currentSession = {
      sessionId: this.sessionId,
      userId,
      startTime: new Date(),
      pageViews: 0,
      featuresUsed: [],
      interactions: 0,
      bounceRate: 0
    };

    this.trackEvent('session_start', {
      userAgent: navigator.userAgent,
      referrer: document.referrer
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Track page unload
    window.addEventListener('beforeunload', this.handlePageUnload.bind(this));
  }

  // Track user engagement events
  trackEvent(
    eventType: UserEngagementEvent['eventType'],
    metadata: Partial<UserEngagementEvent['metadata']> = {},
    featureName?: string
  ): void {
    const event: UserEngagementEvent = {
      id: this.generateEventId(),
      userId: this.userId,
      tenantId: this.tenantId,
      eventType,
      featureName,
      metadata: {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
        path: window.location.pathname,
        ...metadata
      }
    };

    this.events.push(event);
    
    // Update session metrics
    if (this.currentSession) {
      if (eventType === 'page_view') {
        this.currentSession.pageViews++;
      } else if (eventType === 'interaction') {
        this.currentSession.interactions++;
      } else if (eventType === 'feature_usage' && featureName) {
        if (!this.currentSession.featuresUsed.includes(featureName)) {
          this.currentSession.featuresUsed.push(featureName);
        }
      }
    }

    // Send events to server (batched)
    this.flushEvents();
  }

  // Track feature usage
  trackFeatureUsage(featureName: string, duration?: number): void {
    this.trackEvent('feature_usage', { duration }, featureName);
  }

  // Track page views
  trackPageView(path?: string): void {
    this.trackEvent('page_view', { path: path || window.location.pathname });
  }

  // Track user interactions
  trackInteraction(interactionType: string, element?: string): void {
    this.trackEvent('interaction', { interactionType, element });
  }

  // Get engagement analytics
  async getEngagementAnalytics(): Promise<EngagementAnalytics> {
    // In a real implementation, this would call the API
    // For now, return mock data
    const mockData: EngagementAnalytics = {
      totalUsers: 1250,
      activeUsers: 342,
      avgSessionDuration: 12.5, // minutes
      pageViews: 15678,
      featureUsage: this.generateMockFeatureUsage(),
      topFeatures: ['Object Builder', 'Form Builder', 'Dashboard', 'Statistics', 'Field Builder'],
      userRetention: {
        daily: 0.78,
        weekly: 0.65,
        monthly: 0.42
      },
      engagementScore: 8.4
    };

    return mockData;
  }

  // Get feature usage statistics
  getFeatureUsageStats(): FeatureUsageStats[] {
    const featureMap = new Map<string, FeatureUsageStats>();

    // Process events to calculate feature usage
    this.events
      .filter(event => event.eventType === 'feature_usage')
      .forEach(event => {
        const featureName = event.featureName!;
        
        if (!featureMap.has(featureName)) {
          featureMap.set(featureName, {
            featureName,
            totalUses: 0,
            uniqueUsers: 0,
            avgSessionTime: 0,
            usageFrequency: 'rare',
            trend: 'stable',
            lastUsed: new Date()
          });
        }

        const stats = featureMap.get(featureName)!;
        stats.totalUses++;
        stats.lastUsed = new Date(event.metadata.timestamp);
        
        if (event.metadata.duration) {
          stats.avgSessionTime = (stats.avgSessionTime + event.metadata.duration) / 2;
        }
      });

    // Calculate unique users and usage frequency
    const usersByFeature = new Map<string, Set<string>>();
    
    this.events
      .filter(event => event.eventType === 'feature_usage')
      .forEach(event => {
        const featureName = event.featureName!;
        if (!usersByFeature.has(featureName)) {
          usersByFeature.set(featureName, new Set());
        }
        usersByFeature.get(featureName)!.add(event.userId);
      });

    usersByFeature.forEach((users, featureName) => {
      const stats = featureMap.get(featureName)!;
      stats.uniqueUsers = users.size;
      
      // Determine usage frequency
      if (stats.totalUses > 100) {
        stats.usageFrequency = 'daily';
      } else if (stats.totalUses > 50) {
        stats.usageFrequency = 'weekly';
      } else if (stats.totalUses > 10) {
        stats.usageFrequency = 'monthly';
      } else {
        stats.usageFrequency = 'rare';
      }
    });

    return Array.from(featureMap.values());
  }

  // Calculate engagement score
  calculateEngagementScore(): number {
    if (!this.currentSession) return 0;

    const session = this.currentSession;
    let score = 0;

    // Page views contribution (0-30 points)
    score += Math.min(session.pageViews * 2, 30);

    // Feature usage contribution (0-40 points)
    score += Math.min(session.featuresUsed.length * 8, 40);

    // Interactions contribution (0-20 points)
    score += Math.min(session.interactions * 0.5, 20);

    // Session duration contribution (0-10 points)
    if (session.duration) {
      const durationMinutes = session.duration / (1000 * 60);
      score += Math.min(durationMinutes / 5, 10);
    }

    return Math.round(score);
  }

  // Private helper methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page is hidden, pause tracking
      this.trackEvent('session_pause');
    } else {
      // Page is visible again, resume tracking
      this.trackEvent('session_resume');
    }
  }

  private handlePageUnload(): void {
    this.endSession();
  }

  private endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      this.currentSession.duration = Date.now() - this.sessionStartTime;
      
      // Calculate bounce rate (simplified)
      this.currentSession.bounceRate = this.currentSession.pageViews <= 1 ? 1 : 0;

      this.trackEvent('session_end', {
        duration: this.currentSession.duration,
        pageViews: this.currentSession.pageViews,
        featuresUsed: this.currentSession.featuresUsed.length,
        interactions: this.currentSession.interactions,
        bounceRate: this.currentSession.bounceRate
      });
    }
  }

  private generateMockFeatureUsage(): FeatureUsageStats[] {
    return [
      {
        featureName: 'Object Builder',
        totalUses: 342,
        uniqueUsers: 89,
        avgSessionTime: 8.5,
        usageFrequency: 'daily',
        trend: 'increasing',
        lastUsed: new Date()
      },
      {
        featureName: 'Form Builder',
        totalUses: 278,
        uniqueUsers: 76,
        avgSessionTime: 12.3,
        usageFrequency: 'daily',
        trend: 'stable',
        lastUsed: new Date()
      },
      {
        featureName: 'Dashboard',
        totalUses: 892,
        uniqueUsers: 234,
        avgSessionTime: 4.2,
        usageFrequency: 'daily',
        trend: 'increasing',
        lastUsed: new Date()
      },
      {
        featureName: 'Statistics',
        totalUses: 156,
        uniqueUsers: 45,
        avgSessionTime: 6.7,
        usageFrequency: 'weekly',
        trend: 'stable',
        lastUsed: new Date()
      },
      {
        featureName: 'Field Builder',
        totalUses: 423,
        uniqueUsers: 98,
        avgSessionTime: 5.8,
        usageFrequency: 'daily',
        trend: 'increasing',
        lastUsed: new Date()
      }
    ];
  }

  private async flushEvents(): Promise<void> {
    if (this.events.length === 0) return;

    try {
      // In a real implementation, send events to the server
      // await fetch('/api/analytics/events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ events: this.events })
      // });

      // Clear sent events
      this.events = [];
    } catch (error) {
      console.error('Failed to flush engagement events:', error);
    }
  }

  // Cleanup method
  cleanup(): void {
    this.endSession();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('beforeunload', this.handlePageUnload.bind(this));
  }
}

export const userEngagementService = new UserEngagementService();
export default UserEngagementService;
