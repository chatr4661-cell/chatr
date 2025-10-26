import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, TrendingUp, Eye, MousePointerClick } from 'lucide-react';

export default function BrandPartnerships() {
  const [brands, setBrands] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBrands();
    loadStats();
  }, []);

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brand_partnerships')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBrands(data || []);
    } catch (error: any) {
      toast.error('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('brand_impressions')
        .select('impression_type, brand_id')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const statsMap: any = {};
      data?.forEach((imp) => {
        if (!statsMap[imp.brand_id]) {
          statsMap[imp.brand_id] = { views: 0, interactions: 0 };
        }
        if (imp.impression_type === 'view') statsMap[imp.brand_id].views++;
        if (imp.impression_type === 'interaction') statsMap[imp.brand_id].interactions++;
      });

      setStats(statsMap);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Brand Partnerships</h1>
          <p className="text-muted-foreground">Manage dynamic in-video branding</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Brand
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brands.filter((b: any) => b.status === 'active').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Impressions (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(Object.values(stats) as any[]).reduce((acc: number, s: any) => acc + s.views, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Interactions (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(Object.values(stats) as any[]).reduce((acc: number, s: any) => acc + s.interactions, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {brands.map((brand) => {
          const brandStats = stats[brand.id] || { views: 0, interactions: 0 };
          
          return (
            <Card key={brand.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      {brand.brand_logo_url && (
                        <img src={brand.brand_logo_url} alt={brand.brand_name} className="w-10 h-10 rounded" />
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{brand.brand_name}</h3>
                        <p className="text-sm text-muted-foreground">{brand.contact_email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm mt-4">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <span>{brandStats.views} views</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MousePointerClick className="w-4 h-4 text-muted-foreground" />
                        <span>{brandStats.interactions} interactions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <span>{((brandStats.interactions / (brandStats.views || 1)) * 100).toFixed(1)}% CTR</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-2">
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      brand.status === 'active' ? 'bg-green-500/20 text-green-700' :
                      brand.status === 'paused' ? 'bg-yellow-500/20 text-yellow-700' :
                      'bg-gray-500/20 text-gray-700'
                    }`}>
                      {brand.status}
                    </div>
                    <div className="text-sm">
                      <div className="text-muted-foreground">Budget Remaining</div>
                      <div className="font-semibold">{brand.budget_remaining} coins</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
