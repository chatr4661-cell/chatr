import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Plus, 
  Utensils, 
  Droplet, 
  Apple, 
  Beef, 
  Wheat,
  Flame,
  Target,
  TrendingUp,
  Clock,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface NutritionLog {
  id: string;
  food_name: string;
  meal_type: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  log_date: string;
}

interface DailySummary {
  summary_date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_water_ml: number;
  goal_calories: number;
  goal_protein_g: number;
  goal_carbs_g: number;
  goal_fat_g: number;
  goal_water_ml: number;
}

const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 Breakfast', icon: '🍳' },
  { value: 'lunch', label: '☀️ Lunch', icon: '🥗' },
  { value: 'dinner', label: '🌙 Dinner', icon: '🍛' },
  { value: 'snack', label: '🍎 Snack', icon: '🥜' }
];

export default function NutritionTracker() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [todayLogs, setTodayLogs] = useState<NutritionLog[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  
  const [foodForm, setFoodForm] = useState({
    foodName: '',
    mealType: 'breakfast',
    portionSize: '1 serving'
  });

  const [goals, setGoals] = useState({
    calories: '2000',
    protein: '50',
    carbs: '250',
    fat: '65',
    water: '8'
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUser(user);
    loadTodayData(user.id);
  };

  const loadTodayData = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Load today's logs
    const { data: logs } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', today)
      .order('created_at', { ascending: true });
    
    if (logs) setTodayLogs(logs as unknown as NutritionLog[]);

    // Load summary
    const { data: summaryData } = await supabase
      .from('nutrition_daily_summary')
      .select('*')
      .eq('user_id', userId)
      .eq('summary_date', today)
      .maybeSingle();
    
    if (summaryData) {
      setSummary(summaryData as unknown as DailySummary);
      setGoals({
        calories: String(summaryData.goal_calories || 2000),
        protein: String(summaryData.goal_protein_g || 50),
        carbs: String(summaryData.goal_carbs_g || 250),
        fat: String(summaryData.goal_fat_g || 65),
        water: String(Math.round((summaryData.goal_water_ml || 2000) / 250))
      });
    }
  };

  const logFood = async () => {
    if (!foodForm.foodName) {
      toast.error('Please enter food name');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('nutrition-tracker', {
        body: {
          action: 'log_food',
          food_name: foodForm.foodName,
          meal_type: foodForm.mealType,
          portion_size: foodForm.portionSize
        }
      });

      if (error) throw error;

      toast.success(`Added ${foodForm.foodName}`);
      setAddFoodOpen(false);
      setFoodForm({ foodName: '', mealType: 'breakfast', portionSize: '1 serving' });
      
      if (user) loadTodayData(user.id);
    } catch (error: any) {
      console.error('Error logging food:', error);
      toast.error('Failed to log food');
    } finally {
      setLoading(false);
    }
  };

  const addWater = async () => {
    try {
      await supabase.functions.invoke('nutrition-tracker', {
        body: { action: 'add_water' }
      });
      toast.success('💧 Water logged!');
      if (user) loadTodayData(user.id);
    } catch (error) {
      toast.error('Failed to log water');
    }
  };

  const updateGoals = async () => {
    setLoading(true);
    try {
      await supabase.functions.invoke('nutrition-tracker', {
        body: {
          action: 'set_goals',
          calorie_goal: parseInt(goals.calories),
          protein_goal: parseInt(goals.protein),
          carbs_goal: parseInt(goals.carbs),
          fat_goal: parseInt(goals.fat),
          water_goal: parseInt(goals.water)
        }
      });

      toast.success('Goals updated!');
      setGoalsOpen(false);
      if (user) loadTodayData(user.id);
    } catch (error) {
      toast.error('Failed to update goals');
    } finally {
      setLoading(false);
    }
  };

  const deleteLog = async (logId: string) => {
    try {
      await supabase.from('nutrition_logs').delete().eq('id', logId);
      toast.success('Entry deleted');
      if (user) loadTodayData(user.id);
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const getProgress = (current: number, goal: number) => {
    return Math.min(100, (current / goal) * 100);
  };

  const caloriesConsumed = summary?.total_calories || todayLogs.reduce((sum, log) => sum + log.calories, 0);
  const proteinConsumed = summary?.total_protein_g || todayLogs.reduce((sum, log) => sum + log.protein_g, 0);
  const carbsConsumed = summary?.total_carbs_g || todayLogs.reduce((sum, log) => sum + log.carbs_g, 0);
  const fatConsumed = summary?.total_fat_g || todayLogs.reduce((sum, log) => sum + log.fat_g, 0);
  const waterConsumed = Math.round((summary?.total_water_ml || 0) / 250);

  const calorieGoal = parseInt(goals.calories);
  const proteinGoal = parseInt(goals.protein);
  const carbsGoal = parseInt(goals.carbs);
  const fatGoal = parseInt(goals.fat);
  const waterGoal = parseInt(goals.water);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-xl font-bold">Nutrition Tracker</h1>
                <p className="text-sm text-orange-100">Track your daily nutrition</p>
              </div>
            </div>
            <Dialog open={goalsOpen} onOpenChange={setGoalsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Target className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Daily Goals</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Calorie Goal</Label>
                    <Input
                      type="number"
                      value={goals.calories}
                      onChange={(e) => setGoals({ ...goals, calories: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Protein (g)</Label>
                      <Input
                        type="number"
                        value={goals.protein}
                        onChange={(e) => setGoals({ ...goals, protein: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Carbs (g)</Label>
                      <Input
                        type="number"
                        value={goals.carbs}
                        onChange={(e) => setGoals({ ...goals, carbs: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fat (g)</Label>
                      <Input
                        type="number"
                        value={goals.fat}
                        onChange={(e) => setGoals({ ...goals, fat: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Water Glasses</Label>
                    <Input
                      type="number"
                      value={goals.water}
                      onChange={(e) => setGoals({ ...goals, water: e.target.value })}
                    />
                  </div>
                  <Button onClick={updateGoals} disabled={loading} className="w-full">
                    Save Goals
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Calories Overview */}
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
            <CardContent className="pt-6">
              <div className="text-center mb-4">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-32 h-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="#fde4d8"
                      strokeWidth="12"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${(caloriesConsumed / calorieGoal) * 352} 352`}
                      transform="rotate(-90 64 64)"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <p className="text-2xl font-bold">{Math.round(caloriesConsumed)}</p>
                    <p className="text-xs text-muted-foreground">/ {calorieGoal} kcal</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {calorieGoal - caloriesConsumed > 0 
                    ? `${Math.round(calorieGoal - caloriesConsumed)} kcal remaining`
                    : 'Goal reached! 🎉'}
                </p>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Beef className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-medium">Protein</span>
                  </div>
                  <Progress value={getProgress(proteinConsumed, proteinGoal)} className="h-2 mb-1" />
                  <p className="text-xs text-muted-foreground">{Math.round(proteinConsumed)}g / {proteinGoal}g</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Wheat className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-medium">Carbs</span>
                  </div>
                  <Progress value={getProgress(carbsConsumed, carbsGoal)} className="h-2 mb-1" />
                  <p className="text-xs text-muted-foreground">{Math.round(carbsConsumed)}g / {carbsGoal}g</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-medium">Fat</span>
                  </div>
                  <Progress value={getProgress(fatConsumed, fatGoal)} className="h-2 mb-1" />
                  <p className="text-xs text-muted-foreground">{Math.round(fatConsumed)}g / {fatGoal}g</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Dialog open={addFoodOpen} onOpenChange={setAddFoodOpen}>
              <DialogTrigger asChild>
                <Button className="h-16 bg-orange-600 hover:bg-orange-700">
                  <Plus className="h-5 w-5 mr-2" />
                  Log Food
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Food</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>What did you eat?</Label>
                    <Input
                      placeholder="e.g., 2 eggs with toast"
                      value={foodForm.foodName}
                      onChange={(e) => setFoodForm({ ...foodForm, foodName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meal Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {MEAL_TYPES.map((meal) => (
                        <Button
                          key={meal.value}
                          type="button"
                          variant={foodForm.mealType === meal.value ? 'default' : 'outline'}
                          onClick={() => setFoodForm({ ...foodForm, mealType: meal.value })}
                          className="justify-start"
                        >
                          {meal.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Portion Size</Label>
                    <Input
                      placeholder="e.g., 1 bowl, 2 pieces"
                      value={foodForm.portionSize}
                      onChange={(e) => setFoodForm({ ...foodForm, portionSize: e.target.value })}
                    />
                  </div>
                  <Button onClick={logFood} disabled={loading} className="w-full bg-orange-600">
                    {loading ? 'Adding...' : 'Add Food'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              onClick={addWater}
              className="h-16 bg-blue-500 hover:bg-blue-600"
            >
              <Droplet className="h-5 w-5 mr-2" />
              Add Water ({waterConsumed}/{waterGoal})
            </Button>
          </div>

          {/* Water Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Droplet className="h-4 w-4 text-blue-500" />
                Water Intake
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1">
                {Array.from({ length: waterGoal }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-8 rounded ${i < waterConsumed ? 'bg-blue-500' : 'bg-blue-100'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {waterConsumed} of {waterGoal} glasses
              </p>
            </CardContent>
          </Card>

          {/* Today's Food Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Today's Food Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayLogs.length > 0 ? (
                <Tabs defaultValue="all">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="all">All</TabsTrigger>
                    {MEAL_TYPES.map((meal) => (
                      <TabsTrigger key={meal.value} value={meal.value}>
                        {meal.icon}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  <TabsContent value="all" className="space-y-2 mt-4">
                    {todayLogs.map((log) => (
                      <FoodLogItem key={log.id} log={log} onDelete={deleteLog} />
                    ))}
                  </TabsContent>
                  
                  {MEAL_TYPES.map((meal) => (
                    <TabsContent key={meal.value} value={meal.value} className="space-y-2 mt-4">
                      {todayLogs
                        .filter((log) => log.meal_type === meal.value)
                        .map((log) => (
                          <FoodLogItem key={log.id} log={log} onDelete={deleteLog} />
                        ))}
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Utensils className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No food logged today</p>
                  <p className="text-sm">Tap "Log Food" to start tracking</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

function FoodLogItem({ log, onDelete }: { log: NutritionLog; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
      <div className="flex-1">
        <p className="font-medium">{log.food_name}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Flame className="h-3 w-3" />
            {log.calories} kcal
          </span>
          <span>P: {log.protein_g}g</span>
          <span>C: {log.carbs_g}g</span>
          <span>F: {log.fat_g}g</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {log.meal_type}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(log.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
