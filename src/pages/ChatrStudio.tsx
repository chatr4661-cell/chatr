import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Palette, FolderOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SEOHead } from '@/components/SEOHead';
import { TemplateGallery } from '@/components/studio/TemplateGallery';
import { DesignEditor } from '@/components/studio/DesignEditor';
import { MyDesigns } from '@/components/studio/MyDesigns';

interface Template {
  id: string;
  name: string;
  category: string;
  template_data: any;
  dimensions: { width: number; height: number };
  is_premium: boolean;
}

export default function ChatrStudio() {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [activeTab, setActiveTab] = useState('templates');

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
  };

  const handleBackToTemplates = () => {
    setSelectedTemplate(null);
  };

  return (
    <>
      <SEOHead 
        title="Chatr Studio - Create Marketing Materials"
        description="Design beautiful marketing materials for your products and services with Chatr Studio"
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background pb-20">
        {/* Header */}
        <div className="bg-card/80 backdrop-blur-sm border-b sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Chatr Studio
                </h1>
                <p className="text-xs text-muted-foreground">Create marketing materials</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" />
              Free
            </Badge>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {selectedTemplate ? (
            <DesignEditor 
              template={selectedTemplate} 
              onBack={handleBackToTemplates} 
            />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="templates" className="gap-2">
                  <Palette className="h-4 w-4" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="my-designs" className="gap-2">
                  <FolderOpen className="h-4 w-4" />
                  My Designs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="templates">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Choose a Template</h2>
                  <p className="text-sm text-muted-foreground">
                    Select a template to start designing your marketing material
                  </p>
                </div>
                <TemplateGallery onSelect={handleSelectTemplate} />
              </TabsContent>

              <TabsContent value="my-designs">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">My Designs</h2>
                  <p className="text-sm text-muted-foreground">
                    Your saved marketing materials
                  </p>
                </div>
                <MyDesigns />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </>
  );
}
