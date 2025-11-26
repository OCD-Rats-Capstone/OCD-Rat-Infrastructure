import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';

// FINISH REPLACING TEMPORARY CARD IMAGES WITH APPROPRIATE VISUALIZATION TYPE IMAGES
import Drug from "@/assets/experiments/drug.png"
import Injection from "@/assets/experiments/injection.png"

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { JsonUpload } from "@/components/ui/json-upload";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


export function DataVisualization() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    const handleSelect = (id: string) => {
        setSelectedId(id);
        setShowModal(true);
    };

    return (
        <div className="flex flex-col justify-center items-center py-20 px-15 lg:px-40">
            <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
                Visualize Data
            </h1>

            <p className="text-muted-foreground text-xl mt-6">
                Choose a visualization method for your data below
            </p>

            <Separator className="m-15" />

            <div className="flex flex-row flex-wrap justify-center gap-10">
                {visualizations.map((viz) => (
                    <VisualizationCard
                        key={viz.id}
                        viz={viz}
                        isSelected={selectedId === viz.id}
                        onSelect={() => handleSelect(viz.id)}
                    />
                ))}
            </div>

            <VisualizationModal 
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                selectedId={selectedId}
            />

            <Separator className="m-15" />

            <h2 className="scroll-m-20 text-center text-2xl font-extrabold tracking-tight text-balance">
                Upload your Data
            </h2>

            <JsonUpload />

        </div>
    );
}

const VisualizationModal = ({ isOpen, onClose, selectedId }: {
    isOpen: boolean;
    onClose: () => void;
    selectedId: string | null;
}) => {

    const getVizTitle = () => {
        const v = visualizations.find(v => v.id === selectedId);
        return v?.title ?? "";
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{getVizTitle()}</DialogTitle>
                </DialogHeader>

                <div className="w-full">
                    {selectedId === 'drug' && <BrainLesionDrugViz />}
                    {selectedId === 'injection' && (
                        <div className="w-full h-96 border rounded-lg p-4 flex items-center justify-center">
                            <p className="text-muted-foreground">Injection Count visualization coming soon...</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Types for our data structure
type SessionData = {
  left_damage: number;
  right_damage: number;
  region: string;
  rat_id: string;
};

type DrugData = {
  drug_name: string;
  drug_abbreviation: string;
  sessions: SessionData[];
};

// Brain Lesion Drug Visualization Component
function BrainLesionDrugViz() {
  const [viewMode, setViewMode] = useState('grouped');
  const [selectedDrug, setSelectedDrug] = useState('all');
  const [data, setData] = useState<DrugData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:3001/api/brain-lesion-data');
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Handle the response structure from backend
        if (result.success && result.data) {
          if (result.data.length === 0) {
            setError('No data found in database. Please check if histology results are linked to active drugs.');
            setData(sampleData);
          } else {
            setData(result.data);
            setError(null);
            console.log(`✅ Loaded ${result.drug_count} drugs with ${result.total_sessions} sessions`);
          }
        } else {
          throw new Error(result.error || 'Invalid response format');
        }
      } catch (err: any) {
        console.error('❌ Error fetching data:', err);
        setError(err.message);
        // Fallback to sample data
        setData(sampleData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const sampleData: DrugData[] = [
    {
      drug_name: "Quinpirole",
      drug_abbreviation: "QNP",
      sessions: [
        { left_damage: 45, right_damage: 52, region: "Nucleus Accumbens", rat_id: "R001" },
        { left_damage: 38, right_damage: 41, region: "Nucleus Accumbens", rat_id: "R002" },
        { left_damage: 55, right_damage: 48, region: "Nucleus Accumbens", rat_id: "R003" },
      ]
    },
    {
      drug_name: "Amphetamine",
      drug_abbreviation: "AMPH",
      sessions: [
        { left_damage: 62, right_damage: 58, region: "Striatum", rat_id: "R004" },
        { left_damage: 71, right_damage: 68, region: "Striatum", rat_id: "R005" },
        { left_damage: 49, right_damage: 54, region: "Striatum", rat_id: "R006" },
      ]
    },
    {
      drug_name: "Saline",
      drug_abbreviation: "SAL",
      sessions: [
        { left_damage: 15, right_damage: 18, region: "Prefrontal Cortex", rat_id: "R007" },
        { left_damage: 22, right_damage: 20, region: "Prefrontal Cortex", rat_id: "R008" },
        { left_damage: 12, right_damage: 16, region: "Prefrontal Cortex", rat_id: "R009" },
      ]
    },
    {
      drug_name: "Haloperidol",
      drug_abbreviation: "HAL",
      sessions: [
        { left_damage: 35, right_damage: 42, region: "Basolateral Amygdala", rat_id: "R010" },
        { left_damage: 28, right_damage: 33, region: "Basolateral Amygdala", rat_id: "R011" },
        { left_damage: 41, right_damage: 38, region: "Basolateral Amygdala", rat_id: "R012" },
      ]
    },
  ];

  const aggregatedData = data.map((drug) => {
    const avgLeft = drug.sessions.reduce((sum, s) => sum + s.left_damage, 0) / drug.sessions.length;
    const avgRight = drug.sessions.reduce((sum, s) => sum + s.right_damage, 0) / drug.sessions.length;
    const asymmetry = Math.abs(avgLeft - avgRight);
    
    return {
      drug: drug.drug_abbreviation,
      fullName: drug.drug_name,
      leftDamage: parseFloat(avgLeft.toFixed(1)),
      rightDamage: parseFloat(avgRight.toFixed(1)),
      asymmetry: parseFloat(asymmetry.toFixed(1)),
      count: drug.sessions.length
    };
  });

  const scatterData = selectedDrug === 'all' 
    ? data.flatMap((drug) => 
        drug.sessions.map((s) => ({
          left: s.left_damage,
          right: s.right_damage,
          drug: drug.drug_abbreviation,
          rat: s.rat_id,
          region: s.region
        }))
      )
    : data
        .find((d) => d.drug_abbreviation === selectedDrug)
        ?.sessions.map((s) => ({
          left: s.left_damage,
          right: s.right_damage,
          drug: selectedDrug,
          rat: s.rat_id,
          region: s.region
        })) || [];

  const drugColors: Record<string, string> = {
    'QNP': '#3b82f6',
    'AMPH': '#ef4444',
    'SAL': '#10b981',
    'HAL': '#f59e0b'
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold">{data.fullName || data.drug}</p>
          {data.rat && <p className="text-sm text-gray-600">Rat: {data.rat}</p>}
          {data.region && <p className="text-sm text-gray-600">Region: {data.region}</p>}
          <p className="text-sm">Left Damage: <span className="font-semibold text-blue-600">{data.leftDamage || data.left}%</span></p>
          <p className="text-sm">Right Damage: <span className="font-semibold text-red-600">{data.rightDamage || data.right}%</span></p>
          {data.asymmetry && <p className="text-sm">Asymmetry: {data.asymmetry}%</p>}
          {data.count && <p className="text-sm text-gray-500">n = {data.count}</p>}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data from database...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">No data available</p>
          <p className="text-gray-500 text-sm mt-2">Check your database connection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-yellow-900 mb-1">
                Database Connection Issue
              </p>
              <p className="text-sm text-yellow-800 mb-2">{error}</p>
              <p className="text-xs text-yellow-700">
                Showing sample data. To see real data:
              </p>
              <ul className="text-xs text-yellow-700 list-disc list-inside mt-1">
                <li>Ensure PostgreSQL is running</li>
                <li>Start backend server: <code className="bg-yellow-100 px-1 rounded">node server.js</code></li>
                <li>Check database credentials in server.js</li>
                <li>Visit <a href="http://localhost:3001/api/test-connection" target="_blank" className="underline">http://localhost:3001/api/test-connection</a></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => setViewMode('grouped')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            viewMode === 'grouped' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Grouped View
        </button>
        <button
          onClick={() => setViewMode('scatter')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            viewMode === 'scatter' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Individual Sessions
        </button>
      </div>

      {viewMode === 'scatter' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Drug:
          </label>
          <select
            value={selectedDrug}
            onChange={(e) => setSelectedDrug(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Drugs</option>
            {data.map((drug) => (
              <option key={drug.drug_abbreviation} value={drug.drug_abbreviation}>
                {drug.drug_name} ({drug.drug_abbreviation})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-lg border p-4">
        {viewMode === 'grouped' ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={aggregatedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="drug" 
                label={{ value: 'Drug Treatment', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Damage (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="leftDamage" 
                fill="#3b82f6" 
                name="Left Hemisphere"
                radius={[8, 8, 0, 0]}
              />
              <Bar 
                dataKey="rightDamage" 
                fill="#ef4444" 
                name="Right Hemisphere"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 50, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                type="number" 
                dataKey="left" 
                name="Left Damage"
                label={{ value: 'Left Hemisphere Damage (%)', position: 'insideBottom', offset: -10 }}
                domain={[0, 100]}
              />
              <YAxis 
                type="number" 
                dataKey="right" 
                name="Right Damage"
                label={{ value: 'Right Hemisphere Damage (%)', angle: -90, position: 'insideLeft' }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {selectedDrug === 'all' ? (
                Object.keys(drugColors).map(drug => (
                  <Scatter
                    key={drug}
                    name={drug}
                    data={scatterData.filter((d) => d.drug === drug)}
                    fill={drugColors[drug]}
                  />
                ))
              ) : (
                <Scatter
                  name={selectedDrug}
                  data={scatterData}
                  fill={drugColors[selectedDrug] || '#6366f1'}
                />
              )}
              
              <Scatter
                name="Equal Damage Line"
                data={[{left: 0, right: 0}, {left: 100, right: 100}]}
                fill="none"
                line={{ stroke: '#9ca3af', strokeWidth: 2, strokeDasharray: '5 5' }}
                isAnimationActive={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {aggregatedData.map((drug) => (
          <div 
            key={drug.drug} 
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 transition-all bg-white"
          >
            <h3 className="font-semibold text-lg text-gray-700 mb-2">{drug.fullName}</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-blue-600 font-medium">Left:</span> {drug.leftDamage}%</p>
              <p><span className="text-red-600 font-medium">Right:</span> {drug.rightDamage}%</p>
              <p><span className="text-gray-600 font-medium">Asymmetry:</span> {drug.asymmetry}%</p>
              <p className="text-gray-500 text-xs">n = {drug.count} sessions</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


type VisualizationTemplate = {
  img: string;
  title: string;
  desc: string;
  id: string;
};

const visualizations: VisualizationTemplate[] = [
  { id: "drug", img: Drug, title: "Brain Lesion by Drug", desc: "Compare left vs right hemisphere damage across different drug treatments." },
  { id: "injection", img: Injection, title: "Injection Count", desc: "Evaluate trial outcome by injection count." },
];

type VisualizationCardProps = {
  viz: VisualizationTemplate;
  isSelected: boolean;
  onSelect: () => void;
};

const VisualizationCard = ({ viz, isSelected, onSelect }: VisualizationCardProps) => {
  return (
    <Card
      className={`flex flex-col items-center w-full max-w-[14rem] cursor-pointer border-2 transition-all ${
        isSelected ? "border-4 border-grey-700" : "border-transparent"
      }`}
    >
      <CardContent className="flex flex-col justify-between flex-1 p-6 pt-0 pb-0">
        <img src={viz.img} className="w-30 object-contain mb-4 mx-auto" alt={viz.title} />
        <div className="flex flex-col items-start">
          <h3 className="text-xl font-semibold">{viz.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-5">{viz.desc}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end pt-0 pb-0">
        <button 
            onClick={onSelect}
            className="px-3 py-1 text-xs rounded-md hover:bg-gray-100 transition"
        >
            Select
        </button>
      </CardFooter>
    </Card>
  );
};