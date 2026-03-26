import { IconPlus } from "@tabler/icons-react"
import { ArrowUpIcon } from "lucide-react"

import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupText,
    InputGroupTextarea,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { useState } from "react";

interface QueryInputProps {
    onSendMessage: (message: string) => void;
}

export function QueryInput({ onSendMessage }: QueryInputProps) {

    const [message, setMessage] = useState("");

    const [tokenUsage, setTokenUsage] = useState(0);

    const isDisabled = message.trim().length == 0;

    const handleSubmit = () => {
        if (isDisabled) return;
        onSendMessage(message);
        setMessage("");
        setTokenUsage(tokenUsage + 1);
    }

    const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    }

    return (
        <InputGroup>
            <InputGroupTextarea placeholder="Ask, Search or Chat..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKey}
            />
            <InputGroupAddon align="block-end">
                <InputGroupButton
                    variant="outline"
                    className="rounded-full"
                    size="icon-xs"
                >
                    <IconPlus />
                </InputGroupButton>

                <InputGroupText className="ml-auto"></InputGroupText>

                <InputGroupButton
                    variant="default"
                    className="rounded-full"
                    size="icon-xs"
                    disabled={isDisabled}
                    onClick={handleSubmit}
                >
                    <ArrowUpIcon />
                    <span className="sr-only">Send</span>
                </InputGroupButton>
            </InputGroupAddon>
        </InputGroup>
    );
}