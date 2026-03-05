import { DataSource } from 'typeorm';
import { Queue, Worker, Job } from 'bullmq';
import { connect, NatsConnection, StringCodec } from 'nats';
import { config as appConfig } from '../config/config';
import { TriggerEvaluator } from './TriggerEvaluator';
import { ActionExecutor } from './ActionExecutor';
import { Workflow, WorkflowExecution, Action } from '../entities';
import { TriggerType, WorkflowStatus } from '../entities/Workflow';
import { ExecutionStatus } from '../entities/WorkflowExecution';

export class WorkflowEngine {
  private dataSource: DataSource;
  private config: typeof appConfig;
  private natsConnection: NatsConnection | null = null;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private triggerEvaluator: TriggerEvaluator;
  private actionExecutor: ActionExecutor;
  private sc = StringCodec();

  constructor(dataSource: DataSource, config: typeof appConfig) {
    this.dataSource = dataSource;
    this.config = config;
    this.triggerEvaluator = new TriggerEvaluator(dataSource);
    this.actionExecutor = new ActionExecutor(dataSource);
  }

  async initialize(): Promise<void> {
    // Initialize NATS connection
    await this.initializeNats();
    
    // Initialize BullMQ queues and workers
    await this.initializeQueues();
    
    // Start scheduled workflows
    await this.startScheduledWorkflows();
    
    console.log('✅ Workflow Engine initialized successfully');
  }

  private async initializeNats(): Promise<void> {
    try {
      this.natsConnection = await connect({
        servers: this.config.nats.url,
        user: this.config.nats.user,
        pass: this.config.nats.password,
      });

      // Subscribe to trigger events
      const subscription = this.natsConnection.subscribe('workflow.trigger.*');
      
      (async () => {
        for await (const message of subscription) {
          try {
            const eventData = JSON.parse(this.sc.decode(message.data));
            await this.handleTriggerEvent(message.subject!, eventData);
          } catch (error) {
            console.error('Error processing trigger event:', error);
          }
        }
      })();

      console.log('✅ NATS connection established');
    } catch (error) {
      console.error('❌ Failed to connect to NATS:', error);
      throw error;
    }
  }

  private async initializeQueues(): Promise<void> {
    // Workflow execution queue
    const workflowQueue = new Queue('workflow-execution', {
      connection: {
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
      },
    });

    // Action execution queue
    const actionQueue = new Queue('action-execution', {
      connection: {
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
      },
    });

    // Scheduled workflow queue
    const scheduledQueue = new Queue('scheduled-workflows', {
      connection: {
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
      },
    });

    this.queues.set('workflow-execution', workflowQueue);
    this.queues.set('action-execution', actionQueue);
    this.queues.set('scheduled-workflows', scheduledQueue);

    // Initialize workers
    await this.initializeWorkers();
  }

  private async initializeWorkers(): Promise<void> {
    // Workflow execution worker
    const workflowWorker = new Worker(
      'workflow-execution',
      async (job: Job) => {
        return await this.executeWorkflow(job.data);
      },
      {
        connection: {
          host: this.config.redis.host,
          port: this.config.redis.port,
          password: this.config.redis.password,
        },
      }
    );

    // Action execution worker
    const actionWorker = new Worker(
      'action-execution',
      async (job: Job) => {
        return await this.executeAction(job.data);
      },
      {
        connection: {
          host: this.config.redis.host,
          port: this.config.redis.port,
          password: this.config.redis.password,
        },
      }
    );

    // Scheduled workflow worker
    const scheduledWorker = new Worker(
      'scheduled-workflows',
      async (job: Job) => {
        return await this.executeScheduledWorkflow(job.data);
      },
      {
        connection: {
          host: this.config.redis.host,
          port: this.config.redis.port,
          password: this.config.redis.password,
        },
      }
    );

    this.workers.set('workflow-execution', workflowWorker);
    this.workers.set('action-execution', actionWorker);
    this.workers.set('scheduled-workflows', scheduledWorker);

    console.log('✅ BullMQ workers initialized');
  }

  private async startScheduledWorkflows(): Promise<void> {
    const workflowRepo = this.dataSource.getRepository(Workflow);
    const scheduledWorkflows = await workflowRepo.find({
      where: { status: WorkflowStatus.ACTIVE, triggerType: TriggerType.SCHEDULED },
    });

    for (const workflow of scheduledWorkflows) {
      if (workflow.schedule) {
        await this.scheduleWorkflow(workflow);
      }
    }
  }

  private async handleTriggerEvent(subject: string, eventData: any): Promise<void> {
    const triggerType = subject.replace('workflow.trigger.', '');
    
    // Find workflows that match this trigger
    const workflowRepo = this.dataSource.getRepository(Workflow);
    const workflows = await workflowRepo.find({
      where: { 
        status: WorkflowStatus.ACTIVE, 
        triggerType: triggerType.toUpperCase() as TriggerType 
      },
      relations: ['triggers', 'actions'],
    });

    for (const workflow of workflows) {
      // Evaluate trigger conditions
      const shouldExecute = await this.triggerEvaluator.evaluate(
        workflow.triggers,
        eventData
      );

      if (shouldExecute) {
        // Queue workflow execution
        await this.queues.get('workflow-execution')?.add(
          `execute-workflow-${workflow.id}`,
          {
            workflowId: workflow.id,
            triggerData: eventData,
            timestamp: new Date().toISOString(),
          }
        );
      }
    }
  }

  private async executeWorkflow(data: any): Promise<any> {
    const { workflowId, triggerData } = data;
    
    const workflowRepo = this.dataSource.getRepository(Workflow);
    const workflow = await workflowRepo.findOne({
      where: { id: workflowId },
      relations: ['actions'],
    });

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Create workflow execution record
    const executionRepo = this.dataSource.getRepository(WorkflowExecution);
    const execution = executionRepo.create({
      workflowId: workflow.id,
      status: ExecutionStatus.RUNNING,
      triggerData,
      tenantId: workflow.tenantId,
      context: {
        triggerData,
      },
      startedAt: new Date(),
    });
    
    await executionRepo.save(execution);

    try {
      // Execute actions in sequence
      const results = [];
      for (const action of workflow.actions) {
        const actionResult: any = await this.queues.get('action-execution')?.add(
          `execute-action-${action.id}`,
          {
            actionId: action.id,
            executionId: execution.id,
            context: {
              triggerData,
              previousResults: results,
            },
          }
        );
        
        results.push(actionResult);
      }

      // Update execution status
      execution.status = ExecutionStatus.COMPLETED;
      execution.completedAt = new Date();
      execution.result = { actions: results };
      await executionRepo.save(execution);

      return { success: true, executionId: execution.id };
    } catch (error) {
      // Update execution status with error
      execution.status = ExecutionStatus.FAILED;
      execution.completedAt = new Date();
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      await executionRepo.save(execution);

      throw error;
    }
  }

  private async executeAction(data: any): Promise<any> {
    const { actionId, executionId, context } = data;
    
    const actionRepo = this.dataSource.getRepository(Action);
    const action = await actionRepo.findOne({ where: { id: actionId } });

    if (!action) {
      throw new Error(`Action ${actionId} not found`);
    }

    return await this.actionExecutor.execute(action, context);
  }

  private async executeScheduledWorkflow(data: any): Promise<any> {
    const { workflowId } = data;
    
    // Trigger the workflow as if it was triggered by a system event
    await this.handleTriggerEvent('workflow.trigger.SCHEDULED', {
      workflowId,
      timestamp: new Date().toISOString(),
    });
  }

  private async scheduleWorkflow(workflow: Workflow): Promise<void> {
    const cron = require('node-cron');
    
    if (workflow.schedule) {
      cron.schedule(workflow.schedule, async () => {
        await this.queues.get('scheduled-workflows')?.add(
          `scheduled-${workflow.id}`,
          { workflowId: workflow.id }
        );
      });
    }
  }

  async shutdown(): Promise<void> {
    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      console.log(`🔒 Worker ${name} closed`);
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      console.log(`🔒 Queue ${name} closed`);
    }

    // Close NATS connection
    if (this.natsConnection) {
      await this.natsConnection.drain();
      await this.natsConnection.close();
      console.log('🔒 NATS connection closed');
    }

    console.log('✅ Workflow Engine shutdown complete');
  }
}
