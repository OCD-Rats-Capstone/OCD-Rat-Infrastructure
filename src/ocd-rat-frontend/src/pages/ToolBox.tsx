import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import ChartImg from "@/assets/barchart.png";
import LineChartImg from "@/assets/linechart.png";
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '@/config';
import { useState, useEffect } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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

export function ToolBox() {
  const [sessionId, setSessionId] = useState("");
  const [datapoints, setDataPoints] = useState<Record<string, unknown>[] | null>(null);
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
  ];

    const select_analysis = async (session_id: string) => {
      try {
  
        const params = {
          session_id: session_id
        };
  
        const baseUrl = (API_BASE_URL.replace(/\/$/, ''));
        const searchParams = new URLSearchParams(params).toString();
        const url = `${baseUrl}/toolbox/session/?${searchParams}`;
  
        const response = await fetch(url);
        const resData = await response.json();
        console.log(resData)
        setDataPoints(resData["data"])

      } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
      }
    }

  return (
    <div className="flex flex-col justify-center items-center py-20 px-6 lg:px-40">

      <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
        Analysis ToolBox
      </h1>

      <p className="text-muted-foreground text-xl mt-6 text-center max-w-2xl">
        Select a Rat Session and View Analytical Insights on its Behaviour
      </p>

      <Separator className="my-10 w-full" />

      <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
        <input
          type="text"
          placeholder="Enter Session ID"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="border rounded-md px-4 py-2 w-64"
        />

        <Button
          onClick={() => select_analysis(sessionId)}
          disabled={!sessionId.trim()}
        >
          Load Session
        </Button>
      </div>

      {datapoints != null && (
                  <Card className="p-4 mt-4">
                    <h3 className="font-semibold mb-3">Data Points ({datapoints.length})</h3>
                    <ScrollArea className="h-[300px] w-full rounded border">
                      <ScrollBar orientation='horizontal'/>
                      <table className="w-max text-sm border-collapse">
                        <thead>
                          <tr className="bg-muted sticky top-0">
                            {datapoints.length > 0 && Object.keys(datapoints[0]).map((k) => (
                              <th key={k} className="text-left py-2 px-3 font-medium">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {datapoints.map((row, i) => (
                            <tr key={i} className="border-b">
                              {Object.values(row).map((v, j) => (
                                <td key={j} className="py-1.5 px-3">{String(v ?? '')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </Card>
                )}

    </div>
  );
}