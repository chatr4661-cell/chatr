import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Pill, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Search,
  Plus,
  X,
  Shield,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Interaction {
  med1?: string;
  med2?: string;
  medication_1?: string;
  medication_2?: string;
  severity?: string;
  interaction_severity?: string;
  description?: string;
  recommendation?: string;
}

export default function MedicationInteractionsPage() {
  const navigate = useNavigate();
  const [medications, setMedications] = useState<string[]>([]);
  const [currentMed, setCurrentMed] = useState('');
  const [loading, setLoading] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [hasWarning, setHasWarning] = useState(false);
  const [userMedications, setUserMedications] = useState<string[]>([]);

  useEffect(() => {
    loadUserMedications();
  }, []);

  const loadUserMedications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('medications')
        .select('medication_name')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (data) {
        setUserMedications(data.map(m => m.medication_name));
      }
    } catch (error) {
      console.error('Error loading medications:', error);
    }
  };

  const addMedication = (med: string) => {
    const trimmed = med.trim();
    if (trimmed && !medications.includes(trimmed)) {
      setMedications([...medications, trimmed]);
      setCurrentMed('');
    }
  };

  const removeMedication = (med: string) => {
    setMedications(medications.filter(m => m !== med));
    setInteractions([]);
  };

  const checkInteractions = async () => {
    if (medications.length < 2) {
      toast.error('Add at least 2 medications to check interactions');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('medication-interactions', {
        body: { medications }
      });

      if (error) throw error;

      setInteractions(data.interactions || []);
      setHasWarning(data.warning || false);

      if (data.warning) {
        toast.error('⚠️ Severe interaction detected!', {
          description: 'Please consult your doctor immediately'
        });
      } else if (data.interactions?.length > 0) {
        toast.warning('Interactions found - review the details below');
      } else {
        toast.success('No significant interactions found');
      }
    } catch (error) {
      console.error('Error checking interactions:', error);
      toast.error('Failed to check interactions');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'severe': return 'bg-red-100 text-red-700 border-red-300';
      case 'moderate': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'minor': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-green-100 text-green-700 border-green-300';
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'severe': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'moderate': return <Info className="h-5 w-5 text-orange-600" />;
      default: return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Medication Interactions</h1>
              <p className="text-sm text-white/80">Check for drug interactions</p>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Add Medications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-orange-500" />
                Add Medications
              </CardTitle>
              <CardDescription>
                Enter at least 2 medications to check for potential interactions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Type medication name..."
                    value={currentMed}
                    onChange={(e) => setCurrentMed(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addMedication(currentMed)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => addMedication(currentMed)} disabled={!currentMed.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick Add from User's Medications */}
              {userMedications.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Your active medications:</p>
                  <div className="flex flex-wrap gap-2">
                    {userMedications.filter(m => !medications.includes(m)).map(med => (
                      <Button
                        key={med}
                        variant="outline"
                        size="sm"
                        onClick={() => addMedication(med)}
                        className="text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {med}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Medications */}
              <AnimatePresence>
                {medications.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p className="text-sm font-medium mb-2">Selected ({medications.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {medications.map((med, idx) => (
                        <motion.div
                          key={med}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <Badge variant="secondary" className="text-sm py-1 px-3 gap-2">
                            <Pill className="h-3 w-3" />
                            {med}
                            <button onClick={() => removeMedication(med)}>
                              <X className="h-3 w-3 hover:text-destructive" />
                            </button>
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Check Button */}
              <Button 
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                onClick={checkInteractions}
                disabled={loading || medications.length < 2}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Check Interactions
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <AnimatePresence>
            {interactions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {hasWarning ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  Interaction Results
                </h2>

                {interactions.map((interaction, idx) => {
                  const severity = interaction.severity || interaction.interaction_severity;
                  const med1 = interaction.med1 || interaction.medication_1;
                  const med2 = interaction.med2 || interaction.medication_2;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Card className={`border-2 ${getSeverityColor(severity)}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {getSeverityIcon(severity)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{med1}</Badge>
                                <span className="text-muted-foreground">+</span>
                                <Badge variant="outline">{med2}</Badge>
                                <Badge className={getSeverityColor(severity)}>
                                  {severity?.toUpperCase() || 'UNKNOWN'}
                                </Badge>
                              </div>
                              {interaction.description && (
                                <p className="text-sm mb-2">{interaction.description}</p>
                              )}
                              {interaction.recommendation && (
                                <div className="bg-muted/50 rounded-lg p-3 mt-2">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Recommendation:</p>
                                  <p className="text-sm">{interaction.recommendation}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* No Interactions Found */}
          {!loading && medications.length >= 2 && interactions.length === 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold text-green-800">No Interactions Found</h3>
                <p className="text-sm text-green-700 mt-1">
                  Based on our analysis, these medications appear safe to take together.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Disclaimer */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Important Disclaimer</p>
                  <p className="text-sm text-amber-700 mt-1">
                    This tool provides general information about drug interactions and should not replace 
                    professional medical advice. Always consult your doctor or pharmacist before making 
                    any changes to your medications.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
