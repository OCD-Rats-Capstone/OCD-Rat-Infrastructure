import { useState } from 'react';

// FINISH REPLACING TEMPORARY CARD IMAGES WITH APPROPRIATE VISUALIZATION TYPE IMAGES
import Drug from "@/assets/experiments/drug.png"
import Injection from "@/assets/experiments/injection.png"

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { JsonUpload } from "@/components/ui/json-upload";

export function DataVisualization() {
    const [selectedId, setSelectedId] = useState<string | null>(null);

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
                        onSelect={() => setSelectedId(viz.id)}
                    />
                ))}
            </div>

            <Separator className="m-15" />

            <h2 className="scroll-m-20 text-center text-2xl font-extrabold tracking-tight text-balance">
                Upload your Data
            </h2>

            <JsonUpload />

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
  { id: "drug", img: Drug, title: "Drug Administered", desc: "Compare results across several different Drug IDs." },
  { id: "injection", img: Injection, title: "Injection Count", desc: "Evaluate trial outcome by injection count." },
];

type VisualizationCardProps = {
  viz: VisualizationTemplate;
  isSelected: boolean;
  onSelect: () => void;
};

// FINISH CARD FRONTEND
const VisualizationCard = ({ viz, isSelected, onSelect }: VisualizationCardProps) => {
  return (
    <Card
      onClick={onSelect}
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
        <p className="px-3 text-xs">Select</p>
      </CardFooter>
    </Card>
  );
};
