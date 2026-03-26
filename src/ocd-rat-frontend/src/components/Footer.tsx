import { ExternalLink } from "lucide-react";

const Footer = () => {
    return (
        <div className="relative w-full bg-slate-50 h-20 border-t-1 pb-20 pt-5 px-10">

            <div className="flex justify-between text-muted-foreground text-sm">

                <ol className="">
                    <li>InfraRAT v1.0</li>

                </ol>

                <p className="text-muted-foreground text-sm">SFWRENG 4G06 2025-2026</p>
                <ol className="">
                    <li className="flex  items-center gap-1 "> <a href="https://www.frdr-dfdr.ca/repo/collection/szechtmanlab">Szectman Lab Collection  </a>
                        <ExternalLink size={15} />
                    </li>
                    <li className="flex justify-end  items-center gap-1 "> <a href="https://www.frdr-dfdr.ca/repo/">FRDR</a>
                        <ExternalLink size={15} />
                    </li>
                </ol>

            </div>




        </div>
    );
}

export { Footer };