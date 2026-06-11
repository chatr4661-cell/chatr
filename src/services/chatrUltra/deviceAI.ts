/**
 * CHATR ULTRA - Device AI Interface
 * Routes on-device AI access across platforms with a real cloud fallback.
 *
 * Priority:
 *   1. Native Android AICore / Gemini Nano (via OnDeviceAi Capacitor plugin) — zero cost
 *   2. Cloud fallback via the `ai-smart-reply` edge function (Lovable AI Gateway)
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export type DeviceAIModel =
  | 'apple-intelligence'
  | 'gemini-nano'
  | 'samsung-gauss'
  | 'qualcomm-npu'
  | 'cloud-gateway'
  | 'web-transformer'
  | 'local-llm';

export interface DeviceAICapabilities {
  modelName: string;
  modelType: DeviceAIModel;
  available: boolean;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsMultimodal: boolean;
  latencyMs: number;
}

export interface DeviceAIResponse {
  text: string;
  modelUsed: DeviceAIModel;
  latencyMs: number;
  confidence: number;
  sources?: string[];
}

export interface MultiModelResponse {
  finalAnswer: string;
  modelResponses: DeviceAIResponse[];
  consensusScore: number;
  mostAccurate: DeviceAIModel;
}

interface OnDeviceAiPluginShape {
  checkAvailability(): Promise<{ available: boolean; status: string }>;
  generate(options: { system?: string; prompt: string }): Promise<{ text: string }>;
}

const OnDeviceAi =
  Capacitor.getPlatform() === 'android'
    ? registerPlugin<OnDeviceAiPluginShape>('OnDeviceAi')
    : null;

/**
 * Device AI Service - manages on-device AI models with cloud fallback
 */
class DeviceAIService {
  private availableModels: DeviceAICapabilities[] = [];
  private initialized = false;
  private nativeAvailable = false;

  /**
   * Detect and initialize available on-device AI models
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🧠 [CHATR ULTRA] Initializing device AI models...');
    this.availableModels = [];

    // Detect native on-device AI (Android Gemini Nano / AICore)
    this.nativeAvailable = await this.checkNativeAvailability();
    if (this.nativeAvailable) {
      this.availableModels.push({
        modelName: 'Google Gemini Nano (On-Device)',
        modelType: 'gemini-nano',
        available: true,
        maxTokens: 2048,
        supportsStreaming: true,
        supportsMultimodal: false,
        latencyMs: 80,
      });
    }

    // Cloud gateway (always available — real inference via edge function)
    this.availableModels.push({
      modelName: 'Cloud AI Gateway',
      modelType: 'cloud-gateway',
      available: true,
      maxTokens: 4096,
      supportsStreaming: false,
      supportsMultimodal: false,
      latencyMs: 600,
    });

    this.initialized = true;
    console.log(`✅ [CHATR ULTRA] ${this.availableModels.length} AI models ready (native=${this.nativeAvailable})`);
  }

  /**
   * Get all available device AI models
   */
  getAvailableModels(): DeviceAICapabilities[] {
    return this.availableModels;
  }

  /**
   * Run inference on the best available model (native first, cloud fallback)
   */
  async runInference(
    prompt: string,
    modelType?: DeviceAIModel,
    options?: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<DeviceAIResponse> {
    const startTime = performance.now();

    // Prefer native unless a specific cloud model was requested
    const wantsCloud = modelType === 'cloud-gateway';
    if (!wantsCloud && this.nativeAvailable && OnDeviceAi) {
      try {
        const r = await OnDeviceAi.generate({ system: options?.systemPrompt, prompt });
        if (r.text?.trim()) {
          return {
            text: r.text.trim(),
            modelUsed: 'gemini-nano',
            latencyMs: performance.now() - startTime,
            confidence: 0.9,
          };
        }
      } catch (e) {
        console.warn('[CHATR ULTRA] native inference failed, using cloud', e);
      }
    }

    // Cloud fallback — real inference
    const text = await this.runCloudGateway(prompt, options);
    return {
      text,
      modelUsed: 'cloud-gateway',
      latencyMs: performance.now() - startTime,
      confidence: 0.85,
    };
  }

  /**
   * Run on native + cloud and pick the best for maximum accuracy
   */
  async runMultiModel(
    prompt: string,
    options?: {
      minModels?: number;
      consensusThreshold?: number;
      systemPrompt?: string;
    }
  ): Promise<MultiModelResponse> {
    const tasks: Promise<DeviceAIResponse>[] = [this.runInference(prompt, 'cloud-gateway', options)];
    if (this.nativeAvailable) {
      tasks.push(this.runInference(prompt, 'gemini-nano', options));
    }

    const settled = await Promise.allSettled(tasks);
    const responses = settled
      .filter((r): r is PromiseFulfilledResult<DeviceAIResponse> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((r) => r.text);

    if (responses.length === 0) {
      throw new Error('No AI models produced a response');
    }

    const finalAnswer = this.selectBestResponse(responses);
    const consensusScore = this.calculateConsensus(responses);
    const mostAccurate = responses.reduce((best, curr) =>
      curr.confidence > best.confidence ? curr : best
    ).modelUsed;

    return { finalAnswer, modelResponses: responses, consensusScore, mostAccurate };
  }

  /** Check whether the native on-device AI plugin reports availability */
  private async checkNativeAvailability(): Promise<boolean> {
    if (!OnDeviceAi) return false;
    try {
      const r = await OnDeviceAi.checkAvailability();
      return !!r.available;
    } catch {
      return false;
    }
  }

  /**
   * Cloud inference via the ai-smart-reply edge function (Lovable AI Gateway)
   */
  private async runCloudGateway(
    prompt: string,
    options?: { systemPrompt?: string }
  ): Promise<string> {
    try {
      const message = options?.systemPrompt
        ? `${options.systemPrompt}\n\n${prompt}`
        : prompt;
      const { data, error } = await supabase.functions.invoke('ai-smart-reply', {
        body: { message, context: [], type: 'chat' },
      });
      if (error) throw error;
      return (data?.reply || data?.response || '').trim();
    } catch (e) {
      console.error('[CHATR ULTRA] cloud inference failed', e);
      throw new Error('AI inference unavailable. Please check your connection and try again.');
    }
  }

  /**
   * Select best response from multiple models (highest confidence)
   */
  private selectBestResponse(responses: DeviceAIResponse[]): string {
    if (responses.length === 0) return '';
    if (responses.length === 1) return responses[0].text;
    return responses.reduce((best, curr) =>
      curr.confidence > best.confidence ? curr : best
    ).text;
  }

  /**
   * Calculate consensus score across models via token overlap (Jaccard similarity)
   */
  private calculateConsensus(responses: DeviceAIResponse[]): number {
    if (responses.length <= 1) return 1.0;
    const tokenSets = responses.map(
      (r) => new Set(r.text.toLowerCase().split(/\s+/).filter(Boolean))
    );
    let total = 0;
    let pairs = 0;
    for (let i = 0; i < tokenSets.length; i++) {
      for (let j = i + 1; j < tokenSets.length; j++) {
        const a = tokenSets[i];
        const b = tokenSets[j];
        const intersection = [...a].filter((t) => b.has(t)).length;
        const union = new Set([...a, ...b]).size || 1;
        total += intersection / union;
        pairs++;
      }
    }
    return pairs > 0 ? total / pairs : 1.0;
  }
}

export const deviceAI = new DeviceAIService();
