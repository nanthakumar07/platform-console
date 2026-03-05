import { DataSource } from 'typeorm';
import { Trigger, ConditionOperator, LogicalOperator } from '../entities/Trigger';

export class TriggerEvaluator {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  async evaluate(triggers: Trigger[], eventData: any): Promise<boolean> {
    if (!triggers || triggers.length === 0) {
      return false;
    }

    // Evaluate all triggers - if any trigger conditions are met, return true
    for (const trigger of triggers) {
      if (!trigger.isActive) {
        continue;
      }

      const result = await this.evaluateTriggerConditions(trigger.conditions, eventData);
      if (result) {
        return true;
      }
    }

    return false;
  }

  private async evaluateTriggerConditions(
    conditions: any[],
    eventData: any
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    let result = true;
    let currentLogicalOperator = LogicalOperator.AND;

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateCondition(condition, eventData);

      if (i === 0) {
        result = conditionResult;
      } else {
        if (currentLogicalOperator === LogicalOperator.AND) {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
      }

      // Set logical operator for next iteration
      currentLogicalOperator = condition.logicalOperator || LogicalOperator.AND;
    }

    return result;
  }

  private evaluateCondition(condition: any, eventData: any): boolean {
    const { field, operator, value } = condition;
    const fieldValue = this.getNestedValue(eventData, field);

    switch (operator) {
      case ConditionOperator.EQUALS:
        return fieldValue === value;

      case ConditionOperator.NOT_EQUALS:
        return fieldValue !== value;

      case ConditionOperator.GREATER_THAN:
        return Number(fieldValue) > Number(value);

      case ConditionOperator.LESS_THAN:
        return Number(fieldValue) < Number(value);

      case ConditionOperator.GREATER_THAN_OR_EQUAL:
        return Number(fieldValue) >= Number(value);

      case ConditionOperator.LESS_THAN_OR_EQUAL:
        return Number(fieldValue) <= Number(value);

      case ConditionOperator.CONTAINS:
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(value);
        }
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());

      case ConditionOperator.NOT_CONTAINS:
        if (Array.isArray(fieldValue)) {
          return !fieldValue.includes(value);
        }
        return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());

      case ConditionOperator.STARTS_WITH:
        return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());

      case ConditionOperator.ENDS_WITH:
        return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase());

      case ConditionOperator.IN:
        if (Array.isArray(value)) {
          return value.includes(fieldValue);
        }
        return false;

      case ConditionOperator.NOT_IN:
        if (Array.isArray(value)) {
          return !value.includes(fieldValue);
        }
        return true;

      case ConditionOperator.IS_NULL:
        return fieldValue === null || fieldValue === undefined;

      case ConditionOperator.IS_NOT_NULL:
        return fieldValue !== null && fieldValue !== undefined;

      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  // Advanced evaluation methods for complex scenarios
  async evaluateWithFilters(trigger: Trigger, eventData: any): Promise<boolean> {
    // First check if event passes basic filters
    if (trigger.filters) {
      const passesFilters = this.evaluateFilters(trigger.filters, eventData);
      if (!passesFilters) {
        return false;
      }
    }

    // Then evaluate conditions
    return this.evaluateTriggerConditions(trigger.conditions, eventData);
  }

  private evaluateFilters(filters: Record<string, any>, eventData: any): boolean {
    for (const [filterKey, filterValue] of Object.entries(filters)) {
      const eventValue = this.getNestedValue(eventData, filterKey);
      
      if (Array.isArray(filterValue)) {
        if (!filterValue.includes(eventValue)) {
          return false;
        }
      } else if (typeof filterValue === 'object' && filterValue !== null) {
        // Handle range filters, regex patterns, etc.
        if (!this.evaluateComplexFilter(filterValue, eventValue)) {
          return false;
        }
      } else if (eventValue !== filterValue) {
        return false;
      }
    }

    return true;
  }

  private evaluateComplexFilter(filter: any, value: any): boolean {
    if (filter.min !== undefined && Number(value) < filter.min) {
      return false;
    }
    if (filter.max !== undefined && Number(value) > filter.max) {
      return false;
    }
    if (filter.regex && !new RegExp(filter.regex).test(String(value))) {
      return false;
    }
    if (filter.type && typeof value !== filter.type) {
      return false;
    }

    return true;
  }

  // Batch evaluation for multiple events
  async evaluateBatch(triggers: Trigger[], events: any[]): Promise<boolean[]> {
    const results: boolean[] = [];
    
    for (const event of events) {
      const result = await this.evaluate(triggers, event);
      results.push(result);
    }

    return results;
  }
}
