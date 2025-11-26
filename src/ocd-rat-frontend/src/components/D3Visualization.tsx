import * as d3 from "d3";
import { useRef, useEffect } from "react";

interface Props {
    data: any[];
    selectedId?: string;
}

export function D3Visualization({ data, selectedId }: Props) {
    const ref = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!data || data.length === 0) return;

        const svg = d3.select(ref.current);
        svg.selectAll("*").remove();

        const width = 600;
        const height = 350;

        svg.attr("width", width).attr("height", height);

        // pick first numeric column
        const numericColumns = Object.keys(data[0]).filter(
            (k) => typeof data[0][k] === "number"
        );
        if (numericColumns.length === 0) return;

        const field = numericColumns[0];

        const x = d3.scaleBand()
            .domain(data.map((_, i) => i.toString()))
            .range([0, width])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, (d) => d[field]) || 0])
            .range([height, 0]);

        svg
            .selectAll("rect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", (_, i) => x(i.toString())!)
            .attr("y", (d) => y(d[field]))
            .attr("width", x.bandwidth())
            .attr("height", (d) => height - y(d[field]))
            .attr("fill", "#3b82f6");
    }, [data, selectedId]);

    return <svg ref={ref}></svg>;
}
