import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import ChartImg from "@/assets/dataset-sample-capstone.jpeg";
import { Link } from 'react-router-dom';

export function Visualizations() {
  const visualizations = [
    {
      img: ChartImg,
      title: 'Bar Chart',
      desc: 'Categorical comparisons using configurable X and Y axes.',
      href: '/visualizations/bar-chart'
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
              <img src={viz.img} className="w-36 object-contain mb-4 mx-auto" alt={viz.title} />
              <div className="flex flex-col items-start">
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
