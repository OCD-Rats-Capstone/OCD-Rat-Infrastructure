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
import { PathPlot } from "./PathPlot.tsx"

export function ToolBox() {

  interface Point {
  x: number;
  y: number;
}

  const [sessionId, setSessionId] = useState("");
  const [datapoints, setDataPoints] = useState<Record<string, unknown>[] | null>(null);
  const [distance, setDistance] = useState(null);
  const [PlotData, setPlotData] = useState<Point[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);

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
        setDistance(resData["distance"])
        setImageData(`data:${resData["imageType"]};base64,${resData["imageData"]}`);

        const pointsArray: Point[] = resData["data"].map((row: any) => ({
          x: row.X,
          y: row.Y,
        }));

        setPlotData(pointsArray)

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

      {datapoints != null && PlotData != null && (
        <div className="flex flex-col lg:flex-row gap-6 mt-6 w-full justify-center">
     
                  <Card className="p-4 mt-4">
                    <h3 className="font-semibold mb-3">Data Points ({datapoints.length})</h3>
                    <ScrollArea className="h-[500px] w-full rounded border">
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

                  <Card className="p-0 w-full lg:w-150 flex flex-col items-center justify-center h-150">
  <img
    src={imageData || ""}
    alt="Session Visualization"
    className="w-full h-full rounded-md object-cover"
  />
</Card>

<Card className="p-4">
        <PathPlot points={PlotData} />
      </Card>
    </div>
                )}
      {distance != null && (
  <div className="flex justify-center mt-8 w-full">
    <Card className="p-6 w-80 text-center shadow-md">
      <h3 className="text-sm uppercase tracking-wide text-muted-foreground">
        Distance Travelled
      </h3>
      <p className="text-4xl font-extrabold mt-2">
        {distance}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        centimeters
      </p>
    </Card>
  </div>
)}

    </div>

  );
}