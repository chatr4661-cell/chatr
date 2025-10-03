import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingBag, Search, ShoppingCart, Star } from 'lucide-react';

const Marketplace = () => {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);

  const products = [
    {
      id: 1,
      name: 'First Aid Kit',
      category: 'Medical Supplies',
      price: 29.99,
      rating: 4.8,
      reviews: 234,
      inStock: true,
      image: '🏥'
    },
    {
      id: 2,
      name: 'Digital Thermometer',
      category: 'Medical Devices',
      price: 19.99,
      rating: 4.5,
      reviews: 567,
      inStock: true,
      image: '🌡️'
    },
    {
      id: 3,
      name: 'Vitamin D Supplement',
      category: 'Supplements',
      price: 15.99,
      rating: 4.6,
      reviews: 892,
      inStock: true,
      image: '💊'
    },
    {
      id: 4,
      name: 'Blood Pressure Monitor',
      category: 'Medical Devices',
      price: 49.99,
      rating: 4.7,
      reviews: 432,
      inStock: true,
      image: '🩺'
    },
    {
      id: 5,
      name: 'Pain Relief Gel',
      category: 'Over-the-Counter',
      price: 12.99,
      rating: 4.4,
      reviews: 321,
      inStock: false,
      image: '🧴'
    },
    {
      id: 6,
      name: 'Face Masks (50 pack)',
      category: 'Protection',
      price: 24.99,
      rating: 4.9,
      reviews: 1203,
      inStock: true,
      image: '😷'
    }
  ];

  const addToCart = () => {
    setCartCount(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 pb-6">
      {/* Header */}
      <div className="p-4 border-b border-glass-border backdrop-blur-glass bg-gradient-glass sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Marketplace</h1>
            <p className="text-sm text-muted-foreground">Medicines and health products</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full relative"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-destructive">
                {cartCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 max-w-4xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for medicines, supplies..."
            className="pl-10 rounded-full bg-card/50 backdrop-blur-sm border-glass-border"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 max-w-4xl mx-auto mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['All', 'Medicines', 'Supplements', 'Medical Devices', 'First Aid'].map((category) => (
            <Button
              key={category}
              variant={category === 'All' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="px-4 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="backdrop-blur-glass bg-gradient-glass border-glass-border shadow-card hover:shadow-elevated transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="text-5xl">{product.image}</div>
                  {!product.inStock && (
                    <Badge variant="secondary">Out of Stock</Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <CardDescription className="text-xs">{product.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      <span className="text-sm font-medium">{product.rating}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      ({product.reviews} reviews)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      ${product.price}
                    </span>
                    <Button
                      size="sm"
                      disabled={!product.inStock}
                      onClick={addToCart}
                      className="shadow-glow"
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
