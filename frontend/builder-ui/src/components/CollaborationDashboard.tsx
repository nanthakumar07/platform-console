import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { teamActivityService } from '../services/teamActivityService';
import { notificationService } from '../services/notificationService';
import { dashboardSharingService } from '../services/dashboardSharingService';
import { TeamActivity, ActivityComment, TeamMember, Notification, SharedDashboard } from '../types/collaboration';

interface CollaborationDashboardProps {
  className?: string;
}

export const CollaborationDashboard: React.FC<CollaborationDashboardProps> = ({ className = '' }) => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'activity' | 'comments' | 'notifications' | 'sharing'>('activity');
  const [teamActivities, setTeamActivities] = useState<TeamActivity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sharedDashboards, setSharedDashboards] = useState<SharedDashboard[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasPermission('collaboration:read')) {
      loadCollaborationData();
    }
  }, []);

  useEffect(() => {
    // Listen for real-time updates
    const handleTeamActivity = (event: CustomEvent) => {
      setTeamActivities(prev => [event.detail, ...prev.slice(0, 49)]);
    };

    const handleNewNotification = (event: CustomEvent) => {
      setNotifications(prev => [event.detail, ...prev.slice(0, 49)]);
    };

    const handleMemberStatusUpdate = (event: CustomEvent) => {
      setTeamMembers(prev => {
        const updated = [...prev];
        const index = updated.findIndex(m => m.id === event.detail.id);
        if (index !== -1) {
          updated[index] = event.detail;
        } else {
          updated.push(event.detail);
        }
        return updated;
      });
    };

    window.addEventListener('teamActivity', handleTeamActivity as EventListener);
    window.addEventListener('newNotification', handleNewNotification as EventListener);
    window.addEventListener('memberStatusUpdate', handleMemberStatusUpdate as EventListener);

    return () => {
      window.removeEventListener('teamActivity', handleTeamActivity as EventListener);
      window.removeEventListener('newNotification', handleNewNotification as EventListener);
      window.removeEventListener('memberStatusUpdate', handleMemberStatusUpdate as EventListener);
    };
  }, []);

  const loadCollaborationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [activities, notifs, shared, members] = await Promise.all([
        Promise.resolve(teamActivityService.getTeamActivities(50)),
        Promise.resolve(notificationService.getNotifications(50)),
        dashboardSharingService.getSharedDashboards(),
        Promise.resolve(teamActivityService.getTeamMembers())
      ]);

      setTeamActivities(activities);
      setNotifications(notifs);
      setSharedDashboards(shared);
      setTeamMembers(members);

    } catch (error) {
      console.error('Failed to load collaboration data:', error);
      setError('Failed to load collaboration data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const trackActivity = (action: TeamActivity['action'], entityType: TeamActivity['entityType'], entityId: string, entityName: string) => {
    teamActivityService.trackActivity(action, entityType, entityId, entityName);
  };

  const addComment = async (activityId: string, content: string) => {
    try {
      await teamActivityService.addComment(activityId, content);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId);
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId 
          ? { ...n, metadata: { ...n.metadata, read: true, readAt: new Date() } }
          : n
      )
    );
  };

  const shareDashboard = async (name: string, description?: string) => {
    try {
      const permissions = {
        canView: true,
        canEdit: false,
        canShare: false,
        canExport: true,
        canComment: true,
        allowedUsers: [],
        allowedRoles: ['analyst', 'admin'],
        isPublic: false,
        requireAuth: true
      };

      const shared = await dashboardSharingService.shareDashboard(name, description, permissions);
      setSharedDashboards(prev => [shared, ...prev]);
    } catch (error) {
      console.error('Failed to share dashboard:', error);
    }
  };

  const getActivityIcon = (action: TeamActivity['action']) => {
    switch (action) {
      case 'create': return '🆕';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      case 'comment': return '💬';
      case 'share': return '🔗';
      case 'login': return '👤';
      case 'logout': return '🚪';
      default: return '📋';
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'mention': return '@';
      case 'comment': return '💬';
      case 'share': return '🔗';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      case 'system': return '⚙️';
      case 'deadline': return '⏰';
      case 'approval': return '✅';
      default: return '📢';
    }
  };

  const getMemberStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-red-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (!hasPermission('collaboration:read')) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Access Restricted</h3>
          <p className="text-gray-600 mt-2">You don't have permission to view collaboration features.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadCollaborationData}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Collaboration</h2>
          <p className="text-gray-600">Real-time team activity and collaboration tools</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">
              {teamMembers.filter(m => m.status === 'online' || m.status === 'busy').length} online
            </span>
          </div>
          <button
            onClick={loadCollaborationData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'activity', label: 'Team Activity' },
            { key: 'comments', label: 'Comments' },
            { key: 'notifications', label: 'Notifications' },
            { key: 'sharing', label: 'Shared Dashboards' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Team Activity</h3>
              <div className="space-y-4">
                {teamActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                    <div className="text-2xl">{getActivityIcon(activity.action)}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{activity.userName}</span>
                        <span className="text-sm text-gray-500">
                          {activity.action} {activity.entityType}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.action === 'create' && 'Created '}
                        {activity.action === 'update' && 'Updated '}
                        {activity.action === 'delete' && 'Deleted '}
                        {activity.action === 'comment' && 'Commented on '}
                        {activity.action === 'share' && 'Shared '}
                        <span className="font-medium">{activity.entityName}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(activity.metadata.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Comments</h3>
              <div className="space-y-4">
                {teamActivities
                  .filter(a => a.action === 'comment')
                  .map((activity) => {
                    const comments = teamActivityService.getActivityComments(activity.id);
                    return (
                      <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium">
                            {activity.userName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">{activity.userName}</span>
                              <span className="text-sm text-gray-500">commented on</span>
                              <span className="font-medium">{activity.entityName}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{activity.entityDescription}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatTimeAgo(activity.metadata.timestamp)}
                            </p>
                            
                            {/* Comments */}
                            {comments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {comments.map((comment) => (
                                  <div key={comment.id} className="bg-gray-50 rounded p-3">
                                    <div className="flex items-start space-x-2">
                                      <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-xs font-medium">
                                        {comment.userName.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium text-sm">{comment.userName}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {formatTimeAgo(comment.metadata.timestamp)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Add comment */}
                            <div className="mt-3">
                              <textarea
                                placeholder="Add a comment..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={2}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.ctrlKey) {
                                    const target = e.target as HTMLTextAreaElement;
                                    if (target.value.trim()) {
                                      addComment(activity.id, target.value);
                                      target.value = '';
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {notifications.filter(n => !n.metadata.read).length} unread
                  </span>
                  <button
                    onClick={() => notificationService.markAllAsRead()}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Mark all as read
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border ${
                      notification.metadata.read
                        ? 'border-gray-200 bg-white'
                        : 'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-xl">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">{notification.title}</h4>
                          {!notification.metadata.read && (
                            <button
                              onClick={() => markNotificationAsRead(notification.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatTimeAgo(notification.metadata.timestamp)}
                        </p>
                        {notification.actions && notification.actions.length > 0 && (
                          <div className="mt-3 flex space-x-2">
                            {notification.actions.map((action) => (
                              <button
                                key={action.id}
                                onClick={() => {
                                  if (action.url) {
                                    window.location.href = action.url;
                                  }
                                }}
                                className={`px-3 py-1 text-xs font-medium rounded ${
                                  action.style === 'primary'
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : action.style === 'danger'
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                }`}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sharing' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Shared Dashboards</h3>
                <button
                  onClick={() => shareDashboard('New Shared Dashboard', 'Dashboard shared from collaboration hub')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Share Dashboard
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sharedDashboards.map((dashboard) => (
                  <div key={dashboard.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-gray-900">{dashboard.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded ${
                        dashboard.metadata.isPublic
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {dashboard.metadata.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                    {dashboard.description && (
                      <p className="text-sm text-gray-600 mt-2">{dashboard.description}</p>
                    )}
                    <div className="mt-3 space-y-2 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Created by {dashboard.ownerName}</span>
                        <span>{formatTimeAgo(dashboard.metadata.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{dashboard.collaborators.length} collaborators</span>
                        <span>{dashboard.metadata.accessCount} views</span>
                      </div>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <button
                        className="flex-1 px-3 py-2 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
                      >
                        View
                      </button>
                      <button
                        className="flex-1 px-3 py-2 text-xs font-medium rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                      >
                        Export
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Members Sidebar */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Team Members</h3>
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getMemberStatusColor(member.status)}`}></div>
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.email}</p>
                    {member.currentActivity && (
                      <p className="text-xs text-gray-500 mt-1">{member.currentActivity}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs rounded ${
                    member.status === 'online' ? 'bg-green-100 text-green-800' :
                    member.status === 'busy' ? 'bg-red-100 text-red-800' :
                    member.status === 'away' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {member.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationDashboard;
