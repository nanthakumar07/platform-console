import { DataSource } from 'typeorm';
import { Action, ActionType } from '../entities/Action';
import axios from 'axios';

export class ActionExecutor {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  async execute(action: Action, context: any): Promise<any> {
    try {
      switch (action.type) {
        case ActionType.FIELD_UPDATE:
          return await this.executeFieldUpdate(action, context);
        
        case ActionType.EMAIL:
          return await this.executeEmail(action, context);
        
        case ActionType.HTTP_CALL:
          return await this.executeHttpCall(action, context);
        
        case ActionType.CREATE_RECORD:
          return await this.executeCreateRecord(action, context);
        
        case ActionType.UPDATE_RECORD:
          return await this.executeUpdateRecord(action, context);
        
        case ActionType.DELETE_RECORD:
          return await this.executeDeleteRecord(action, context);
        
        case ActionType.NOTIFICATION:
          return await this.executeNotification(action, context);
        
        case ActionType.WEBHOOK:
          return await this.executeWebhook(action, context);
        
        case ActionType.SCRIPT:
          return await this.executeScript(action, context);
        
        case ActionType.APPROVAL:
          return await this.executeApproval(action, context);
        
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }
    } catch (error) {
      // Handle error based on action's error handling configuration
      if (action.errorHandling) {
        return await this.handleError(action, error, context);
      }
      throw error;
    }
  }

  private async executeFieldUpdate(action: Action, context: any): Promise<any> {
    const { objectType, recordId, updates } = action.config;
    
    // Call Data Access Layer to update record
    const response = await axios.put(
      `http://localhost:3003/api/v1/${context.tenantId}/${objectType}/${recordId}`,
      updates,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      action: 'field_update',
      result: response.data,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeEmail(action: Action, context: any): Promise<any> {
    const { to, cc, bcc, subject, template, variables } = action.config;
    
    // Process template variables
    const processedSubject = this.processTemplate(subject, context);
    const processedBody = this.processTemplate(template, context);
    
    // Here you would integrate with your email service
    // For now, we'll just log the email
    console.log('📧 Sending email:', {
      to: this.processTemplate(to, context),
      subject: processedSubject,
      body: processedBody,
    });

    return {
      success: true,
      action: 'email_sent',
      result: {
        to: this.processTemplate(to, context),
        subject: processedSubject,
        sentAt: new Date().toISOString(),
      },
    };
  }

  private async executeHttpCall(action: Action, context: any): Promise<any> {
    const { url, method, headers, body, timeout } = action.config;
    
    const processedUrl = this.processTemplate(url, context);
    const processedBody = body ? this.processTemplate(body, context) : undefined;
    const processedHeaders = headers ? this.processObjectTemplate(headers, context) : {};

    try {
      const response = await axios({
        method: method || 'POST',
        url: processedUrl,
        headers: {
          'Content-Type': 'application/json',
          ...processedHeaders,
        },
        data: processedBody,
        timeout: timeout || 30000,
      });

      return {
        success: true,
        action: 'http_call',
        result: {
          status: response.status,
          data: response.data,
          headers: response.headers,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        action: 'http_call',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async executeCreateRecord(action: Action, context: any): Promise<any> {
    const { objectType, data } = action.config;
    
    const processedData = this.processObjectTemplate(data, context);
    
    const response = await axios.post(
      `http://localhost:3003/api/v1/${context.tenantId}/${objectType}`,
      processedData,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      action: 'record_created',
      result: response.data,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeUpdateRecord(action: Action, context: any): Promise<any> {
    const { objectType, filter, updates } = action.config;
    
    const processedFilter = this.processObjectTemplate(filter, context);
    const processedUpdates = this.processObjectTemplate(updates, context);
    
    const response = await axios.patch(
      `http://localhost:3003/api/v1/${context.tenantId}/${objectType}`,
      {
        filter: processedFilter,
        updates: processedUpdates,
      },
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      action: 'records_updated',
      result: response.data,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeDeleteRecord(action: Action, context: any): Promise<any> {
    const { objectType, filter } = action.config;
    
    const processedFilter = this.processObjectTemplate(filter, context);
    
    const response = await axios.delete(
      `http://localhost:3003/api/v1/${context.tenantId}/${objectType}`,
      {
        data: { filter: processedFilter },
        headers: {
          'Authorization': `Bearer ${context.authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      action: 'records_deleted',
      result: response.data,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeNotification(action: Action, context: any): Promise<any> {
    const { type, title, message, recipients } = action.config;
    
    const processedTitle = this.processTemplate(title, context);
    const processedMessage = this.processTemplate(message, context);
    const processedRecipients = this.processTemplate(recipients, context);

    // Here you would integrate with your notification service
    console.log('🔔 Sending notification:', {
      type,
      title: processedTitle,
      message: processedMessage,
      recipients: processedRecipients,
    });

    return {
      success: true,
      action: 'notification_sent',
      result: {
        type,
        title: processedTitle,
        sentAt: new Date().toISOString(),
      },
    };
  }

  private async executeWebhook(action: Action, context: any): Promise<any> {
    const { url, method, headers, payload, secret } = action.config;
    
    const processedUrl = this.processTemplate(url, context);
    const processedPayload = this.processObjectTemplate(payload, context);
    
    // Generate HMAC signature if secret is provided
    const signature = secret ? this.generateHMAC(processedPayload, secret) : undefined;

    const response = await axios({
      method: method || 'POST',
      url: processedUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(signature && { 'X-Webhook-Signature': signature }),
        ...this.processObjectTemplate(headers || {}, context),
      },
      data: processedPayload,
    });

    return {
      success: true,
      action: 'webhook_called',
      result: {
        status: response.status,
        data: response.data,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async executeScript(action: Action, context: any): Promise<any> {
    const { script, language } = action.config;
    
    const processedScript = this.processTemplate(script, context);
    
    // Here you would implement a secure script execution environment
    // For now, we'll just return a placeholder
    console.log('🔧 Executing script:', { language, script: processedScript });

    return {
      success: true,
      action: 'script_executed',
      result: {
        output: 'Script execution result placeholder',
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async executeApproval(action: Action, context: any): Promise<any> {
    const { approvers, title, description, timeout } = action.config;
    
    const processedTitle = this.processTemplate(title, context);
    const processedDescription = this.processTemplate(description, context);
    const processedApprovers = this.processTemplate(approvers, context);

    // Create approval request in the system
    const approvalData = {
      workflowExecutionId: context.executionId,
      title: processedTitle,
      description: processedDescription,
      approvers: Array.isArray(processedApprovers) ? processedApprovers : [processedApprovers],
      timeout: timeout || 86400000, // 24 hours default
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    // Save approval request to database
    // This would be implemented based on your approval system schema

    return {
      success: true,
      action: 'approval_requested',
      result: approvalData,
      timestamp: new Date().toISOString(),
    };
  }

  private async handleError(action: Action, error: any, context: any): Promise<any> {
    const { retryCount, retryDelay, fallbackAction, continueOnError } = action.errorHandling!;

    if (retryCount && context.retryCount < retryCount) {
      // Schedule retry
      setTimeout(async () => {
        await this.execute(action, { ...context, retryCount: context.retryCount + 1 });
      }, retryDelay || 5000);

      return {
        success: false,
        action: 'retry_scheduled',
        retryCount: context.retryCount + 1,
        nextRetryAt: new Date(Date.now() + (retryDelay || 5000)).toISOString(),
      };
    }

    if (fallbackAction) {
      // Fallback action is stored as an action id/reference in config.
      return {
        success: false,
        action: 'fallback_required',
        fallbackAction,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }

    if (continueOnError) {
      return {
        success: true,
        action: 'error_ignored',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }

    throw error;
  }

  private processTemplate(template: string, context: any): string {
    if (!template || typeof template !== 'string') {
      return template;
    }

    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(context, key.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  private processObjectTemplate(obj: any, context: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.processObjectTemplate(item, context));
    }

    const processed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        processed[key] = this.processTemplate(value, context);
      } else if (typeof value === 'object') {
        processed[key] = this.processObjectTemplate(value, context);
      } else {
        processed[key] = value;
      }
    }

    return processed;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  private generateHMAC(payload: any, secret: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}
