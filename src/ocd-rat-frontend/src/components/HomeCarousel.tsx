import * as React from "react"

import { Card, CardContent } from "@/components/ui/card"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"

import Autoplay from 'embla-carousel-autoplay';


import RatIcon from "@/assets/rat-icon.png"
import NaturalLanguage from "@/assets/use-cases/natural-language-icon.png"
import Visualize from "@/assets/use-cases/visualize.png"
import Database from "@/assets/use-cases/database.png"
import Api from "@/assets/use-cases/api.png"
import Pipeline from "@/assets/use-cases/pipeline.png"
import { useRef } from "react";

const useCases = [
    {
        id: 1,
        title: 'Behavioural Dataset Access',
        desc: 'Query, filter, and download subsets of the nearly 20,000 trials of rat behavioural data.   ',
        imageUrl: Database
    },
    {
        id: 2,
        title: 'Data Visualization & Analysis',
        desc: 'Create data visualizations for trajectories and behavioural metrics. Process trial data into meaningful neuroscience experiments. ',
        imageUrl: Visualize
    },
    {
        id: 3,
        title: 'Natural Language',
        desc: 'Derive meaningful data insights with no database knwowledge. Ask Questions like “find sessions where rats showed compulsive patterns”  ',
        imageUrl: NaturalLanguage
    },
    {
        id: 4,
        title: 'Experiment Playback',
        desc: 'View behavioural trajectories through synchronized playback.  ',
        imageUrl: RatIcon
    },
    {
        id: 5,
        title: 'Data Processing Pipeline',
        desc: 'Use developed Python tools for pattern analysis, behaviour recognition, and leverage predefined workflows for common tasks.  ',
        imageUrl: Pipeline
    },
    {
        id: 6,
        title: 'Researcher & Database API',
        desc: 'Interface with a robust REST API for managing and querying dataset.',
        imageUrl: Api
    }



]


export function HomeCarousel() {

    const autoplay = useRef(
        Autoplay({ delay: 3000, stopOnInteraction: false })
    )
    return (
        <Carousel
            opts={{
                align: "start",
                loop: true,
            }}
            plugins={[
                Autoplay({
                    delay: 3000,
                }),
            ]}
            className="w-full mx-30 py-10"
        >
            <CarouselContent className="flex items-stretch">
                {useCases.map((useCase) => (
                    <CarouselItem key={useCase.id} className="md:basis-1/3 lg:basis-1/4 flex">
                        <div className="p-1 w-full flex">
                            <Card className="flex flex-col w-full">
                                <CardContent className="flex flex-col justify-between flex-1 p-6">
                                    <img
                                        src={useCase.imageUrl}
                                        className="w-40 object-contain mb-4 mx-auto"
                                        alt={useCase.title}
                                    />
                                    <div>
                                        <h3 className="text-xl font-semibold">{useCase.title}</h3>
                                        <p className="mt-2 text-sm text-muted-foreground line-clamp-5">
                                            {useCase.desc}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>

            <CarouselPrevious />
            <CarouselNext />
        </Carousel>
    )
}
