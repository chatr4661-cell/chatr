import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Brain, AlertCircle, CheckCircle2, Loader2, Stethoscope } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const commonSymptoms = [
  'Headache', 'Fever', 'Cough', 'Sore Throat', 'Fatigue',
  'Nausea', 'Dizziness', 'Chest Pain', 'Shortness of Breath',
  'Abdominal Pain', 'Back Pain', 'Joint Pain', 'Muscle Aches'
];

export default function SymptomChecker() {
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const toggleSymptom = (symptom: string) => {
    setSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const addCustomSymptom = () => {
    if (customSymptom.trim() && !symptoms.includes(customSymptom.trim())) {
      setSymptoms([...symptoms, customSymptom.trim()]);
      setCustomSymptom('');
    }
  };

  const checkSymptoms = async () => {
    if (symptoms.length === 0) {
      toast.error('Please select at least one symptom');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('symptom-checker', {
        body: { 
          symptoms, 
          age: age ? parseInt(age) : undefined, 
          gender: gender || undefined 
        }
      });

      if (error) throw error;

      // Parse AI response
      let parsedResult;
      try {
        parsedResult = JSON.parse(data.assessment);
      } catch {
        // If not JSON, create structured response from text
        parsedResult = {
          severity: 'medium',
          conditions: ['Please consult a healthcare provider'],
          actions: [data.assessment],
          specialist: 'General Practitioner'
        };
      }

      setResult(parsedResult);

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('symptom_checks').insert({
          user_id: user.id,
          symptoms: symptoms as unknown as any, // JSONB column
          ai_assessment: data.assessment,
          severity_level: parsedResult.severity || 'low',
          recommended_actions: (parsedResult.actions || []) as unknown as any, // JSONB column
          specialist_type: parsedResult.specialist || 'General Practitioner'
        });
      }

      toast.success('Assessment complete');
    } catch (error: any) {
      console.error('Symptom check error:', error);
      toast.error('Failed to analyze symptoms');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'emergency': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-green-100 text-green-700 border-green-300';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" />
            AI Symptom Checker
          </CardTitle>
          <CardDescription>
            AI-powered triage to help guide your care. Not a substitute for professional medical advice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!result ? (
            <>
              {/* Patient Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Age (optional)</Label>
                  <Input
                    type="number"
                    placeholder="Your age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Gender (optional)</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Common Symptoms */}
              <div>
                <Label>Select Your Symptoms</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {commonSymptoms.map(symptom => (
                    <Button
                      key={symptom}
                      variant={symptoms.includes(symptom) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSymptom(symptom)}
                      className={symptoms.includes(symptom) ? "bg-purple-600" : ""}
                    >
                      {symptom}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Symptom */}
              <div>
                <Label>Add Other Symptoms</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Type a symptom..."
                    value={customSymptom}
                    onChange={(e) => setCustomSymptom(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomSymptom()}
                  />
                  <Button onClick={addCustomSymptom} variant="outline">Add</Button>
                </div>
              </div>

              {/* Selected Symptoms */}
              {symptoms.length > 0 && (
                <div>
                  <Label>Selected Symptoms ({symptoms.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {symptoms.map(symptom => (
                      <Badge
                        key={symptom}
                        className="bg-purple-600 cursor-pointer"
                        onClick={() => toggleSymptom(symptom)}
                      >
                        {symptom} ✕
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={checkSymptoms}
                disabled={loading || symptoms.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Check Symptoms'
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Results */}
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border-2 ${getSeverityColor(result.severity)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <h3 className="font-semibold">Severity: {result.severity?.toUpperCase()}</h3>
                  </div>
                  {result.severity === 'emergency' && (
                    <p className="text-sm font-medium">⚠️ Seek immediate medical attention!</p>
                  )}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Possible Conditions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {(Array.isArray(result.conditions) ? result.conditions : [result.conditions]).map((condition: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5" />
                          <span className="text-sm">{condition}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recommended Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {(Array.isArray(result.actions) ? result.actions : [result.actions]).map((action: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          <span className="text-sm">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" />
                      Recommended Specialist
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium text-blue-700">{result.specialist}</p>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-blue-600"
                    onClick={() => window.location.href = '/booking'}
                  >
                    Book Appointment
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setResult(null);
                      setSymptoms([]);
                    }}
                  >
                    New Check
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <p className="text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            <strong>Medical Disclaimer:</strong> This AI assessment is for informational purposes only 
            and is not a substitute for professional medical advice, diagnosis, or treatment. 
            Always consult a qualified healthcare provider for medical concerns.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}