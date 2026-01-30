import { VisualizationBuilder } from '@/components/VisualizationBuilder';
import { ScrollArea } from '@/components/ui/scroll-area';

export function BarChart() {
  return (
    <ScrollArea className="w-full h-full">
      <div className="max-w-6xl mx-auto p-6 md:p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Bar Chart Builder</h1>
          <p className="text-lg text-gray-600">
            Build a bar chart by selecting an X-axis and a Y-axis.
          </p>
        </div>

        {/* Main Content */}
        <VisualizationBuilder />
      </div>
    </ScrollArea>
  );
}
