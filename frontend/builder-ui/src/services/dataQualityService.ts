import { DataQualityIssue, DataQualityMetrics } from '../types/analytics';

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  entityType: 'object' | 'field' | 'relation' | 'user';
  severity: 'low' | 'medium' | 'high' | 'critical';
  validate: (entity: any, allEntities: any[]) => DataQualityIssue | null;
}

interface DataQualityReport {
  timestamp: number;
  totalEntities: number;
  checkedEntities: number;
  issuesFound: number;
  issues: DataQualityIssue[];
  metrics: DataQualityMetrics;
}

class DataQualityService {
  private validationRules: ValidationRule[] = [];
  private lastReport: DataQualityReport | null = null;
  private isScanning: boolean = false;

  constructor() {
    this.initializeValidationRules();
  }

  // Initialize built-in validation rules
  private initializeValidationRules(): void {
    this.validationRules = [
      // Missing data validation
      {
        id: 'required_fields_missing',
        name: 'Required Fields Missing',
        description: 'Check for required fields that are empty or null',
        entityType: 'field',
        severity: 'high',
        validate: (entity) => {
          if (entity.required && (!entity.value || entity.value.trim() === '')) {
            return {
              id: this.generateIssueId(),
              type: 'missing_data',
              severity: 'high',
              entityType: 'field',
              entityId: entity.id,
              entityName: entity.name,
              fieldName: entity.name,
              description: `Required field '${entity.name}' is missing or empty`,
              detectedAt: new Date(),
              count: 1,
              suggestedFix: 'Provide a value for this required field'
            };
          }
          return null;
        }
      },

      // Invalid email format
      {
        id: 'invalid_email_format',
        name: 'Invalid Email Format',
        description: 'Check for email fields with invalid format',
        entityType: 'field',
        severity: 'medium',
        validate: (entity) => {
          if (entity.dataType === 'EMAIL' && entity.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(entity.value)) {
              return {
                id: this.generateIssueId(),
                type: 'invalid_format',
                severity: 'medium',
                entityType: 'field',
                entityId: entity.id,
                entityName: entity.name,
                fieldName: entity.name,
                description: `Email field '${entity.name}' has invalid format: ${entity.value}`,
                detectedAt: new Date(),
                count: 1,
                suggestedFix: 'Correct the email format to: user@domain.com'
              };
            }
          }
          return null;
        }
      },

      // Duplicate object names
      {
        id: 'duplicate_object_names',
        name: 'Duplicate Object Names',
        description: 'Check for objects with duplicate names',
        entityType: 'object',
        severity: 'high',
        validate: (entity: any, allEntities: any[]) => {
          if (!allEntities) return null;
          const duplicates = allEntities.filter(
            obj => obj.entityType === 'object' && 
            obj.name === entity.name && 
            obj.id !== entity.id
          );
          
          if (duplicates.length > 0) {
            return {
              id: this.generateIssueId(),
              type: 'duplicate',
              severity: 'high',
              entityType: 'object',
              entityId: entity.id,
              entityName: entity.name,
              description: `Object '${entity.name}' has ${duplicates.length} duplicate(s)`,
              detectedAt: new Date(),
              count: duplicates.length + 1,
              suggestedFix: 'Rename objects to have unique names'
            };
          }
          return null;
        }
      },

      // Outdated data
      {
        id: 'outdated_data',
        name: 'Outdated Data',
        description: 'Check for data that hasn\'t been updated recently',
        entityType: 'object',
        severity: 'medium',
        validate: (entity) => {
          const lastUpdated = new Date(entity.updatedAt || entity.createdAt);
          const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysSinceUpdate > 365) { // More than 1 year old
            return {
              id: this.generateIssueId(),
              type: 'outdated',
              severity: 'medium',
              entityType: 'object',
              entityId: entity.id,
              entityName: entity.name,
              description: `Object '${entity.name}' hasn't been updated in ${Math.floor(daysSinceUpdate)} days`,
              detectedAt: new Date(),
              count: 1,
              suggestedFix: 'Review and update this object if still needed'
            };
          }
          return null;
        }
      },

      // Inconsistent field naming
      {
        id: 'inconsistent_field_naming',
        name: 'Inconsistent Field Naming',
        description: 'Check for fields with inconsistent naming conventions',
        entityType: 'field',
        severity: 'low',
        validate: (entity) => {
          const name = entity.name;
          
          // Check for camelCase consistency
          if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
            return {
              id: this.generateIssueId(),
              type: 'inconsistent',
              severity: 'low',
              entityType: 'field',
              entityId: entity.id,
              entityName: entity.name,
              fieldName: entity.name,
              description: `Field '${name}' doesn't follow camelCase naming convention`,
              detectedAt: new Date(),
              count: 1,
              suggestedFix: 'Rename field to follow camelCase convention'
            };
          }
          return null;
        }
      },

      // Invalid phone number format
      {
        id: 'invalid_phone_format',
        name: 'Invalid Phone Number Format',
        description: 'Check for phone fields with invalid format',
        entityType: 'field',
        severity: 'medium',
        validate: (entity) => {
          if (entity.dataType === 'PHONE' && entity.value) {
            const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
            if (!phoneRegex.test(entity.value) || entity.value.replace(/\D/g, '').length < 10) {
              return {
                id: this.generateIssueId(),
                type: 'invalid_format',
                severity: 'medium',
                entityType: 'field',
                entityId: entity.id,
                entityName: entity.name,
                fieldName: entity.name,
                description: `Phone field '${entity.name}' has invalid format: ${entity.value}`,
                detectedAt: new Date(),
                count: 1,
                suggestedFix: 'Use valid phone number format with country code'
              };
            }
          }
          return null;
        }
      }
    ];
  }

  // Run data quality scan
  async runDataQualityScan(entities: any[]): Promise<DataQualityReport> {
    if (this.isScanning) {
      throw new Error('Data quality scan already in progress');
    }

    this.isScanning = true;
    
    try {
      const issues: DataQualityIssue[] = [];
      const startTime = Date.now();

      // Run validation rules on all entities
      for (const entity of entities) {
        for (const rule of this.validationRules) {
          if (rule.entityType === entity.entityType) {
            const issue = rule.validate(entity, entities);
            if (issue) {
              issues.push(issue);
            }
          }
        }
      }

      // Group similar issues and count occurrences
      const groupedIssues = this.groupSimilarIssues(issues);
      
      // Calculate metrics
      const metrics = this.calculateQualityMetrics(entities, groupedIssues);

      const report: DataQualityReport = {
        timestamp: startTime,
        totalEntities: entities.length,
        checkedEntities: entities.length,
        issuesFound: groupedIssues.length,
        issues: groupedIssues,
        metrics
      };

      this.lastReport = report;
      return report;

    } finally {
      this.isScanning = false;
    }
  }

  // Get data quality metrics
  getDataQualityMetrics(): DataQualityMetrics {
    if (!this.lastReport) {
      return this.getDefaultMetrics();
    }

    return this.lastReport.metrics;
  }

  // Get data quality issues by type
  getIssuesByType(): Record<string, DataQualityIssue[]> {
    if (!this.lastReport) {
      return {};
    }

    const issuesByType: Record<string, DataQualityIssue[]> = {};
    
    this.lastReport.issues.forEach(issue => {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    });

    return issuesByType;
  }

  // Get data quality issues by severity
  getIssuesBySeverity(): Record<string, DataQualityIssue[]> {
    if (!this.lastReport) {
      return {};
    }

    const issuesBySeverity: Record<string, DataQualityIssue[]> = {};
    
    this.lastReport.issues.forEach(issue => {
      if (!issuesBySeverity[issue.severity]) {
        issuesBySeverity[issue.severity] = [];
      }
      issuesBySeverity[issue.severity].push(issue);
    });

    return issuesBySeverity;
  }

  // Add custom validation rule
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
  }

  // Remove validation rule
  removeValidationRule(ruleId: string): void {
    this.validationRules = this.validationRules.filter(rule => rule.id !== ruleId);
  }

  // Get validation rules
  getValidationRules(): ValidationRule[] {
    return [...this.validationRules];
  }

  // Private helper methods
  private generateIssueId(): string {
    return `dq_issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private groupSimilarIssues(issues: DataQualityIssue[]): DataQualityIssue[] {
    const grouped = new Map<string, DataQualityIssue>();

    issues.forEach(issue => {
      const key = `${issue.type}_${issue.entityType}_${issue.fieldName || issue.entityName}`;
      
      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        existing.count += issue.count;
        existing.detectedAt = issue.detectedAt > existing.detectedAt ? issue.detectedAt : existing.detectedAt;
      } else {
        grouped.set(key, { ...issue });
      }
    });

    return Array.from(grouped.values());
  }

  private calculateQualityMetrics(entities: any[], issues: DataQualityIssue[]): DataQualityMetrics {
    // Calculate individual quality scores
    const completeness = this.calculateCompleteness(entities, issues);
    const accuracy = this.calculateAccuracy(entities, issues);
    const consistency = this.calculateConsistency(entities, issues);
    const timeliness = this.calculateTimeliness(entities, issues);
    const validity = this.calculateValidity(entities, issues);

    // Calculate overall score
    const overallScore = (completeness + accuracy + consistency + timeliness + validity) / 5;

    // Determine trends (mock implementation)
    const trends = {
      improving: ['completeness', 'accuracy'],
      degrading: ['timeliness'],
      stable: ['consistency', 'validity']
    };

    return {
      overallScore: Math.round(overallScore * 100) / 100,
      completeness,
      accuracy,
      consistency,
      timeliness,
      validity,
      issues,
      trends
    };
  }

  private calculateCompleteness(entities: any[], issues: DataQualityIssue[]): number {
    const missingDataIssues = issues.filter(issue => issue.type === 'missing_data');
    const totalFields = entities.filter(e => e.entityType === 'field').length;
    const missingFields = missingDataIssues.reduce((sum, issue) => sum + issue.count, 0);
    
    return totalFields > 0 ? Math.max(0, 100 - (missingFields / totalFields) * 100) : 100;
  }

  private calculateAccuracy(entities: any[], issues: DataQualityIssue[]): number {
    const formatIssues = issues.filter(issue => issue.type === 'invalid_format');
    const totalFields = entities.filter(e => e.entityType === 'field').length;
    const invalidFields = formatIssues.reduce((sum, issue) => sum + issue.count, 0);
    
    return totalFields > 0 ? Math.max(0, 100 - (invalidFields / totalFields) * 100) : 100;
  }

  private calculateConsistency(entities: any[], issues: DataQualityIssue[]): number {
    const consistencyIssues = issues.filter(issue => issue.type === 'inconsistent' || issue.type === 'duplicate');
    const totalEntities = entities.length;
    const inconsistentEntities = consistencyIssues.reduce((sum, issue) => sum + issue.count, 0);
    
    return totalEntities > 0 ? Math.max(0, 100 - (inconsistentEntities / totalEntities) * 100) : 100;
  }

  private calculateTimeliness(entities: any[], issues: DataQualityIssue[]): number {
    const outdatedIssues = issues.filter(issue => issue.type === 'outdated');
    const totalObjects = entities.filter(e => e.entityType === 'object').length;
    const outdatedObjects = outdatedIssues.reduce((sum, issue) => sum + issue.count, 0);
    
    return totalObjects > 0 ? Math.max(0, 100 - (outdatedObjects / totalObjects) * 100) : 100;
  }

  private calculateValidity(entities: any[], issues: DataQualityIssue[]): number {
    const allIssues = issues.reduce((sum, issue) => sum + issue.count, 0);
    const totalEntities = entities.length;
    
    return totalEntities > 0 ? Math.max(0, 100 - (allIssues / totalEntities) * 100) : 100;
  }

  private getDefaultMetrics(): DataQualityMetrics {
    return {
      overallScore: 0,
      completeness: 0,
      accuracy: 0,
      consistency: 0,
      timeliness: 0,
      validity: 0,
      issues: [],
      trends: {
        improving: [],
        degrading: [],
        stable: []
      }
    };
  }

  // Get data quality summary
  getQualitySummary(): {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    issues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  } {
    const metrics = this.getDataQualityMetrics();
    const issuesBySeverity = this.getIssuesBySeverity();
    
    const score = metrics.overallScore;
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    
    if (score >= 90) status = 'excellent';
    else if (score >= 75) status = 'good';
    else if (score >= 60) status = 'fair';
    else status = 'poor';

    return {
      score,
      status,
      issues: metrics.issues.length,
      critical: issuesBySeverity.critical?.length || 0,
      high: issuesBySeverity.high?.length || 0,
      medium: issuesBySeverity.medium?.length || 0,
      low: issuesBySeverity.low?.length || 0
    };
  }
}

export const dataQualityService = new DataQualityService();
export default DataQualityService;
