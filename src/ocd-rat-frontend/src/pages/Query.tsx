import { QueryInput } from "@/components/QueryInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useState, useEffect } from "react";


interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot'
}


export function Query() {

    const [messages, setMessages] = useState<Message[]>([]);
    const [tableData, setTableData] = useState<any[] | null>(null);
    const showIntroMessage = messages?.length == 0;

    const fetchData = async (Usertext: string) => {
        try {
            const params = {
                query_type: 'NLP',
                text: Usertext
            };
            const url = new URL('http://localhost:8000/nlp/');
            url.search = new URLSearchParams(params).toString();

            const response = await fetch(url)
            return await response.json()
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    const fetchAskStream = async (question: string) => {
        try {
            const response = await fetch('http://localhost:8000/ask/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });

            if (!response.ok || !response.body) {
                throw new Error('Failed to fetch stream');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            // Create bot message that we'll update
            const botMessageId = new Date().toISOString();
            const botMessage: Message = {
                id: botMessageId,
                text: "",
                sender: 'bot'
            };

            setMessages(prev => [...prev, botMessage]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') return;

                        // Update the bot message with new token
                        setMessages(prev => prev.map(msg =>
                            msg.id === botMessageId
                                ? { ...msg, text: msg.text + data }
                                : msg
                        ));
                    }
                }
            }
        } catch (error) {
            console.error("Error streaming ask:", error);
            setMessages(prev => [...prev, {
                id: new Date().toISOString(),
                text: "Error: Failed to get response",
                sender: 'bot'
            }]);
        }
    };

    const dummyBotResponse = async () => {
        const botResponse: Message = {
            id: new Date().toISOString(),
            text: "Scroll down to view your results!",
            sender: 'bot'
        }
        const delay = 1000;

        setTimeout(() => {
            setMessages(prevMessages => [...prevMessages, botResponse])
        }, delay)

    }


    const handleSendMessage = async (messageText: string) => {

        const newMessage: Message = {
            id: new Date().toISOString(),
            text: messageText,
            sender: 'user'
        };

        setMessages(prevMessages => [...prevMessages, newMessage]);

        // Simple heuristic: if contains SQL keywords, use NLP endpoint
        const sqlKeywords = ['show', 'select', 'get', 'find', 'list', 'count', 'how many'];
        const isLikelySQL = sqlKeywords.some(kw =>
            messageText.toLowerCase().includes(kw)
        );

        if (isLikelySQL) {
            const data = await fetchData(messageText);
            setTableData(data);
            dummyBotResponse();
        } else {
            setTableData(null); // Hide table for Ask mode
            await fetchAskStream(messageText);
        }
    }




    return (

        <div className="flex flex-col h-full items-center px-4  lg:px-40 relative ">

            {showIntroMessage &&
                (
                    <div className=" absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 text-center shrink-0 mb-4">
                        <h1 className="scroll-m-10 text-center text-2xl font-bold tracking-tight text-balance ">
                            Query
                        </h1>
                        <p className="text-muted-foreground text-center text-lg m-5">
                            Talk to the FRDR
                        </p>
                    </div>
                )

            }
            <div className="flex-1 w-full overflow-hidden min-h-0 max-w-3xl" >

                <ScrollArea className="h-[calc(100vh-400px)] w-full">
                    <div className="p-4">

                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex w-full my-2 ${message.sender === "user" ? "justify-end" : "justify-start"
                                    }`}
                            >
                                <div
                                    className={`text-sm rounded-4xl px-4 py-2 max-w-1/2 break-words
                                 ${message.sender === "user"
                                            ? "bg-slate-500 text-white"
                                            : "bg-slate-200 text-black"
                                        }`}
                                    style={{ width: "fit-content", maxWidth: "50%" }}
                                >
                                    {message.text}
                                </div>
                            </div>
                        ))}

                    </div>
                </ScrollArea>
            </div>

            <div className="flex w-1/2 min-w-80 shrink-0 my-4 ">
                <QueryInput onSendMessage={handleSendMessage} />
            </div>
            {tableData && tableData.length > 0 && tableData[0] && (
                <div style={{
                    marginTop: "2rem", overflowX: "auto", minWidth: "100%", whiteSpace: "nowrap",
                    width: "100vw",
                    maxWidth: "none",
                    marginLeft: "calc(50% - 50vw)",
                }}>
                    <h2>Results</h2>

                    <table cellPadding="6" style={{ borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                {Object.keys(tableData[0]).map(col => (
                                    <th style={{ border: "1px solid #ccc" }} key={col}>{col}</th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {tableData.map((row, idx) => (
                                <tr key={idx}>
                                    {Object.values(row).map((val, i) => (
                                        <td style={{ border: "1px solid #ccc" }} key={i}>{String(val)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>)}



        </div>


    );
}

