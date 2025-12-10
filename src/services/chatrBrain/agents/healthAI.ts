/**
 * HEALTH AI AGENT
 * Handles symptoms, doctor search, appointments, health information
 */

import { AgentType, DetectedIntent } from '../types';
import { memoryLayer } from '../memoryLayer';
import { AgentResponse, AgentContext } from './personalAI';

/**
 * Health AI Agent
 * Provides health information, finds doctors, books appointments
 */
class HealthAIAgent {
  readonly type: AgentType = 'health';
  readonly name = 'Health AI';

  // IMPORTANT: Health disclaimers
  private readonly DISCLAIMER = "Please note: I provide general health information, not medical advice. Always consult a qualified healthcare professional for diagnosis and treatment.";

  /**
   * Process a health-related query
   */
  async process(context: AgentContext): Promise<AgentResponse> {
    const { query, intent } = context;
    
    // Check for emergency keywords first
    if (this.isEmergency(query)) {
      return this.handleEmergency(context);
    }
    
    // Detect health patterns
    const patterns = this.detectPatterns(query);
    const healthCategory = this.classifyHealthCategory(query);
    
    // Build response
    const response = await this.generateResponse(context, patterns, healthCategory);
    
    // Store in memory (sensitive - minimal data)
    memoryLayer.agentRemember(this.type, `Health query: ${healthCategory}`, {
      category: healthCategory,
      hasSymptoms: patterns.includes('symptom'),
      timestamp: new Date().toISOString(),
    });
    
    return response;
  }

  /**
   * Check if query indicates emergency
   */
  private isEmergency(query: string): boolean {
    const emergencyKeywords = [
      'emergency', '911', 'ambulance', 'dying', 'heart attack',
      'can\'t breathe', 'severe bleeding', 'unconscious', 'stroke',
      'poisoning', 'overdose', 'suicide', 'kill myself'
    ];
    const queryLower = query.toLowerCase();
    return emergencyKeywords.some(keyword => queryLower.includes(keyword));
  }

  /**
   * Handle emergency situations
   */
  private handleEmergency(context: AgentContext): AgentResponse {
    const { query } = context;
    const isMentalHealth = /suicide|kill myself|end my life|want to die/i.test(query);
    
    let message: string;
    if (isMentalHealth) {
      message = `🆘 I'm concerned about you. Please reach out to a crisis helpline immediately:

**Vandrevala Foundation (India)**: 1860-2662-345
**iCall**: 9152987821

You're not alone, and help is available 24/7. Would you like me to call emergency services?`;
    } else {
      message = `🚨 **This sounds like a medical emergency!**

**Call 108 (Ambulance)** or **102** immediately.

While waiting:
- Stay calm
- Don't move if injured
- Keep airways clear

I can help you find the nearest hospital. Share your location?`;
    }
    
    return {
      message,
      confidence: 1.0,
      actions: [
        {
          type: 'call_service',
          data: { phoneNumber: '108', serviceName: 'Emergency Ambulance' },
          ready: true,
        },
        {
          type: 'navigate',
          data: { destination: 'nearest hospital', emergency: true },
          ready: true,
        },
      ],
      metadata: {
        isEmergency: true,
        isMentalHealth,
      },
    };
  }

  /**
   * Detect health-related patterns
   */
  private detectPatterns(query: string): string[] {
    const patterns: string[] = [];
    const queryLower = query.toLowerCase();
    
    if (/symptom|pain|ache|hurt|sore|burning|itching/i.test(queryLower)) patterns.push('symptom');
    if (/doctor|physician|specialist|clinic|hospital/i.test(queryLower)) patterns.push('provider');
    if (/appointment|book|schedule|visit|consult/i.test(queryLower)) patterns.push('appointment');
    if (/medicine|medication|drug|tablet|prescription/i.test(queryLower)) patterns.push('medication');
    if (/test|lab|diagnosis|report|scan/i.test(queryLower)) patterns.push('diagnostic');
    if (/treatment|cure|therapy|surgery/i.test(queryLower)) patterns.push('treatment');
    if (/diet|nutrition|weight|exercise|fitness/i.test(queryLower)) patterns.push('wellness');
    if (/pregnancy|prenatal|baby|maternal/i.test(queryLower)) patterns.push('maternal');
    if (/mental|anxiety|depression|stress|sleep/i.test(queryLower)) patterns.push('mental_health');
    if (/vaccine|vaccination|immunization/i.test(queryLower)) patterns.push('vaccination');
    
    return patterns;
  }

  /**
   * Classify health category
   */
  private classifyHealthCategory(query: string): string {
    const queryLower = query.toLowerCase();
    
    // Specialties
    if (/heart|cardiac|chest pain|bp|blood pressure/i.test(queryLower)) return 'cardiology';
    if (/skin|rash|acne|derma/i.test(queryLower)) return 'dermatology';
    if (/bone|joint|orthop|fracture|spine/i.test(queryLower)) return 'orthopedics';
    if (/eye|vision|ophthal|cataract/i.test(queryLower)) return 'ophthalmology';
    if (/teeth|dental|gum|tooth/i.test(queryLower)) return 'dentistry';
    if (/child|pediatr|baby|infant/i.test(queryLower)) return 'pediatrics';
    if (/women|gynec|period|pregnancy/i.test(queryLower)) return 'gynecology';
    if (/mental|psychiatr|psycholog|therapy|counseling/i.test(queryLower)) return 'psychiatry';
    if (/nerve|neuro|brain|headache|migraine/i.test(queryLower)) return 'neurology';
    if (/stomach|digest|gastro|liver/i.test(queryLower)) return 'gastroenterology';
    if (/ear|nose|throat|ent|sinus/i.test(queryLower)) return 'ent';
    if (/diabetes|thyroid|hormone|endo/i.test(queryLower)) return 'endocrinology';
    if (/allergy|asthma|lung|pulmon|breathing/i.test(queryLower)) return 'pulmonology';
    if (/kidney|urolog|urine/i.test(queryLower)) return 'urology';
    if (/cancer|oncol|tumor/i.test(queryLower)) return 'oncology';
    
    return 'general_physician';
  }

  /**
   * Generate health response
   */
  private async generateResponse(
    context: AgentContext,
    patterns: string[],
    healthCategory: string
  ): Promise<AgentResponse> {
    const { intent } = context;
    const actions: AgentResponse['actions'] = [];
    let confidence = 0.75;
    let message = '';
    
    const location = intent.entities.location || '';
    const condition = intent.entities.condition || '';
    const specialtyName = this.getSpecialtyDisplayName(healthCategory);
    
    // Handle symptom queries
    if (patterns.includes('symptom')) {
      message = this.handleSymptomQuery(context, healthCategory);
      confidence = 0.7; // Lower confidence for symptom interpretation
    }
    
    // Handle doctor/provider search
    if (patterns.includes('provider')) {
      message += `I'll find ${specialtyName} doctors${location ? ` in ${location}` : ' near you'}. `;
      
      actions.push({
        type: 'navigate',
        data: {
          destination: '/chatr-world/healthcare',
          specialty: healthCategory,
          location,
        },
        ready: true,
      });
      
      confidence = 0.85;
    }
    
    // Handle appointment booking
    if (patterns.includes('appointment')) {
      actions.push({
        type: 'book_appointment',
        data: {
          specialty: healthCategory,
          condition,
          location,
        },
        ready: false, // Need provider selection
      });
      message += `I can help you book an appointment with a ${specialtyName}. `;
      confidence = 0.85;
    }
    
    // Handle medication queries
    if (patterns.includes('medication')) {
      message += `For medication information, please consult a doctor or pharmacist. I can help you find a pharmacy nearby. `;
      
      actions.push({
        type: 'navigate',
        data: { destination: 'pharmacy near me' },
        ready: true,
      });
    }
    
    // Handle wellness queries
    if (patterns.includes('wellness')) {
      message += `I can provide general wellness tips and help you find fitness centers or nutritionists. `;
      confidence = 0.8;
    }
    
    // Handle mental health with care
    if (patterns.includes('mental_health')) {
      message = `I understand you're going through a difficult time. Speaking with a mental health professional can really help. Would you like me to find a counselor or therapist nearby? Remember, seeking help is a sign of strength. `;
      confidence = 0.8;
    }
    
    // Default message
    if (!message) {
      message = `I can help you with health-related questions. Looking for a ${specialtyName}? `;
    }
    
    // Always add disclaimer
    message += `\n\n_${this.DISCLAIMER}_`;
    
    return {
      message: message.trim(),
      confidence,
      actions,
      metadata: {
        patterns,
        healthCategory,
        requiresCaution: patterns.includes('symptom') || patterns.includes('medication'),
      },
    };
  }

  /**
   * Handle symptom-related queries
   */
  private handleSymptomQuery(context: AgentContext, healthCategory: string): string {
    const { query } = context;
    const specialtyName = this.getSpecialtyDisplayName(healthCategory);
    
    // Extract symptoms mentioned
    const symptomKeywords = query.match(/pain|ache|fever|cough|headache|nausea|fatigue|swelling|rash|burning/gi) || [];
    
    let message = '';
    
    if (symptomKeywords.length > 0) {
      message = `I see you're experiencing ${symptomKeywords.join(', ')}. These symptoms might be related to ${healthCategory === 'general_physician' ? 'various conditions' : specialtyName + ' issues'}. `;
      message += `I recommend consulting a ${specialtyName} for proper evaluation. `;
    } else {
      message = `Based on your description, I suggest seeing a ${specialtyName}. `;
    }
    
    message += `Would you like me to find doctors nearby or book an appointment? `;
    
    return message;
  }

  /**
   * Get display name for specialty
   */
  private getSpecialtyDisplayName(category: string): string {
    const names: Record<string, string> = {
      cardiology: 'Cardiologist',
      dermatology: 'Dermatologist',
      orthopedics: 'Orthopedic',
      ophthalmology: 'Eye Specialist',
      dentistry: 'Dentist',
      pediatrics: 'Pediatrician',
      gynecology: 'Gynecologist',
      psychiatry: 'Psychiatrist',
      neurology: 'Neurologist',
      gastroenterology: 'Gastroenterologist',
      ent: 'ENT Specialist',
      endocrinology: 'Endocrinologist',
      pulmonology: 'Pulmonologist',
      urology: 'Urologist',
      oncology: 'Oncologist',
      general_physician: 'General Physician',
    };
    return names[category] || 'Doctor';
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): string[] {
    return [
      'Symptom analysis',
      'Find doctors by specialty',
      'Book medical appointments',
      'Find nearby hospitals',
      'Health information',
      'Mental health support',
      'Emergency services',
    ];
  }
}

export const healthAI = new HealthAIAgent();
