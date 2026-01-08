/**
 * Agent Actions Component
 * Enables AI agents to perform real actions (book, order, message, etc.)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  MessageSquare, 
  ShoppingCart, 
  Phone,
  MapPin,
  Clock,
  Check,
  X,
  Loader2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ActionType = 'book' | 'order' | 'message' | 'call' | 'navigate';

export interface AgentAction {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  data: Record<string, any>;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

interface AgentActionsProps {
  action: AgentAction;
  onConfirm: (actionId: string, data?: Record<string, any>) => Promise<void>;
  onCancel: (actionId: string) => void;
}

export function AgentActionCard({ action, onConfirm, onCancel }: AgentActionsProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>(action.data);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(action.id, formData);
      toast.success(`${action.title} confirmed!`);
    } catch (error) {
      toast.error('Action failed');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    switch (action.type) {
      case 'book': return <Calendar className="h-5 w-5" />;
      case 'order': return <ShoppingCart className="h-5 w-5" />;
      case 'message': return <MessageSquare className="h-5 w-5" />;
      case 'call': return <Phone className="h-5 w-5" />;
      case 'navigate': return <MapPin className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getStatusColor = () => {
    switch (action.status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'confirmed': return 'bg-blue-500/10 text-blue-500';
      case 'completed': return 'bg-green-500/10 text-green-500';
      case 'cancelled': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {getIcon()}
              </div>
              <div>
                <CardTitle className="text-sm">{action.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </div>
            <Badge className={getStatusColor()}>{action.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Dynamic Form Based on Action Type */}
          {action.type === 'book' && action.status === 'pending' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="h-8"
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={formData.time || ''}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="h-8"
                />
              </div>
              {formData.provider && (
                <p className="text-xs text-muted-foreground">
                  Provider: {formData.provider}
                </p>
              )}
            </div>
          )}

          {action.type === 'order' && action.status === 'pending' && (
            <div className="space-y-2">
              {formData.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.name} x{item.quantity}</span>
                  <span>₹{item.price}</span>
                </div>
              ))}
              <div className="flex justify-between font-medium border-t pt-2">
                <span>Total</span>
                <span>₹{formData.total}</span>
              </div>
            </div>
          )}

          {action.type === 'message' && action.status === 'pending' && (
            <div className="space-y-2">
              <Label className="text-xs">Message to send:</Label>
              <textarea
                value={formData.message || ''}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full text-sm p-2 rounded border bg-background min-h-[60px]"
              />
              <p className="text-xs text-muted-foreground">
                To: {formData.recipient}
              </p>
            </div>
          )}

          {action.type === 'call' && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{formData.phoneNumber}</span>
              <span className="text-muted-foreground">({formData.contactName})</span>
            </div>
          )}

          {action.type === 'navigate' && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{formData.address}</span>
              <Button size="sm" variant="outline" className="h-7">
                <ExternalLink className="h-3 w-3 mr-1" />
                Open Map
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          {action.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Confirm
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel(action.id)}
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {action.status === 'completed' && (
            <div className="flex items-center gap-2 text-sm text-green-500">
              <Check className="h-4 w-4" />
              <span>Action completed successfully</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Hook to manage agent actions
export function useAgentActions() {
  const [actions, setActions] = useState<AgentAction[]>([]);

  const addAction = (action: Omit<AgentAction, 'id' | 'status' | 'createdAt'>) => {
    const newAction: AgentAction = {
      ...action,
      id: `action-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setActions(prev => [...prev, newAction]);
    return newAction;
  };

  const confirmAction = async (actionId: string, data?: Record<string, any>) => {
    const action = actions.find(a => a.id === actionId);
    if (!action) return;

    // Execute the action
    try {
      switch (action.type) {
        case 'book':
          await executeBooking({ ...action.data, ...data });
          break;
        case 'order':
          await executeOrder({ ...action.data, ...data });
          break;
        case 'message':
          await executeMessage({ ...action.data, ...data });
          break;
        case 'call':
          await executeCall({ ...action.data, ...data });
          break;
        case 'navigate':
          executeNavigate({ ...action.data, ...data });
          break;
      }

      setActions(prev => prev.map(a => 
        a.id === actionId ? { ...a, status: 'completed' as const, data: { ...a.data, ...data } } : a
      ));
    } catch (error) {
      throw error;
    }
  };

  const cancelAction = (actionId: string) => {
    setActions(prev => prev.map(a => 
      a.id === actionId ? { ...a, status: 'cancelled' as const } : a
    ));
  };

  return { actions, addAction, confirmAction, cancelAction };
}

// Action execution functions
async function executeBooking(data: Record<string, any>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Create appointment in database
  const { error } = await supabase.from('appointments').insert({
    patient_id: user.id,
    provider_id: data.providerId,
    appointment_date: `${data.date}T${data.time}:00`,
    status: 'scheduled',
    notes: data.notes || 'Booked via AI Agent'
  });

  if (error) throw error;
}

async function executeOrder(data: Record<string, any>) {
  // Simulate order processing
  console.log('Processing order:', data);
  // In real implementation, this would integrate with payment/ordering system
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function executeMessage(data: Record<string, any>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Find or create conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .contains('participant_ids', [user.id, data.recipientId])
    .single();

  let conversationId = conversation?.id;

  if (!conversationId) {
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        participant_ids: [user.id, data.recipientId],
        created_by: user.id
      })
      .select('id')
      .single();

    if (error) throw error;
    conversationId = newConv.id;
  }

  // Send message
  const { error: msgError } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: data.message,
    message_type: 'text'
  });

  if (msgError) throw msgError;
}

async function executeCall(data: Record<string, any>) {
  // Open phone dialer
  window.location.href = `tel:${data.phoneNumber}`;
}

function executeNavigate(data: Record<string, any>) {
  // Open maps
  const encodedAddress = encodeURIComponent(data.address);
  window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');
}

// Parse AI response for action intents
export function parseActionsFromResponse(response: string): Partial<AgentAction>[] {
  const actions: Partial<AgentAction>[] = [];
  
  // Detect booking intent
  if (response.toLowerCase().includes('book') || response.toLowerCase().includes('appointment')) {
    const dateMatch = response.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\w+\s+\d{1,2})/i);
    const timeMatch = response.match(/(\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
    
    if (dateMatch || timeMatch) {
      actions.push({
        type: 'book',
        title: 'Book Appointment',
        description: 'Schedule the appointment mentioned',
        data: {
          date: dateMatch?.[1],
          time: timeMatch?.[1]
        }
      });
    }
  }

  // Detect order intent
  if (response.toLowerCase().includes('order') || response.toLowerCase().includes('buy')) {
    actions.push({
      type: 'order',
      title: 'Place Order',
      description: 'Proceed with the order',
      data: {}
    });
  }

  // Detect call intent
  const phoneMatch = response.match(/(\+?\d{10,12})/);
  if (phoneMatch || response.toLowerCase().includes('call')) {
    actions.push({
      type: 'call',
      title: 'Make Call',
      description: 'Call the number mentioned',
      data: {
        phoneNumber: phoneMatch?.[1]
      }
    });
  }

  return actions;
}
