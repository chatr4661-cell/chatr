import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuickReplyTemplate {
  id: string;
  text: string;
  category?: string;
  usageCount: number;
}

export const useQuickReplyTemplates = () => {
  const [templates, setTemplates] = useState<QuickReplyTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async (): Promise<QuickReplyTemplate[]> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('quick_reply_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('usage_count', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(t => ({
        id: t.id,
        text: t.template_text,
        category: t.category || undefined,
        usageCount: t.usage_count
      }));

      setTemplates(mapped);
      return mapped;
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (
    text: string,
    category?: string
  ): Promise<QuickReplyTemplate | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('quick_reply_templates')
        .insert({
          user_id: user.id,
          template_text: text,
          category
        })
        .select()
        .single();

      if (error) throw error;

      const template: QuickReplyTemplate = {
        id: data.id,
        text: data.template_text,
        category: data.category || undefined,
        usageCount: 0
      };

      setTemplates(prev => [...prev, template]);
      toast.success('Template saved');
      return template;
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('Failed to save template');
      return null;
    }
  }, []);

  const useTemplate = useCallback(async (templateId: string): Promise<string | null> => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) return null;

      // Increment usage count
      await supabase
        .from('quick_reply_templates')
        .update({ usage_count: template.usageCount + 1 })
        .eq('id', templateId);

      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, usageCount: t.usageCount + 1 } : t
      ));

      return template.text;
    } catch {
      return null;
    }
  }, [templates]);

  const deleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('quick_reply_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template deleted');
      return true;
    } catch {
      toast.error('Failed to delete template');
      return false;
    }
  }, []);

  const getTemplatesByCategory = useCallback((category: string): QuickReplyTemplate[] => {
    return templates.filter(t => t.category === category);
  }, [templates]);

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    useTemplate,
    deleteTemplate,
    getTemplatesByCategory
  };
};
