import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users, Bell, AlertTriangle, Heart, Trash2, Phone, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MedicineBottomNav } from '@/components/care/MedicineBottomNav';
import { MedicineHeroHeader } from '@/components/care/MedicineHeroHeader';

interface FamilyMember {
  id: string;
  member_name: string;
  member_phone: string | null;
  relationship: string;
  date_of_birth: string | null;
  conditions: string[];
  avatar_url: string | null;
  is_active: boolean;
  alert_on_missed_dose: boolean;
  alert_on_abnormal_vitals: boolean;
}

const MedicineFamily = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMember, setNewMember] = useState({
    member_name: '',
    member_phone: '',
    relationship: 'parent',
    conditions: [] as string[]
  });

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('health_family_members')
        .select('*')
        .eq('caregiver_user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading family members:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('health_family_members')
        .insert({
          caregiver_user_id: user.id,
          member_name: newMember.member_name,
          member_phone: newMember.member_phone,
          relationship: newMember.relationship,
          conditions: newMember.conditions
        });

      if (error) throw error;
      
      toast.success('Family member added');
      setShowAddDialog(false);
      setNewMember({ member_name: '', member_phone: '', relationship: 'parent', conditions: [] });
      loadMembers();
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add family member');
    }
  };

  const toggleAlert = async (memberId: string, field: 'alert_on_missed_dose' | 'alert_on_abnormal_vitals', value: boolean) => {
    try {
      const { error } = await supabase
        .from('health_family_members')
        .update({ [field]: value })
        .eq('id', memberId);

      if (error) throw error;
      
      setMembers(members.map(m => 
        m.id === memberId ? { ...m, [field]: value } : m
      ));
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('health_family_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;
      
      setMembers(members.filter(m => m.id !== memberId));
      toast.success('Family member removed');
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship) {
      case 'parent': return '👴';
      case 'spouse': return '💑';
      case 'child': return '👶';
      case 'sibling': return '👫';
      default: return '👤';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background pb-24">
      <MedicineHeroHeader
        title="Family Members"
        subtitle={`${members.length} member${members.length !== 1 ? 's' : ''} added`}
        gradient="family"
        rightAction={
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-white/20 text-white hover:bg-white/30">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Family Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newMember.member_name}
                    onChange={(e) => setNewMember({ ...newMember, member_name: e.target.value })}
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={newMember.member_phone}
                    onChange={(e) => setNewMember({ ...newMember, member_phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label>Relationship</Label>
                  <Select
                    value={newMember.relationship}
                    onValueChange={(value) => setNewMember({ ...newMember, relationship: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={addMember}>
                  Add Family Member
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      >
        {/* Info Card */}
        <Card className="bg-white/15 backdrop-blur-xl border-white/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Users className="h-6 w-6 text-white mt-0.5" />
              <div>
                <h3 className="font-bold text-white">Family Control Mode</h3>
                <p className="text-sm text-white/80 mt-1">
                  Get alerts when family members miss doses or have abnormal vitals
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </MedicineHeroHeader>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <motion.div 
                  className="w-20 h-20 rounded-3xl bg-blue-100 flex items-center justify-center mx-auto mb-4"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Users className="h-10 w-10 text-blue-500" />
                </motion.div>
                <h3 className="text-lg font-bold mb-2">No Family Members Yet</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Add your parents, spouse, or children to manage their medicines
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Family Member
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {members.map((member, idx) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="border-0 shadow-lg overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14 border-2 border-primary/20">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-100 to-indigo-100">
                          {getRelationshipIcon(member.relationship)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{member.member_name}</h3>
                            <p className="text-sm text-muted-foreground capitalize">{member.relationship}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeMember(member.id)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>

                        {member.member_phone && (
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{member.member_phone}</span>
                          </div>
                        )}

                        {member.conditions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {member.conditions.map((condition, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {condition}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Alert Settings */}
                        <div className="mt-4 space-y-3 pt-3 border-t">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Bell className="h-4 w-4 text-amber-500" />
                              <span className="text-sm">Alert on missed dose</span>
                            </div>
                            <Switch
                              checked={member.alert_on_missed_dose}
                              onCheckedChange={(checked) => toggleAlert(member.id, 'alert_on_missed_dose', checked)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              <span className="text-sm">Alert on abnormal vitals</span>
                            </div>
                            <Switch
                              checked={member.alert_on_abnormal_vitals}
                              onCheckedChange={(checked) => toggleAlert(member.id, 'alert_on_abnormal_vitals', checked)}
                            />
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 mt-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 rounded-xl" 
                            onClick={() => navigate(`/care/medicines/subscribe?member=${member.id}`)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Meds
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 rounded-xl" 
                            onClick={() => navigate(`/care/medicines/vitals?member=${member.id}`)}
                          >
                            <Heart className="h-3 w-3 mr-1" />
                            Vitals
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      <MedicineBottomNav />
    </div>
  );
};

export default MedicineFamily;
