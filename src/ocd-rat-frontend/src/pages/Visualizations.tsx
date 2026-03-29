import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import ChartImg from "@/assets/barchart.png";
import LineChartImg from "@/assets/linechart.png";
import MultiGraphImg from "@/assets/multigraph.png";
import { Link } from 'react-router-dom';

// Simple SVG heatmap icon
const HeatmapSvg = () => (
  <svg width="144" height="144" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
    <rect x="20" y="20" width="20" height="20" fill="#e0f2fe" stroke="#ccc" strokeWidth="1"/>
    <rect x="45" y="20" width="20" height="20" fill="#7dd3fc" stroke="#ccc" strokeWidth="1"/>
    <rect x="70" y="20" width="20" height="20" fill="#38bdf8" stroke="#ccc" strokeWidth="1"/>
    <rect x="95" y="20" width="20" height="20" fill="#0284c7" stroke="#ccc" strokeWidth="1"/>
    
    <rect x="20" y="45" width="20" height="20" fill="#7dd3fc" stroke="#ccc" strokeWidth="1"/>
    <rect x="45" y="45" width="20" height="20" fill="#38bdf8" stroke="#ccc" strokeWidth="1"/>
    <rect x="70" y="45" width="20" height="20" fill="#0284c7" stroke="#ccc" strokeWidth="1"/>
    <rect x="95" y="45" width="20" height="20" fill="#0c63e4" stroke="#ccc" strokeWidth="1"/>
    
    <rect x="20" y="70" width="20" height="20" fill="#38bdf8" stroke="#ccc" strokeWidth="1"/>
    <rect x="45" y="70" width="20" height="20" fill="#0284c7" stroke="#ccc" strokeWidth="1"/>
    <rect x="70" y="70" width="20" height="20" fill="#0c63e4" stroke="#ccc" strokeWidth="1"/>
    <rect x="95" y="70" width="20" height="20" fill="#0d47a1" stroke="#ccc" strokeWidth="1"/>
    
    <rect x="20" y="95" width="20" height="20" fill="#0284c7" stroke="#ccc" strokeWidth="1"/>
    <rect x="45" y="95" width="20" height="20" fill="#0c63e4" stroke="#ccc" strokeWidth="1"/>
    <rect x="70" y="95" width="20" height="20" fill="#0d47a1" stroke="#ccc" strokeWidth="1"/>
    <rect x="95" y="95" width="20" height="20" fill="#051c4d" stroke="#ccc" strokeWidth="1"/>
  </svg>
);

// Velocity profile icon: fan of lines on left and right of a centre axis
const VelocityProfileSvg = () => (
  <svg width="144" height="144" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
    {/* Background */}
    <rect x="12" y="20" width="120" height="100" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
    {/* Centre dashed line (frame 0) */}
    <line x1="72" y1="22" x2="72" y2="118" stroke="#374151" strokeWidth="1.5" strokeDasharray="3,2"/>
    {/* Entering segments (left, negative frames) — vary colour light→dark */}
    <polyline points="72,90 62,72 52,55 42,48 30,44" fill="none" stroke="#dbeafe" strokeWidth="1.2" strokeOpacity="0.9"/>
    <polyline points="72,85 62,68 52,52 42,47 30,46" fill="none" stroke="#93c5fd" strokeWidth="1.2" strokeOpacity="0.9"/>
    <polyline points="72,80 62,63 52,49 42,46 30,50" fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeOpacity="0.9"/>
    <polyline points="72,75 60,58 50,48 40,50 28,56" fill="none" stroke="#1d4ed8" strokeWidth="1.2" strokeOpacity="0.9"/>
    <polyline points="72,70 60,53 50,46 40,52 28,60" fill="none" stroke="#1e3a8a" strokeWidth="1.2" strokeOpacity="0.9"/>
    {/* Exiting segments (right, positive frames) */}
    <polyline points="72,90 82,72 92,55 102,48 114,44" fill="none" stroke="#dbeafe" strokeWidth="1.2" strokeOpacity="0.9"/>
    <polyline points="72,85 82,68 92,52 102,47 114,46" fill="none" stroke="#93c5fd" strokeWidth="1.2" strokeOpacity="0.9"/>
    <polyline points="72,80 82,63 92,49 102,46 114,50" fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeOpacity="0.9"/>
    <polyline points="72,75 84,58 94,48 104,50 116,56" fill="none" stroke="#1d4ed8" strokeWidth="1.2" strokeOpacity="0.9"/>
    <polyline points="72,70 84,53 94,46 104,52 116,60" fill="none" stroke="#1e3a8a" strokeWidth="1.2" strokeOpacity="0.9"/>
    {/* X axis */}
    <line x1="12" y1="118" x2="132" y2="118" stroke="#374151" strokeWidth="1"/>
    {/* Y axis */}
    <line x1="12" y1="20" x2="12" y2="118" stroke="#374151" strokeWidth="1"/>
  </svg>
);

// Simple SVG spatial heatmap icon
const SpatialHeatmapSvg = () => (
  <svg width="144" height="144" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
    <rect x="20" y="20" width="104" height="104" fill="#f8f9fa" stroke="#ccc" strokeWidth="2"/>
    {/* Grid lines */}
    <line x1="52" y1="20" x2="52" y2="124" stroke="#ddd" strokeWidth="1"/>
    <line x1="84" y1="20" x2="84" y2="124" stroke="#ddd" strokeWidth="1"/>
    <line x1="20" y1="52" x2="124" y2="52" stroke="#ddd" strokeWidth="1"/>
    <line x1="20" y1="84" x2="124" y2="84" stroke="#ddd" strokeWidth="1"/>
    
    {/* Heat spots */}
    <circle cx="36" cy="36" r="8" fill="#ff6b6b" opacity="0.8"/>
    <circle cx="68" cy="36" r="6" fill="#ff8e53" opacity="0.7"/>
    <circle cx="100" cy="36" r="4" fill="#ffd23f" opacity="0.6"/>
    
    <circle cx="36" cy="68" r="6" fill="#ff8e53" opacity="0.7"/>
    <circle cx="68" cy="68" r="10" fill="#ff4444" opacity="0.9"/>
    <circle cx="100" cy="68" r="5" fill="#ffa500" opacity="0.7"/>
    
    <circle cx="36" cy="100" r="4" fill="#ffd23f" opacity="0.6"/>
    <circle cx="68" cy="100" r="7" fill="#ff6b6b" opacity="0.8"/>
    <circle cx="100" cy="100" r="3" fill="#ffff00" opacity="0.5"/>
    
    {/* Rat trajectory dots */}
    <circle cx="30" cy="30" r="2" fill="#333"/>
    <circle cx="35" cy="32" r="2" fill="#333"/>
    <circle cx="40" cy="35" r="2" fill="#333"/>
    <circle cx="62" cy="65" r="2" fill="#333"/>
    <circle cx="65" cy="68" r="2" fill="#333"/>
    <circle cx="68" cy="70" r="2" fill="#333"/>
  </svg>
);

export function Visualizations() {
  const visualizations = [
    {
      img: ChartImg,
      title: 'Bar Chart',
      desc: 'Categorical comparisons using configurable X and Y axes.',
      href: '/visualizations/bar-chart'
    },
    {
      img: LineChartImg,
      title: 'Line Chart',
      desc: 'Time-series trends showing how metrics change over time.',
      href: '/visualizations/line-chart'
    },
    {
      img: null,
      title: 'Heatmap',
      desc: '2D categorical patterns revealing relationships between two dimensions.',
      href: '/visualizations/heatmap',
      svgIcon: true
    },
    {
      img: null,
      title: 'Spatial Heatmap',
      desc: 'Rat trajectory heatmaps showing spatial patterns in movement data.',
      href: '/visualizations/spatial-heatmap',
      svgIcon: true,
      spatialIcon: true
    },
    {
      img: null,
      title: 'Velocity Profile',
      desc: 'Per-session velocity profiles for trips entering and exiting a user-defined location, coloured by temporal order.',
      href: '/visualizations/velocity-profile',
      svgIcon: true,
      velocityIcon: true
    },
    {
      img: MultiGraphImg,
      title: 'Query Visualizations',
      desc: 'Sample visualizations from user NLP queries.',
      href: '/visualizations/graph-query-dashboard'
    },
  ];

  return (
    <div className="flex flex-col justify-center items-center py-20 px-6 lg:px-40">

      <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
        Data Visualizations
      </h1>

      <p className="text-muted-foreground text-xl mt-6 text-center max-w-2xl">
        Choose a visualization type below. Select a tile to open the builder for that chart.
      </p>

      <Separator className="my-10 w-full" />

      <div className="flex flex-row flex-wrap justify-center gap-10">
        {visualizations.map((viz) => (
          <Card key={viz.title} className="flex flex-col items-center w-full max-w-[18rem]">
            <CardContent className="flex flex-col justify-between flex-1 p-6 pt-0 pb-0">
              {viz.svgIcon ? (
                viz.spatialIcon ? <SpatialHeatmapSvg /> : viz.velocityIcon ? <VelocityProfileSvg /> : <HeatmapSvg />
              ) : (
                viz.img && <img src={viz.img} className="w-36 object-contain mb-4 mx-auto" alt={viz.title} />
              )}
              <div className="flex flex-col items-start mt-4">
                <h3 className="text-xl font-semibold">{viz.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-5">{viz.desc}</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end pt-0 pb-0">
              <Link to={viz.href} className="flex items-center gap-2">
                <p className="px-3 text-xs">Open</p>
                <Button variant="outline" size="icon" className="rounded-full bg-black">
                  <ArrowRight color="white" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

    </div>
  );
}
