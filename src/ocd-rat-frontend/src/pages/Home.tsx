import { ArrowRight } from "lucide-react";
import { HomeCarousel } from "../components/HomeCarousel";
import { TableDemo } from "../components/HomeTable";
import { Card } from "../components/ui/card";
import { Separator } from "../components/ui/separator";


import SampleTrial from '@/assets/sample_trial.webp'
import DatasetSample from '@/assets/dataset-sample-capstone.jpeg'
import NaturalLanguage from "@/assets/use-cases/natural-language-icon.png"
import Temporal from "@/assets/sample-trial-temporal.png"

export function Home() {

    return (
        <div className="flex flex-col justify-center items-center py-20 px-15 lg:px-40">

            <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
                The Data Analysis Tool for Animal Models of OCD.
            </h1>

            <p className="text-muted-foreground text-xl m-6">
                A unified platform for access to 20,000+ trials in Animal Behavioural Models of Obsessive-Compulsive Disorder.
            </p>


            <HomeCarousel></HomeCarousel>


            <Separator className="my-5" />



            <h1 className="scroll-m-10 text-center text-3xl font-bold tracking-tight text-balance p-10">
                Go From Trials to Insights.
            </h1>


            <div className="flex justify-center items-center flex-row">
                <div className="flex flex-col items-center mx-4">
                    <img src={SampleTrial} className="h-90 rounded-lg object-cover" alt="" />
                    <p className="mt-5 text-center text-gray-600 ">Video Trial </p>
                </div>
                <ArrowRight className="m-5 h-10 w-10" />
                <div className="flex flex-col items-center mx-4">
                    <Card>
                        <img src={DatasetSample} className="h-80 object-contain rounded-lg p-10" alt="" />

                    </Card>

                    <p className="mt-5 text-center text-gray-600 ">Temporal Data  </p>
                </div>

            </div>


            <Separator className="my-5 mt-20" />

            <h1 className="scroll-m-10 text-center text-3xl font-bold tracking-tight text-balance p-10">
                Leverage Natural Language.
            </h1>


            <div className="flex  justify-center items-center">
                <img src={NaturalLanguage} className="w-15 m-5" alt="" />

                <blockquote className=" border-l-2 pl-6 italic">
                    &quot;Show me trials with strong compulsive patterns.&quot;
                </blockquote>

            </div>

            <Card className="p-5 lg:w-200 max-width-3/4 m-5">
                <TableDemo></TableDemo>
            </Card>


            <div className="flex  justify-center items-center mt-20">
                <img src={NaturalLanguage} className="w-15 m-5" alt="" />

                <blockquote className=" border-l-2 pl-6 italic">
                    &quot;Show me the (x,y,t) data from trial Q23U693032_10_5
                    0074 0002934 &quot;
                </blockquote>


            </div>

            <Card className="p-2 m-5">
                <img src={Temporal} className="w-70 m-5" alt="" />

            </Card>

        </div>);

}
