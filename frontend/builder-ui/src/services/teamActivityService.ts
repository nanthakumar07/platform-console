import { TeamActivity, ActivityComment, TeamMember, CollaborationSession, SessionParticipant } from '../types/collaboration';
import { authService } from './auth';

class TeamActivityService {
  private activities: TeamActivity[] = [];
  private comments: Map<string, ActivityComment[]> = new Map();
  private teamMembers: TeamMember[] = [];
  private activeSessions: Map<string, CollaborationSession> = new Map();
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.initializeWebSocket();
    this.loadTeamMembers();
  }

  // Initialize WebSocket for real-time updates
  private initializeWebSocket(): void {
    const user = authService.getUser();
    if (!user) return;
    const token = authService.getToken();
    if (!token) return;

    const wsUrl = `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace('http://', 'ws://').replace('https://', 'w://')}/ws/team-activity?token=${token}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('Team activity WebSocket connected');
        this.reconnectAttempts = 0;
        this.sendHeartbeat();
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };

      this.ws.onclose = () => {
        console.log('Team activity WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Team activity WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to initialize team activity WebSocket:', error);
      // Fallback to polling
      this.startPolling();
    }
  }

  // Handle WebSocket messages
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'activity':
          this.handleNewActivity(message.data);
          break;
        case 'comment':
          this.handleNewComment(message.data);
          break;
        case 'member_status':
          this.handleMemberStatusUpdate(message.data);
          break;
        case 'session_update':
          this.handleSessionUpdate(message.data);
          break;
        case 'heartbeat':
          this.sendHeartbeat();
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  // Handle new activity
  private handleNewActivity(activity: TeamActivity): void {
    this.activities.unshift(activity);
    
    // Keep only last 1000 activities in memory
    if (this.activities.length > 1000) {
      this.activities = this.activities.slice(0, 1000);
    }

    // Emit custom event for UI updates
    window.dispatchEvent(new CustomEvent('teamActivity', { detail: activity }));
  }

  // Handle new comment
  private handleNewComment(comment: ActivityComment): void {
    const activityId = comment.activityId;
    
    if (!this.comments.has(activityId)) {
      this.comments.set(activityId, []);
    }
    
    this.comments.get(activityId)!.push(comment);
    
    // Emit custom event for UI updates
    window.dispatchEvent(new CustomEvent('newComment', { detail: comment }));
  }

  // Handle member status update
  private handleMemberStatusUpdate(member: TeamMember): void {
    const index = this.teamMembers.findIndex(m => m.id === member.id);
    if (index !== -1) {
      this.teamMembers[index] = member;
    } else {
      this.teamMembers.push(member);
    }

    // Emit custom event for UI updates
    window.dispatchEvent(new CustomEvent('memberStatusUpdate', { detail: member }));
  }

  // Handle session update
  private handleSessionUpdate(session: CollaborationSession): void {
    this.activeSessions.set(session.id, session);
    
    // Emit custom event for UI updates
    window.dispatchEvent(new CustomEvent('sessionUpdate', { detail: session }));
  }

  // Send heartbeat to keep connection alive
  private sendHeartbeat(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }

  // Attempt to reconnect WebSocket
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached, falling back to polling');
      this.startPolling();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.initializeWebSocket();
    }, delay);
  }

  // Start polling as fallback
  private startPolling(): void {
    setInterval(() => {
      this.fetchRecentActivity();
    }, 30000); // Poll every 30 seconds
  }

  // Track user activity
  trackActivity(
    action: TeamActivity['action'],
    entityType: TeamActivity['entityType'],
    entityId: string,
    entityName: string,
    metadata: Partial<TeamActivity['metadata']> = {}
  ): void {
    const user = authService.getUser();
    if (!user) return;

    const activity: TeamActivity = {
      id: this.generateActivityId(),
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      userAvatar: undefined, // AuthUser doesn't have avatar property
      action,
      entityType,
      entityId,
      entityName,
      metadata: {
        timestamp: new Date(),
        tenantId: user.tenantId || 'default',
        sessionId: this.getSessionId(),
        userAgent: navigator.userAgent,
        ...metadata
      },
      visibility: 'team',
      priority: this.determinePriority(action, entityType)
    };

    // Send via WebSocket if available
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'activity',
        data: activity
      }));
    } else {
      // Fallback to API
      this.sendActivityToAPI(activity);
    }

    // Add to local activities
    this.handleNewActivity(activity);
  }

  // Get team activities
  getTeamActivities(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      userId?: string;
      entityType?: string;
      action?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): TeamActivity[] {
    let filtered = [...this.activities];

    if (filters) {
      if (filters.userId) {
        filtered = filtered.filter(a => a.userId === filters.userId);
      }
      if (filters.entityType) {
        filtered = filtered.filter(a => a.entityType === filters.entityType);
      }
      if (filters.action) {
        filtered = filtered.filter(a => a.action === filters.action);
      }
      if (filters.dateFrom) {
        filtered = filtered.filter(a => a.metadata.timestamp >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        filtered = filtered.filter(a => a.metadata.timestamp <= filters.dateTo!);
      }
    }

    return filtered.slice(offset, offset + limit);
  }

  // Get activity comments
  getActivityComments(activityId: string): ActivityComment[] {
    return this.comments.get(activityId) || [];
  }

  // Add comment to activity
  async addComment(
    activityId: string,
    content: string,
    mentions: string[] = []
  ): Promise<ActivityComment> {
    const user = authService.getUser();
    if (!user) throw new Error('User not authenticated');

    const comment: ActivityComment = {
      id: this.generateCommentId(),
      activityId,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      userAvatar: undefined, // AuthUser doesn't have avatar property
      content,
      metadata: {
        timestamp: new Date(),
        tenantId: user.tenantId || 'default',
        mentions,
        attachments: [],
        isResolved: false
      },
      reactions: [],
      replies: []
    };

    // Send via WebSocket if available
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'comment',
        data: comment
      }));
    } else {
      // Fallback to API
      await this.sendCommentToAPI(comment);
    }

    // Add to local comments
    this.handleNewComment(comment);

    return comment;
  }

  // Get team members
  getTeamMembers(): TeamMember[] {
    return [...this.teamMembers];
  }

  // Get online team members
  getOnlineMembers(): TeamMember[] {
    return this.teamMembers.filter(member => 
      member.status === 'online' || member.status === 'busy'
    );
  }

  // Start collaboration session
  startCollaborationSession(dashboardId: string): CollaborationSession {
    const user = authService.getUser();
    if (!user) throw new Error('User not authenticated');

    const session: CollaborationSession = {
      id: this.generateSessionId(),
      dashboardId,
      participants: [{
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        joinedAt: new Date(),
        isActive: true
      }],
      activity: [],
      metadata: {
        startTime: new Date(),
        isActive: true,
        tenantId: user.tenantId || 'default'
      }
    };

    this.activeSessions.set(session.id, session);

    // Notify other users
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'session_start',
        data: session
      }));
    }

    return session;
  }

  // Join collaboration session
  joinCollaborationSession(sessionId: string): void {
    const user = authService.getUser();
    if (!user) return;

    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const participant: SessionParticipant = {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      joinedAt: new Date(),
      isActive: true
    };

    session.participants.push(participant);

    // Notify other participants
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'session_join',
        data: { sessionId, participant }
      }));
    }
  }

  // Send session activity
  sendSessionActivity(sessionId: string, activity: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'session_activity',
        data: { sessionId, activity }
      }));
    }
  }

  // Get active collaboration sessions
  getActiveSessions(): CollaborationSession[] {
    return Array.from(this.activeSessions.values()).filter(
      session => session.metadata.isActive
    );
  }

  // Private helper methods
  private generateActivityId(): string {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCommentId(): string {
    return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  private determinePriority(
    action: TeamActivity['action'],
    entityType: TeamActivity['entityType']
  ): TeamActivity['priority'] {
    if (action === 'delete') return 'high';
    if (entityType === 'user') return 'high';
    if (action === 'create') return 'medium';
    return 'low';
  }

  private async sendActivityToAPI(activity: TeamActivity): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) {
        console.log('No token available for activity API');
        return;
      }

      await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/team-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(activity)
      });
    } catch (error) {
      console.error('Failed to send activity to API:', error);
    }
  }

  private async sendCommentToAPI(comment: ActivityComment): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) {
        console.log('No token available for comment API');
        return;
      }

      await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(comment)
      });
    } catch (error) {
      console.error('Failed to send comment to API:', error);
    }
  }

  private async fetchRecentActivity(): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) {
        console.log('No token available for activity feed');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/team-activity/recent`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const activities = await response.json();
        activities.forEach((activity: TeamActivity) => {
          this.handleNewActivity(activity);
        });
      } else if (response.status === 401) {
        console.log('Authentication failed for activity feed');
        await authService.logout();
      }
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    }
  }

  private async loadTeamMembers(): Promise<void> {
    console.log('🔄 Loading team members...');
    try {
      const user = authService.getUser();
      if (!user) {
        console.log('❌ No user found, skipping team members load');
        return;
      }
      
      const tenantId = user.tenantId || 'default';
      const token = authService.getToken();
      
      if (!token) {
        console.log('❌ No token found, skipping team members load');
        return;
      }
      
      console.log(`📡 Making API call to: ${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/team-activity/${tenantId}/members`);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/team-activity/${tenantId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        this.teamMembers = result.data || result;
        console.log(`✅ Loaded ${this.teamMembers.length} team members`);
      } else if (response.status === 401) {
        console.log('❌ Authentication failed, logging out');
        await authService.logout();
      } else {
        console.log(`❌ Failed to load team members: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to load team members:', error);
    }
  }

  // Cleanup
  cleanup(): void {
    // Clear WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Clear in-memory data
    this.activities = [];
    this.comments.clear();
    this.teamMembers = [];
    this.activeSessions.clear();
    this.reconnectAttempts = 0;
    
    console.log('Team activity service cleaned up');
  }
}

export const teamActivityService = new TeamActivityService();
export default TeamActivityService;
