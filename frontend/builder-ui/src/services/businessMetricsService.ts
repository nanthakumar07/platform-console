import { BusinessKPI, BusinessMetrics } from '../types/analytics';

interface KPICalculation {
  id: string;
  name: string;
  description: string;
  formula: string;
  category: 'revenue' | 'productivity' | 'quality' | 'efficiency' | 'custom' | 'growth';
  unit: string;
  target: number;
  calculate: (data: any) => number;
}

interface BusinessData {
  objects: any[];
  fields: any[];
  relations: any[];
  users: any[];
  activities: any[];
  systemMetrics: any;
}

class BusinessMetricsService {
  private customKPIs: BusinessKPI[] = [];
  private kpiCalculations: Map<string, KPICalculation> = new Map();

  constructor() {
    this.initializeDefaultKPIs();
  }

  // Initialize default KPI calculations
  private initializeDefaultKPIs(): void {
    const defaultCalculations: KPICalculation[] = [
      {
        id: 'objects_per_user',
        name: 'Objects Created Per User',
        description: 'Average number of objects created by each user',
        formula: 'total_objects / active_users',
        category: 'productivity',
        unit: 'objects',
        target: 10,
        calculate: (data: BusinessData) => {
          const activeUsers = data.users.filter(user => user.isActive).length;
          return activeUsers > 0 ? data.objects.length / activeUsers : 0;
        }
      },
      {
        id: 'fields_per_object',
        name: 'Fields Per Object',
        description: 'Average number of fields per object',
        formula: 'total_fields / total_objects',
        category: 'quality',
        unit: 'fields',
        target: 8,
        calculate: (data: BusinessData) => {
          return data.objects.length > 0 ? data.fields.length / data.objects.length : 0;
        }
      },
      {
        id: 'api_efficiency',
        name: 'API Response Efficiency',
        description: 'Percentage of API calls responding within acceptable time',
        formula: 'fast_api_calls / total_api_calls * 100',
        category: 'efficiency',
        unit: '%',
        target: 95,
        calculate: (data: BusinessData) => {
          const totalCalls = data.systemMetrics?.totalAPICalls || 0;
          const fastCalls = data.systemMetrics?.fastAPICalls || 0;
          return totalCalls > 0 ? (fastCalls / totalCalls) * 100 : 0;
        }
      },
      {
        id: 'user_adoption_rate',
        name: 'User Adoption Rate',
        description: 'Percentage of active users who have created objects',
        formula: 'users_with_objects / total_active_users * 100',
        category: 'productivity',
        unit: '%',
        target: 80,
        calculate: (data: BusinessData) => {
          const activeUsers = data.users.filter(user => user.isActive).length;
          const usersWithObjects = new Set(
            data.objects.map(obj => obj.createdBy)
          ).size;
          return activeUsers > 0 ? (usersWithObjects / activeUsers) * 100 : 0;
        }
      },
      {
        id: 'data_growth_rate',
        name: 'Data Growth Rate',
        description: 'Monthly growth rate of objects and fields',
        formula: '((current_month_entities - previous_month_entities) / previous_month_entities) * 100',
        category: 'growth',
        unit: '%',
        target: 15,
        calculate: (_data: BusinessData) => {
          // Mock calculation - in real implementation would compare with historical data
          return Math.random() * 20; // Mock 0-20% growth
        }
      },
      {
        id: 'system_utilization',
        name: 'System Utilization',
        description: 'Overall system resource utilization',
        formula: 'avg_cpu_usage * avg_memory_usage / 100',
        category: 'efficiency',
        unit: '%',
        target: 70,
        calculate: (data: BusinessData) => {
          const cpu = data.systemMetrics?.avgCPU || 0;
          const memory = data.systemMetrics?.avgMemory || 0;
          return (cpu * memory) / 100;
        }
      }
    ];

    defaultCalculations.forEach(calc => {
      this.kpiCalculations.set(calc.id, calc);
    });
  }

  // Calculate business metrics
  calculateBusinessMetrics(data: BusinessData): BusinessMetrics {
    const totalObjects = data.objects.length;
    const totalFields = data.fields.length;
    const totalRelations = data.relations.length;
    const activeUsers = data.users.filter(user => user.isActive).length;

    // Calculate user productivity metrics
    const userProductivity = {
      objectsCreatedPerUser: activeUsers > 0 ? totalObjects / activeUsers : 0,
      fieldsAddedPerUser: activeUsers > 0 ? totalFields / activeUsers : 0,
      avgTimeToObjectCreation: this.calculateAvgTimeToCreation(data.objects)
    };

    // Calculate system utilization
    const systemUtilization = {
      storageUsed: this.calculateStorageUsage(data),
      apiCallsPerDay: data.systemMetrics?.apiCallsPerDay || 0,
      concurrentUsers: data.systemMetrics?.concurrentUsers || 0
    };

    // Calculate custom KPIs
    const customKPIs = this.calculateCustomKPIs(data);

    return {
      totalObjects,
      totalFields,
      totalRelations,
      userProductivity,
      systemUtilization,
      customKPIs
    };
  }

  // Calculate custom KPIs
  private calculateCustomKPIs(data: BusinessData): BusinessKPI[] {
    const kpis: BusinessKPI[] = [];

    this.kpiCalculations.forEach((calc, id) => {
      const value = calc.calculate(data);
      const previousValue = this.getPreviousKPIValue(id); // Mock implementation
      
      const kpi: BusinessKPI = {
        id,
        name: calc.name,
        description: calc.description,
        value: Math.round(value * 100) / 100,
        unit: calc.unit,
        target: calc.target,
        trend: this.calculateTrend(value, previousValue),
        changePercentage: this.calculateChangePercentage(value, previousValue),
        category: calc.category,
        lastUpdated: new Date(),
        calculation: calc.formula
      };

      kpis.push(kpi);
    });

    return kpis.sort((a, b) => {
      // Sort by category first, then by name
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
  }

  // Add custom KPI
  addCustomKPI(kpi: KPICalculation): void {
    this.kpiCalculations.set(kpi.id, kpi);
  }

  // Remove KPI
  removeKPI(kpiId: string): void {
    this.kpiCalculations.delete(kpiId);
  }

  // Get all KPI calculations
  getKPICalculations(): KPICalculation[] {
    return Array.from(this.kpiCalculations.values());
  }

  // Get KPI by category
  getKPIsByCategory(category: BusinessKPI['category']): BusinessKPI[] {
    return this.customKPIs.filter(kpi => kpi.category === category);
  }

  // Get KPI performance summary
  getKPIPerformanceSummary(): {
    total: number;
    onTarget: number;
    aboveTarget: number;
    belowTarget: number;
    critical: number;
    categories: Record<string, {
      total: number;
      onTarget: number;
      avgPerformance: number;
    }>;
  } {
    const summary = {
      total: this.customKPIs.length,
      onTarget: 0,
      aboveTarget: 0,
      belowTarget: 0,
      critical: 0,
      categories: {} as Record<string, {
        total: number;
        onTarget: number;
        avgPerformance: number;
      }>
    };

    this.customKPIs.forEach(kpi => {
      const performance = (kpi.value / kpi.target) * 100;
      
      if (performance >= 95) {
        summary.onTarget++;
      } else if (performance >= 80) {
        summary.aboveTarget++;
      } else if (performance >= 60) {
        summary.belowTarget++;
      } else {
        summary.critical++;
      }

      // Category summary
      if (!summary.categories[kpi.category]) {
        summary.categories[kpi.category] = {
          total: 0,
          onTarget: 0,
          avgPerformance: 0
        };
      }
      
      const catSummary = summary.categories[kpi.category];
      catSummary.total++;
      catSummary.avgPerformance = (catSummary.avgPerformance + performance) / 2;
      
      if (performance >= 95) {
        catSummary.onTarget++;
      }
    });

    return summary;
  }

  // Get trending KPIs
  getTrendingKPIs(): {
    improving: BusinessKPI[];
    declining: BusinessKPI[];
    stable: BusinessKPI[];
  } {
    const improving = this.customKPIs.filter(kpi => kpi.trend === 'up');
    const declining = this.customKPIs.filter(kpi => kpi.trend === 'down');
    const stable = this.customKPIs.filter(kpi => kpi.trend === 'stable');

    return { improving, declining, stable };
  }

  // Get KPI recommendations
  getKPIRecommendations(): Array<{
    kpi: BusinessKPI;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const recommendations: Array<{
      kpi: BusinessKPI;
      recommendation: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    this.customKPIs.forEach(kpi => {
      const performance = (kpi.value / kpi.target) * 100;
      
      if (performance < 60) {
        recommendations.push({
          kpi,
          recommendation: `Critical: ${kpi.name} is at ${performance.toFixed(1)}% of target. Immediate action required.`,
          priority: 'high'
        });
      } else if (performance < 80) {
        recommendations.push({
          kpi,
          recommendation: `${kpi.name} is below target at ${performance.toFixed(1)}}. Consider improvement initiatives.`,
          priority: 'medium'
        });
      } else if (kpi.trend === 'down' && performance < 95) {
        recommendations.push({
          kpi,
          recommendation: `${kpi.name} is declining. Monitor closely and plan corrective actions.`,
          priority: 'low'
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Private helper methods
  private calculateAvgTimeToCreation(objects: any[]): number {
    if (objects.length === 0) return 0;
    
    const times = objects
      .filter(obj => obj.createdAt && obj.firstEditAt)
      .map(obj => {
        const created = new Date(obj.createdAt).getTime();
        const firstEdit = new Date(obj.firstEditAt).getTime();
        return (firstEdit - created) / (1000 * 60); // minutes
      })
      .filter(time => time >= 0 && time <= 60); // Filter reasonable times
    
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  private calculateStorageUsage(data: BusinessData): number {
    // Mock calculation - in real implementation would calculate actual storage
    const objectSize = data.objects.length * 1024; // 1KB per object
    const fieldSize = data.fields.length * 512; // 512B per field
    const relationSize = data.relations.length * 256; // 256B per relation
    
    return (objectSize + fieldSize + relationSize) / (1024 * 1024); // MB
  }

  private getPreviousKPIValue(_kpiId: string): number {
    // Mock implementation - in real implementation would fetch from database
    return Math.random() * 100;
  }

  private calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    const change = ((current - previous) / previous) * 100;
    
    if (Math.abs(change) < 2) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  private calculateChangePercentage(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  }

  // Generate business insights
  generateBusinessInsights(metrics: BusinessMetrics): Array<{
    type: 'opportunity' | 'risk' | 'trend' | 'achievement';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
  }> {
    const insights: Array<{
      type: 'opportunity' | 'risk' | 'trend' | 'achievement';
      title: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      actionable: boolean;
    }> = [];

    // Analyze user productivity
    if (metrics.userProductivity.objectsCreatedPerUser < 5) {
      insights.push({
        type: 'risk',
        title: 'Low User Productivity',
        description: `Users are creating only ${metrics.userProductivity.objectsCreatedPerUser.toFixed(1)} objects on average. Consider user training or workflow improvements.`,
        impact: 'high',
        actionable: true
      });
    }

    // Analyze system utilization
    if (metrics.systemUtilization.storageUsed > 1000) { // > 1GB
      insights.push({
        type: 'trend',
        title: 'High Storage Usage',
        description: `System is using ${metrics.systemUtilization.storageUsed.toFixed(1)} MB of storage. Monitor growth and consider cleanup policies.`,
        impact: 'medium',
        actionable: true
      });
    }

    // Analyze KPI performance
    const criticalKPIs = metrics.customKPIs.filter(kpi => (kpi.value / kpi.target) < 0.6);
    if (criticalKPIs.length > 0) {
      insights.push({
        type: 'risk',
        title: 'Critical KPI Performance',
        description: `${criticalKPIs.length} KPIs are performing below 60% of target. Immediate attention required.`,
        impact: 'high',
        actionable: true
      });
    }

    // Check for achievements
    const achievingKPIs = metrics.customKPIs.filter(kpi => (kpi.value / kpi.target) >= 1);
    if (achievingKPIs.length > 0) {
      insights.push({
        type: 'achievement',
        title: 'KPI Targets Met',
        description: `${achievingKPIs.length} KPIs are meeting or exceeding targets. Great performance!`,
        impact: 'medium',
        actionable: false
      });
    }

    return insights;
  }
}

export const businessMetricsService = new BusinessMetricsService();
export default BusinessMetricsService;
