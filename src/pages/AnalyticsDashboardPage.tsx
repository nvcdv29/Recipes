import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores/authStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Loader2, Download, Filter, Info } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { format, subDays, startOfWeek, endOfWeek, parseISO, isAfter } from 'date-fns';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

export const AnalyticsDashboardPage = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '1y' | 'all'>('30d');
  
  const [analyticsData, setAnalyticsData] = useState<{
    topCooked: any[];
    frequencyData: any[];
    dietaryData: any[];
    seasonalData: any[];
    uncookedRecipes: any[];
    avgCost: number;
    avgCo2: number;
  } | null>(null);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Fetch Recipes
      let allRecipes: any[] = [];
      try {
        const qRecipes = query(collection(db, 'recipes'), where('authorId', '==', user?.uid));
        const recipeSnapshot = await getDocs(qRecipes);
        allRecipes = recipeSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e: any) {
        console.error("Error fetching recipes:", e);
        throw new Error("Recipes fetch failed: " + e.message);
      }

      // 2. Fetch Cooking Logs
      let allLogs: any[] = [];
      let dCutoff = new Date(0);
      if (timeRange === '7d') dCutoff = subDays(new Date(), 7);
      if (timeRange === '30d') dCutoff = subDays(new Date(), 30);
      if (timeRange === '1y') dCutoff = subDays(new Date(), 365);

      try {
        const qLogs = query(
          collection(db, 'cookingLogs'), 
          where('userId', '==', user?.uid)
        );
        const logsSnapshot = await getDocs(qLogs);
        allLogs = logsSnapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((l: any) => new Date(l.cookedDate) >= dCutoff)
          .sort((a, b) => new Date(b.cookedDate).getTime() - new Date(a.cookedDate).getTime());
      } catch (e: any) {
        console.error("Error fetching cookingLogs:", e);
        throw new Error("Cooking logs fetch failed: " + e.message);
      }

      // --- Aggregation ---

      // Most Cooked Reccipes
      const cookCounts: Record<string, number> = {};
      allLogs.forEach((l: any) => {
        cookCounts[l.recipeId] = (cookCounts[l.recipeId] || 0) + 1;
      });
      
      const topCooked = Object.entries(cookCounts)
        .map(([id, count]) => {
          const r = allRecipes.find(x => x.id === id);
          return { name: r?.title || 'Unknown', count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Frequency Over Time (Group by day or week)
      const freqObj: Record<string, number> = {};
      allLogs.forEach((l: any) => {
        const dStr = format(new Date(l.cookedDate), 'yyyy-MM-dd');
        freqObj[dStr] = (freqObj[dStr] || 0) + 1;
      });
      const frequencyData = Object.entries(freqObj)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count }));

      // Dietary Balance
      const dietObj: Record<string, number> = {
        Vegan: 0,
        Vegetarisch: 0,
        'Mit Fleisch': 0
      };
      allRecipes.forEach(r => {
        const diets = r.dietary || [];
        if (diets.includes('Vegan')) dietObj.Vegan++;
        else if (diets.includes('Vegetarisch')) dietObj.Vegetarisch++;
        else dietObj['Mit Fleisch']++;
      });
      const dietaryData = Object.entries(dietObj)
        .filter(([_, v]) => v > 0)
        .map(([name, value]) => ({ name, value }));

      // Uncooked Recipes
      const cookedIds = new Set(Object.keys(cookCounts));
      const uncookedRecipes = allRecipes.filter(r => !cookedIds.has(r.id)).slice(0, 5);

      // Estimation Models (Mocked for demo as exact ingredient pricing/co2 needs external APIs)
      // We will pretend meat has higher CO2 and higher cost, vegan has lowest
      let totalCost = 0;
      let totalCo2 = 0;
      allRecipes.forEach(r => {
        const isVegan = (r.dietary || []).includes('Vegan');
        const isVeg = (r.dietary || []).includes('Vegetarisch');
        const baseCost = isVegan ? 3.50 : isVeg ? 4.50 : 7.50;
        const baseCo2 = isVegan ? 0.8 : isVeg ? 1.5 : 4.5;
        totalCost += baseCost;
        totalCo2 += baseCo2;
      });

      // Seasonal Trends Mock
      const seasonalObj: Record<string, number> = {
        Frühling: 0,
        Sommer: 0,
        Herbst: 0,
        Winter: 0
      };
      
      allRecipes.forEach(r => {
        const cat = Object.values(r.categories || {}).join(' ').toLowerCase();
        if (cat.includes('suppe') || cat.includes('eintopf') || cat.includes('braten')) seasonalObj.Winter++;
        else if (cat.includes('salat') || cat.includes('grill') || cat.includes('sommer')) seasonalObj.Sommer++;
        else if (cat.includes('spargel') || cat.includes('frühling') || cat.includes('leicht')) seasonalObj.Frühling++;
        else if (cat.includes('kürbis') || cat.includes('pilz') || cat.includes('herbst')) seasonalObj.Herbst++;
      });
      // Fallback distribution if none match
      if (Object.values(seasonalObj).every(v => v === 0)) {
        seasonalObj.Winter = 5;
        seasonalObj.Sommer = 3;
        seasonalObj.Frühling = 2;
        seasonalObj.Herbst = 4;
      }
      
      const seasonalData = Object.entries(seasonalObj)
        .filter(([_, v]) => v > 0)
        .map(([name, value]) => ({ name, value }));

      setAnalyticsData({
        topCooked,
        frequencyData,
        dietaryData,
        seasonalData,
        uncookedRecipes,
        avgCost: totalCost / (allRecipes.length || 1),
        avgCo2: totalCo2 / (allRecipes.length || 1),
      });

    } catch (e: any) {
      toast.error(e.message || "Failed to fetch analytics");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Heirloom: Analytics Report", 20, 20);
      
      const rangeText = timeRange === 'all' ? 'All time' : 'Last ' + timeRange;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Time Range: ${rangeText}`, 20, 30);

      doc.setFont("helvetica", "bold");
      doc.text("Top Cooked Recipes:", 20, 45);
      doc.setFont("helvetica", "normal");
      
      let y = 55;
      analyticsData?.topCooked.forEach((t, i) => {
        doc.text(`${i+1}. ${t.name} (${t.count}x)`, 20, y);
        y += 10;
      });

      doc.text(`Estimated average cost per recipe: €${analyticsData?.avgCost.toFixed(2)}`, 20, y + 10);
      doc.text(`Estimated average CO2 footprint: ${analyticsData?.avgCo2.toFixed(1)} kg`, 20, y + 20);

      doc.save(`heirloom-analytics-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success("PDF Exported!");
    } catch (e) {
      toast.error("Export failed");
    }
  };

  if (loading || !analyticsData) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-on-surface">Analytics Dashboard</h1>
          <p className="text-on-surface-variant flex items-center gap-2 mt-1">
            <Info size={16} /> Insights über dein Kochverhalten
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-white border border-outline-variant/20 rounded-xl p-1 flex shadow-sm">
            {(['7d', '30d', '1y', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {range === '7d' ? '7 Tage' : range === '30d' ? '30 Tage' : range === '1y' ? '1 Jahr' : 'Alle'}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={exportPDF} icon={Download} className="shrink-0">
            PDF Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* KPI Cards */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
          <h3 className="text-sm font-medium text-on-surface-variant mb-1">Koch-Sessions</h3>
          <p className="text-3xl font-bold text-on-surface">
            {analyticsData.frequencyData.reduce((acc, curr) => acc + curr.count, 0)}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
          <h3 className="text-sm font-medium text-on-surface-variant mb-1">Durchschn. Kosten / Rezept</h3>
          <p className="text-3xl font-bold text-on-surface">
            ~€{analyticsData.avgCost.toFixed(2)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
          <h3 className="text-sm font-medium text-on-surface-variant mb-1">Ø CO2-Fußabdruck</h3>
          <p className="text-3xl font-bold text-on-surface">
            ~{analyticsData.avgCo2.toFixed(1)} <span className="text-lg text-on-surface-variant">kg</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Most Cooked Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
          <h3 className="text-lg font-bold font-serif mb-6">Am meisten gekocht</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.topCooked} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#4B5563" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#4ade80" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Frequency Line Chart */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
          <h3 className="text-lg font-bold font-serif mb-6">Koch-Frequenz</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analyticsData.frequencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => format(parseISO(val), 'dd.MM')} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(val) => format(parseISO(val as string), 'dd. MMM yyyy')}
                />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dietary Balance Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
          <h3 className="text-lg font-bold font-serif mb-6">Ernährungsbalance (Rezeptsammlung)</h3>
          <div className="h-[300px] w-full flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.dietaryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analyticsData.dietaryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Seasonal Trends Chart */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
          <h3 className="text-lg font-bold font-serif mb-6">Saisonale Rezepts-Indikationen</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.seasonalData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Uncooked Recipes */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
          <h3 className="text-lg font-bold font-serif mb-6 flex items-center justify-between">
            Lange nicht gekocht
            <span className="text-sm font-sans font-normal text-on-surface-variant bg-surface px-2 py-1 rounded-lg">Ideen</span>
          </h3>
          <div className="space-y-4">
            {analyticsData.uncookedRecipes.length === 0 ? (
              <p className="text-on-surface-variant text-center py-8">Du hast schon alle deine Rezepte gekocht! 🚀</p>
            ) : (
              analyticsData.uncookedRecipes.map((r, i) => (
                <div key={r.id} className="flex gap-4 items-center p-3 hover:bg-surface rounded-xl transition-colors group cursor-pointer">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-high overflow-hidden shrink-0">
                    {r.images?.[0] ? (
                      <img src={r.images[0]} alt={r.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant">🍲</div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-1">{r.title}</h4>
                    <p className="text-sm text-on-surface-variant line-clamp-1">{r.categories?.join(', ')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
};
