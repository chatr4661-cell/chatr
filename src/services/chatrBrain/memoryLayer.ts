/**
 * MEMORY LAYER - Unified Memory System for All Agents
 * Shared, agent-specific, global context, user preferences, task memory
 */

import { AgentType, ActionType } from './types';

// ============ Memory Types ============

interface MemoryEntry {
  id: string;
  type: 'fact' | 'preference' | 'interaction' | 'task' | 'entity' | 'context';
  content: string;
  metadata: Record<string, unknown>;
  agent?: AgentType;
  importance: number;  // 0-1
  accessCount: number;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt?: Date;
}

interface UserPreference {
  key: string;
  value: unknown;
  source: 'explicit' | 'inferred';
  confidence: number;
  lastUpdated: Date;
}

interface TaskMemory {
  id: string;
  action: ActionType;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  context: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  result?: unknown;
}

interface ConversationContext {
  sessionId: string;
  startedAt: Date;
  lastActivity: Date;
  turns: {
    query: string;
    response: string;
    agent: AgentType;
    timestamp: Date;
  }[];
  currentTopic?: string;
  entities: Record<string, string>;
}

// ============ Memory Storage Keys ============
const STORAGE_KEYS = {
  SHARED: 'chatr_memory_shared',
  AGENT: 'chatr_memory_agent_',
  USER: 'chatr_memory_user_',
  TASKS: 'chatr_memory_tasks',
  CONVERSATION: 'chatr_memory_conversation',
};

/**
 * Memory Layer Service
 */
class MemoryLayerService {
  private userId: string | null = null;
  private sharedMemory: MemoryEntry[] = [];
  private agentMemory: Map<AgentType, MemoryEntry[]> = new Map();
  private userPreferences: UserPreference[] = [];
  private taskMemory: TaskMemory[] = [];
  private conversationContext: ConversationContext | null = null;
  public isInitialized = false;

  getCurrentUserId(): string | null {
    return this.userId;
  }

  getRecentQueries(): string[] {
    return this.conversationContext?.turns.slice(-5).map(t => t.query) || [];
  }

  getLastAgent(): AgentType | undefined {
    const turns = this.conversationContext?.turns;
    return turns && turns.length > 0 ? turns[turns.length - 1].agent : undefined;
  }

  /**
   * Initialize memory for a user
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    
    // Load from storage
    await this.loadFromStorage();
    
    // Initialize agent memory maps
    const agents: AgentType[] = ['personal', 'work', 'search', 'local', 'jobs', 'health'];
    agents.forEach(agent => {
      if (!this.agentMemory.has(agent)) {
        this.agentMemory.set(agent, []);
      }
    });

    this.isInitialized = true;
    console.log('🧠 [MemoryLayer] Initialized for user:', userId);
  }

  // ============ Shared Memory ============

  /**
   * Store a fact in shared memory
   */
  remember(content: string, metadata: Record<string, unknown> = {}, importance = 0.5): string {
    const entry: MemoryEntry = {
      id: this.generateId(),
      type: 'fact',
      content,
      metadata,
      importance,
      accessCount: 0,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    };

    this.sharedMemory.push(entry);
    this.pruneMemory(this.sharedMemory);
    this.saveToStorage();

    return entry.id;
  }

  /**
   * Recall from shared memory by search
   */
  recall(query: string, limit = 5): MemoryEntry[] {
    const queryLower = query.toLowerCase();
    
    const results = this.sharedMemory
      .filter(m => m.content.toLowerCase().includes(queryLower))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);

    // Update access counts
    results.forEach(r => {
      r.accessCount++;
      r.lastAccessedAt = new Date();
    });

    return results;
  }

  /**
   * Get recent memories
   */
  getRecentMemories(limit = 10): MemoryEntry[] {
    return [...this.sharedMemory]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // ============ Agent-Specific Memory ============

  /**
   * Store memory for a specific agent
   */
  agentRemember(agent: AgentType, content: string, metadata: Record<string, unknown> = {}): string {
    const entry: MemoryEntry = {
      id: this.generateId(),
      type: 'fact',
      content,
      metadata,
      agent,
      importance: 0.5,
      accessCount: 0,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    };

    const memories = this.agentMemory.get(agent) || [];
    memories.push(entry);
    this.agentMemory.set(agent, memories);
    this.pruneMemory(memories);
    this.saveToStorage();

    return entry.id;
  }

  /**
   * Recall agent-specific memories
   */
  agentRecall(agent: AgentType, query: string, limit = 5): MemoryEntry[] {
    const memories = this.agentMemory.get(agent) || [];
    const queryLower = query.toLowerCase();

    return memories
      .filter(m => m.content.toLowerCase().includes(queryLower))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  /**
   * Get agent context summary
   */
  getAgentContext(agent: AgentType): string {
    const memories = this.agentMemory.get(agent) || [];
    const recent = memories
      .sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime())
      .slice(0, 5);

    if (recent.length === 0) return '';

    return recent.map(m => m.content).join('\n');
  }

  // ============ User Preferences ============

  /**
   * Set a user preference
   */
  setPreference(key: string, value: unknown, source: 'explicit' | 'inferred' = 'explicit'): void {
    const existing = this.userPreferences.find(p => p.key === key);
    
    if (existing) {
      existing.value = value;
      existing.source = source;
      existing.confidence = source === 'explicit' ? 1.0 : 0.7;
      existing.lastUpdated = new Date();
    } else {
      this.userPreferences.push({
        key,
        value,
        source,
        confidence: source === 'explicit' ? 1.0 : 0.7,
        lastUpdated: new Date(),
      });
    }

    this.saveToStorage();
  }

  /**
   * Get a user preference
   */
  getPreference<T>(key: string): T | undefined {
    const pref = this.userPreferences.find(p => p.key === key);
    return pref?.value as T;
  }

  /**
   * Get all preferences
   */
  getAllPreferences(): UserPreference[] {
    return [...this.userPreferences];
  }

  /**
   * Infer preference from behavior
   */
  inferPreference(key: string, value: unknown): void {
    const existing = this.userPreferences.find(p => p.key === key);
    
    // Only infer if not explicitly set
    if (!existing || existing.source === 'inferred') {
      this.setPreference(key, value, 'inferred');
    }
  }

  // ============ Task Memory ============

  /**
   * Start tracking a task
   */
  startTask(action: ActionType, context: Record<string, unknown> = {}): string {
    const task: TaskMemory = {
      id: this.generateId(),
      action,
      status: 'pending',
      context,
      startedAt: new Date(),
    };

    this.taskMemory.push(task);
    this.saveToStorage();

    return task.id;
  }

  /**
   * Update task status
   */
  updateTask(taskId: string, status: TaskMemory['status'], result?: unknown): void {
    const task = this.taskMemory.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      if (status === 'completed' || status === 'failed') {
        task.completedAt = new Date();
      }
      if (result) {
        task.result = result;
      }
      this.saveToStorage();
    }
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): TaskMemory[] {
    return this.taskMemory.filter(t => t.status === 'pending' || t.status === 'in_progress');
  }

  /**
   * Get task history
   */
  getTaskHistory(limit = 10): TaskMemory[] {
    return [...this.taskMemory]
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  // ============ Conversation Context ============

  /**
   * Start or get conversation context
   */
  getOrCreateConversation(): ConversationContext {
    if (!this.conversationContext || this.isConversationExpired()) {
      this.conversationContext = {
        sessionId: this.generateId(),
        startedAt: new Date(),
        lastActivity: new Date(),
        turns: [],
        entities: {},
      };
    }

    this.conversationContext.lastActivity = new Date();
    return this.conversationContext;
  }

  /**
   * Add a conversation turn
   */
  addConversationTurn(query: string, response: string, agent: AgentType): void {
    const conversation = this.getOrCreateConversation();
    
    conversation.turns.push({
      query,
      response,
      agent,
      timestamp: new Date(),
    });

    // Extract entities
    this.extractEntities(query);

    // Keep only last 20 turns
    if (conversation.turns.length > 20) {
      conversation.turns.shift();
    }

    this.saveToStorage();
  }

  /**
   * Get conversation summary
   */
  getConversationSummary(): string {
    if (!this.conversationContext) return '';

    const recentTurns = this.conversationContext.turns.slice(-5);
    return recentTurns
      .map(t => `User: ${t.query}\nAssistant: ${t.response}`)
      .join('\n\n');
  }

  /**
   * Get current topic
   */
  getCurrentTopic(): string | undefined {
    return this.conversationContext?.currentTopic;
  }

  /**
   * Set current topic
   */
  setCurrentTopic(topic: string): void {
    const conversation = this.getOrCreateConversation();
    conversation.currentTopic = topic;
  }

  /**
   * Get extracted entities
   */
  getEntities(): Record<string, string> {
    return this.conversationContext?.entities || {};
  }

  // ============ Cross-Agent Memory ============

  /**
   * Get global context for all agents
   */
  getGlobalContext(): string {
    const parts: string[] = [];

    // Recent shared memories
    const recentMemories = this.getRecentMemories(3);
    if (recentMemories.length > 0) {
      parts.push('Recent context: ' + recentMemories.map(m => m.content).join('; '));
    }

    // Key preferences
    const prefs = this.getAllPreferences().slice(0, 3);
    if (prefs.length > 0) {
      parts.push('User preferences: ' + prefs.map(p => `${p.key}=${p.value}`).join(', '));
    }

    // Pending tasks
    const tasks = this.getPendingTasks();
    if (tasks.length > 0) {
      parts.push('Pending tasks: ' + tasks.map(t => t.action).join(', '));
    }

    // Conversation topic
    const topic = this.getCurrentTopic();
    if (topic) {
      parts.push('Current topic: ' + topic);
    }

    return parts.join('\n');
  }

  /**
   * Share memory between agents
   */
  shareToAgent(fromAgent: AgentType, toAgent: AgentType, memoryId: string): void {
    const fromMemories = this.agentMemory.get(fromAgent) || [];
    const memory = fromMemories.find(m => m.id === memoryId);
    
    if (memory) {
      const sharedMemory = { ...memory, id: this.generateId(), agent: toAgent };
      const toMemories = this.agentMemory.get(toAgent) || [];
      toMemories.push(sharedMemory);
      this.agentMemory.set(toAgent, toMemories);
      this.saveToStorage();
    }
  }

  // ============ Storage ============

  private async loadFromStorage(): Promise<void> {
    try {
      // Load shared memory
      const sharedData = localStorage.getItem(STORAGE_KEYS.SHARED);
      if (sharedData) {
        this.sharedMemory = JSON.parse(sharedData);
      }

      // Load user preferences
      const userData = localStorage.getItem(STORAGE_KEYS.USER + this.userId);
      if (userData) {
        this.userPreferences = JSON.parse(userData);
      }

      // Load tasks
      const taskData = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (taskData) {
        this.taskMemory = JSON.parse(taskData);
      }

      // Load agent memories
      const agents: AgentType[] = ['personal', 'work', 'search', 'local', 'jobs', 'health'];
      for (const agent of agents) {
        const agentData = localStorage.getItem(STORAGE_KEYS.AGENT + agent);
        if (agentData) {
          this.agentMemory.set(agent, JSON.parse(agentData));
        }
      }
    } catch (error) {
      console.error('[MemoryLayer] Error loading from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SHARED, JSON.stringify(this.sharedMemory));
      localStorage.setItem(STORAGE_KEYS.USER + this.userId, JSON.stringify(this.userPreferences));
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(this.taskMemory));

      this.agentMemory.forEach((memories, agent) => {
        localStorage.setItem(STORAGE_KEYS.AGENT + agent, JSON.stringify(memories));
      });
    } catch (error) {
      console.error('[MemoryLayer] Error saving to storage:', error);
    }
  }

  // ============ Utilities ============

  private extractEntities(query: string): void {
    if (!this.conversationContext) return;

    // Simple entity extraction
    const dateMatch = query.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/);
    if (dateMatch) {
      this.conversationContext.entities.lastDate = dateMatch[1];
    }

    const timeMatch = query.match(/\b(\d{1,2}:\d{2}\s?(am|pm)?)\b/i);
    if (timeMatch) {
      this.conversationContext.entities.lastTime = timeMatch[1];
    }

    const locationMatch = query.match(/\bnear\s+(.+?)(?:\.|,|?|$)/i);
    if (locationMatch) {
      this.conversationContext.entities.lastLocation = locationMatch[1].trim();
    }
  }

  private isConversationExpired(): boolean {
    if (!this.conversationContext) return true;
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.conversationContext.lastActivity < hourAgo;
  }

  private pruneMemory(memories: MemoryEntry[], maxSize = 100): void {
    if (memories.length > maxSize) {
      // Remove lowest importance, oldest memories
      memories.sort((a, b) => {
        const scoreA = a.importance * 0.7 + (a.accessCount / 10) * 0.3;
        const scoreB = b.importance * 0.7 + (b.accessCount / 10) * 0.3;
        return scoreB - scoreA;
      });
      memories.splice(maxSize);
    }
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all memory (for testing/reset)
   */
  clear(): void {
    this.sharedMemory = [];
    this.agentMemory.clear();
    this.userPreferences = [];
    this.taskMemory = [];
    this.conversationContext = null;
    
    Object.values(STORAGE_KEYS).forEach(key => {
      if (typeof key === 'string' && !key.endsWith('_')) {
        localStorage.removeItem(key);
      }
    });
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const memoryLayer = new MemoryLayerService();
export type { MemoryEntry, UserPreference, TaskMemory, ConversationContext };
