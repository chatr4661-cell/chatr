/**
 * LOCAL SERVICES AI AGENT
 * Handles local discovery: restaurants, services, shops, plumbers, etc.
 */

import { AgentType, DetectedIntent } from '../types';
import { memoryLayer } from '../memoryLayer';
import { AgentResponse, AgentContext } from './personalAI';

/**
 * Local Services AI Agent
 * Finds nearby services, restaurants, shops, and local providers
 */
class LocalAIAgent {
  readonly type: AgentType = 'local';
  readonly name = 'Local Services AI';

  /**
   * Process a local services query
   */
  async process(context: AgentContext): Promise<AgentResponse> {
    const { query, intent } = context;
    
    // Detect local patterns
    const patterns = this.detectPatterns(query);
    const serviceType = this.classifyService(query);
    
    // Build response
    const response = await this.generateResponse(context, patterns, serviceType);
    
    // Store in memory
    memoryLayer.agentRemember(this.type, `Local search: ${query}`, {
      serviceType,
      location: intent.entities.location,
      timestamp: new Date().toISOString(),
    });
    
    return response;
  }

  /**
   * Detect local service patterns
   */
  private detectPatterns(query: string): string[] {
    const patterns: string[] = [];
    const queryLower = query.toLowerCase();
    
    if (/near me|nearby|around|close|closest/i.test(queryLower)) patterns.push('proximity');
    if (/open|available|24.?hour|now/i.test(queryLower)) patterns.push('availability');
    if (/cheap|affordable|budget|cost/i.test(queryLower)) patterns.push('budget');
    if (/best|top rated|highest|popular/i.test(queryLower)) patterns.push('rating');
    if (/deliver|delivery|home service/i.test(queryLower)) patterns.push('delivery');
    if (/book|reserve|appointment/i.test(queryLower)) patterns.push('booking');
    if (/emergency|urgent|asap/i.test(queryLower)) patterns.push('urgent');
    
    return patterns;
  }

  /**
   * Classify the type of local service
   */
  private classifyService(query: string): string {
    const queryLower = query.toLowerCase();
    
    // Food & Dining
    if (/restaurant|food|eat|dine|lunch|dinner|breakfast/i.test(queryLower)) return 'restaurant';
    if (/pizza|burger|biryani|chinese|italian/i.test(queryLower)) return 'restaurant';
    if (/cafe|coffee|tea|bakery/i.test(queryLower)) return 'cafe';
    if (/grocery|supermarket|vegetables|fruits/i.test(queryLower)) return 'grocery';
    
    // Home Services
    if (/plumber|plumbing|pipe|leak/i.test(queryLower)) return 'plumber';
    if (/electrician|electrical|wiring|power/i.test(queryLower)) return 'electrician';
    if (/carpenter|furniture|wood/i.test(queryLower)) return 'carpenter';
    if (/painter|painting|wall/i.test(queryLower)) return 'painter';
    if (/ac|air condition|hvac|cooling/i.test(queryLower)) return 'ac_repair';
    if (/clean|cleaning|maid|housekeeping/i.test(queryLower)) return 'cleaning';
    
    // Personal Services
    if (/salon|haircut|spa|beauty|parlour/i.test(queryLower)) return 'salon';
    if (/gym|fitness|workout|yoga/i.test(queryLower)) return 'fitness';
    if (/tailor|stitching|alteration/i.test(queryLower)) return 'tailor';
    if (/laundry|dry clean|wash/i.test(queryLower)) return 'laundry';
    
    // Transport
    if (/taxi|cab|uber|ola|ride/i.test(queryLower)) return 'taxi';
    if (/mechanic|garage|car repair|bike repair/i.test(queryLower)) return 'mechanic';
    if (/petrol|gas station|fuel/i.test(queryLower)) return 'fuel';
    
    // Shopping
    if (/shop|store|mall|market/i.test(queryLower)) return 'shopping';
    if (/pharmacy|medical|medicine/i.test(queryLower)) return 'pharmacy';
    if (/atm|bank|cash/i.test(queryLower)) return 'banking';
    
    return 'general';
  }

  /**
   * Generate local services response
   */
  private async generateResponse(
    context: AgentContext,
    patterns: string[],
    serviceType: string
  ): Promise<AgentResponse> {
    const { query, intent } = context;
    const actions: AgentResponse['actions'] = [];
    let confidence = 0.8;
    let message = '';
    
    const location = intent.entities.location || 'your location';
    const serviceName = this.getServiceDisplayName(serviceType);
    
    // Build base message
    if (patterns.includes('proximity')) {
      message = `Looking for ${serviceName} near ${location}. `;
      confidence = 0.85;
    } else {
      message = `I'll find the best ${serviceName} for you. `;
    }
    
    // Add availability info
    if (patterns.includes('availability')) {
      message += `Filtering for currently open places. `;
    }
    
    // Add rating filter
    if (patterns.includes('rating')) {
      message += `Showing top-rated options. `;
    }
    
    // Handle food ordering
    if (serviceType === 'restaurant' || serviceType === 'cafe' || serviceType === 'grocery') {
      if (patterns.includes('delivery')) {
        actions.push({
          type: 'order_food',
          data: { 
            serviceType, 
            location,
            deliveryRequired: true,
          },
          ready: false, // Need restaurant selection
        });
        message += `Would you like me to show restaurants with delivery?`;
      }
    }
    
    // Handle service booking
    if (['plumber', 'electrician', 'carpenter', 'painter', 'ac_repair', 'cleaning', 'salon'].includes(serviceType)) {
      if (patterns.includes('booking') || patterns.includes('urgent')) {
        actions.push({
          type: 'book_appointment',
          data: {
            serviceType,
            location,
            urgent: patterns.includes('urgent'),
          },
          ready: false,
        });
        message += `I can help book a ${serviceName}. `;
      }
    }
    
    // Handle call service
    if (patterns.includes('urgent')) {
      actions.push({
        type: 'call_service',
        data: { serviceType },
        ready: false, // Need provider selection
      });
      message += `Need to call directly? I can connect you.`;
      confidence = 0.9;
    }
    
    // Add navigation
    actions.push({
      type: 'navigate',
      data: { 
        destination: `${serviceName} near ${location}`,
        searchQuery: query,
      },
      ready: true,
    });
    
    return {
      message: message.trim(),
      confidence,
      actions,
      metadata: {
        patterns,
        serviceType,
        location,
        requiresLocationAccess: true,
      },
    };
  }

  /**
   * Get display name for service type
   */
  private getServiceDisplayName(serviceType: string): string {
    const names: Record<string, string> = {
      restaurant: 'restaurants',
      cafe: 'cafes',
      grocery: 'grocery stores',
      plumber: 'plumbers',
      electrician: 'electricians',
      carpenter: 'carpenters',
      painter: 'painters',
      ac_repair: 'AC repair services',
      cleaning: 'cleaning services',
      salon: 'salons & spas',
      fitness: 'gyms & fitness centers',
      tailor: 'tailors',
      laundry: 'laundry services',
      taxi: 'taxi services',
      mechanic: 'mechanics',
      fuel: 'petrol pumps',
      shopping: 'shops',
      pharmacy: 'pharmacies',
      banking: 'ATMs & banks',
      general: 'services',
    };
    return names[serviceType] || 'services';
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): string[] {
    return [
      'Find nearby restaurants',
      'Book home services',
      'Discover local shops',
      'Order food delivery',
      'Find emergency services',
      'Compare service providers',
    ];
  }
}

export const localAI = new LocalAIAgent();
