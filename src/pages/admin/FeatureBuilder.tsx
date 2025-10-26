import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Wand2, Code, Database, Sparkles, Copy, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

const FeatureBuilder = () => {
  const [prompt, setPrompt] = useState("");
  const [featureName, setFeatureName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState({
    component: "",
    schema: "",
    api: ""
  });

  const generateFeature = async () => {
    if (!prompt || !featureName) {
      toast.error("Please provide both feature name and description");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-feature', {
        body: { 
          prompt,
          featureName,
          type: 'full-feature'
        }
      });

      if (error) throw error;

      setGeneratedCode({
        component: data.component || "",
        schema: data.schema || "",
        api: data.api || ""
      });

      toast.success("Feature code generated successfully!");
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || "Failed to generate feature");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard!");
  };

  const downloadCode = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Code downloaded!");
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          AI Feature Builder
        </h1>
        <p className="text-muted-foreground mt-1">Generate full-stack features with AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Feature Name</label>
              <Input
                placeholder="e.g., User Analytics Dashboard"
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Describe Your Feature</label>
              <Textarea
                placeholder="Describe the feature you want to build in detail. Include:&#10;- What it should do&#10;- What data it needs&#10;- What UI components it requires&#10;- Any specific functionality"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={12}
                className="resize-none"
              />
            </div>

            <Button
              onClick={generateFeature}
              disabled={generating}
              className="w-full"
              size="lg"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Feature
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Quick Templates */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Quick Templates
          </h3>
          <div className="space-y-2">
            {[
              {
                name: "CRUD Table",
                description: "Create a full CRUD table with forms and list view",
                icon: Database
              },
              {
                name: "Dashboard Widget",
                description: "Analytics widget with charts and metrics",
                icon: Code
              },
              {
                name: "User Profile",
                description: "Complete user profile with edit functionality",
                icon: Sparkles
              },
              {
                name: "Settings Panel",
                description: "Settings page with various configuration options",
                icon: Wand2
              }
            ].map((template) => (
              <Button
                key={template.name}
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setFeatureName(template.name);
                  setPrompt(template.description);
                }}
              >
                <template.icon className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">{template.name}</div>
                  <div className="text-xs text-muted-foreground">{template.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      </div>

      {/* Generated Code */}
      {(generatedCode.component || generatedCode.schema || generatedCode.api) && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Generated Code</h3>
          <Tabs defaultValue="component" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="component">React Component</TabsTrigger>
              <TabsTrigger value="schema">Database Schema</TabsTrigger>
              <TabsTrigger value="api">API Functions</TabsTrigger>
            </TabsList>

            {['component', 'schema', 'api'].map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedCode[tab as keyof typeof generatedCode])}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadCode(
                      generatedCode[tab as keyof typeof generatedCode],
                      `${featureName.toLowerCase().replace(/\s+/g, '-')}-${tab}.${tab === 'schema' ? 'sql' : 'tsx'}`
                    )}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm">{generatedCode[tab as keyof typeof generatedCode]}</code>
                </pre>
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      )}
    </div>
  );
};

export default FeatureBuilder;
