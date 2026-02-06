import { VisualizationBuilder } from '@/components/VisualizationBuilder';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Heatmap() {
  return (
    <ScrollArea className="w-full h-full">
      <div className="max-w-6xl mx-auto p-6 md:p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Heatmap Builder</h1>
          <p className="text-lg text-gray-600">
            Build a heatmap by selecting two different dimensions and a metric to visualize patterns in your data.
          </p>
        </div>

        {/* Main Content */}
        <VisualizationBuilder initialChartType="heatmap" showChartTypeToggle={false} />
      </div>
    </ScrollArea>
  );
}
