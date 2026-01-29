import { Navbar01 } from "./components/navbar"
import { Route, Routes } from 'react-router-dom';

import { Footer } from "./components/Footer"
import { Home } from "./pages/Home"

import {NotFound} from "./pages/NotFound"
import { Experiments } from "./pages/Experiments";
import { About } from "./pages/About";
import { Query } from "./pages/Query";
import { Filter } from "./pages/FilterQuery";
import { Inventory } from "./pages/InventoryQuery";

<Route path="*" element={<NotFound />} />

function App() {
  return (
    <div className="flex flex-col min-h-screen">

      <title>RatBat 2</title>
      <Navbar01 />

      <main className="flex-grow min-h-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/query" element={<Query />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="/about" element={<About />} />
          <Route path="/filter" element={<Filter />} />
          <Route path="/inventory" element={<Inventory />}/>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />

    </div>
  )
}

export default App