import { Navbar01 } from "./components/navbar"
import { Route, Routes } from 'react-router-dom';

import { Footer } from "./components/Footer"
import { Home } from "./pages/Home"

import { NotFound} from "./pages/NotFound"
import { About } from "./pages/About";
import { Query } from "./pages/Query";
import { Visualizations } from "./pages/Visualizations";
import { BarChart } from "./pages/BarChart";
import { LineChart } from "./pages/LineChart";
import { Heatmap } from "./pages/Heatmap";
import { Inventory } from "./pages/InventoryQuery";
import { ToolBox } from "./pages/ToolBox"
import { SpatialHeatmap } from "./pages/SpatialHeatmap"
import { GraphQueryDashboard } from "./pages/GraphQueryDashboard";

<Route path="*" element={<NotFound />} />

function App() {
  return (
    <div className="flex flex-col min-h-screen">

      <title>InfraRAT</title>
      <Navbar01 />

      <main className="flex-grow flex flex-col min-h-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/query" element={<Query />} />
          <Route path="/visualizations" element={<Visualizations />} />
          <Route path="/visualizations/bar-chart" element={<BarChart />} />
          <Route path="/visualizations/graph-query-dashboard" element={<GraphQueryDashboard />} />
          <Route path="/visualizations/line-chart" element={<LineChart />} />
          <Route path="/visualizations/heatmap" element={<Heatmap />} />
          <Route path="/visualizations/spatial-heatmap" element={<SpatialHeatmap />} />
          <Route path="/about" element={<About />} />
          <Route path="/inventory" element={<Inventory />}/>
          <Route path = "/ToolBox" element={<ToolBox />}/>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />

    </div>
  )
}

export default App
