import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Copy, Download } from "lucide-react"

export function FrequentlyAskedQuestions() {
  return (
    <Accordion
      type="multiple"
      className="w-full"
      defaultValue={[]}
    >
      <AccordionItem value="item-1">
        <AccordionTrigger>What is the purpose of this platform? </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>
            The platform's main goal is to make the animal behavioural dataset accessible to the global research community. It achieve this by providing a user friendly interface to search, filter, and analyze specific subsets of the dataset.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Who can use this?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>
            The tool is designed for students and researchers alike. Experienced users may leverage fine-grained data manipulation tools for deriving insights. For beginners and learners, natural language can be used as a tool to interact with the data without full domain knowledge.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>What type of data does InfraRAT host?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">


          <div className="mt-1 ">
            <p>
              InfraRAT provides access to a dataset of nearly 20,000 trials in rat locomoation. This includes:
            </p>

            <ul className="list-disc ml-6 mt-1">
              <li>Videos of Rat Activity.</li>
              <li>Time Series data of x,y,t coordinates.</li>
              <li>Path plots of locomotion trajecotories.</li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-4">
        <AccordionTrigger>How can I search for specific subsets of data?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>
            These are specifics that are yet to be resolved by project development. TBD.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-5">
        <AccordionTrigger className="flex w-full justify-between">Can I download results from this platform?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>
            You are free to download results derived from this platform for your own use. Tables, Figures, and Query Results can be copied using the <span className="inline-flex items-center justify-center mx-1"> <Copy size={14} /> </span> button and downloaded using the <span className="inline-flex items-center justify-center  mx-1"> <Download size={14} /> </span> button.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
