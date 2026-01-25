import { QueryInput } from "@/components/QueryInput";
import { ChatSqlResult } from "@/components/ChatSqlResult";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useState } from "react";
import {Popup,
  PopupTrigger,
  PopupContent,
  PopupHeader,
  PopupFooter,
  PopupTitle,
  PopupDescription} from '@/components/FilePopout';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from "@/config";


// Message types: text for regular chat, sql for query results
interface TextMessage {
    id: string;
    type: 'text';
    text: string;
    sender: 'user' | 'bot';
}

interface SqlMessage {
    id: string;
    type: 'sql';
    sender: 'bot';
    rationale: string;
    sql: string;
    results: Record<string, unknown>[];
}

type Message = TextMessage | SqlMessage;


export function Query() {

    const [messages, setMessages] = useState<Message[]>([]);
    const showIntroMessage = messages?.length == 0;

    const [CsvChecked, SetCsvChecked] = useState(false);
    const [MpgChecked, SetMpgChecked] = useState(false);
    const [GifChecked, SetGifChecked] = useState(false);
    const [EwbChecked, SetEwbChecked] = useState(false);
    const [JpgChecked, SetJpgChecked] = useState(false);
    const [open, setOpen] = useState(false);

    const togglePopup = () => setOpen((prev) => !prev);

    const fetchData = async (Usertext: string) => {
        try {
            const params = {
                query_type: 'NLP',
                text: Usertext
            };
            const query = new URLSearchParams(params).toString();
            // Ensure proper URL construction handling potential relative paths
            const baseUrl = API_BASE_URL.replace(/\/$/, '');
            const response = await fetch(`${baseUrl}/nlp/?${query}`);
            const data = await response.json();

            // New API returns { rationale, sql, results }
            return data;
        } catch (error) {
            console.error("Error fetching data:", error);
            throw error;
        }
    }

    const fetchFiles = async (Csv: string, Ewb: string, Jpg: string, Mpg: string, Gif: string) => {
        try {
            const params = {
                query_type: 'NLP',
                Csv_Flag: Csv,
                Ewb_Flag: Ewb,
                Gif_Flag: Gif,
                Jpg_Flag: Jpg,
                Mpg_Flag: Mpg
            };
            const url = new URL('http://localhost:8000/files/');
            url.search = new URLSearchParams(params).toString();

            const response = await fetch(url);

            const blob = await response.blob();
            const obj_url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = obj_url;
            a.download = "temp_files.zip";
            document.body.appendChild(a);
            a.click();

            a.remove();
            window.URL.revokeObjectURL(obj_url);

            // const data = await response.json();

            // // Add SQL result message inline
            //     const sqlMessage: SqlMessage = {
            //         id: new Date().toISOString(),
            //         type: 'sql',
            //         sender: 'bot',
            //         rationale: data.rationale,
            //         sql: data.sql,
            //         results: data.results
            //     };
            //     setMessages(prev => [...prev, sqlMessage]);

            // // New API returns { rationale, sql, results }
            // return data;
        } catch (error) {
            console.error("Error fetching data:", error);
            throw error;
        }
    }

    const fetchAskStream = async (question: string) => {
        try {
            const baseUrl = API_BASE_URL.replace(/\/$/, '');
            const response = await fetch(`${baseUrl}/ask/`, {
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
            const botMessage: TextMessage = {
                id: botMessageId,
                type: 'text',
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
                            msg.id === botMessageId && msg.type === 'text'
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
                type: 'text' as const,
                text: "Error: Failed to get response",
                sender: 'bot' as const
            }]);
        }
    };

    const handleSendMessage = async (messageText: string) => {

        const newMessage: TextMessage = {
            id: new Date().toISOString(),
            type: 'text',
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
            try {
                const data = await fetchData(messageText);

                // Add SQL result message inline
                const sqlMessage: SqlMessage = {
                    id: new Date().toISOString(),
                    type: 'sql',
                    sender: 'bot',
                    rationale: data.rationale,
                    sql: data.sql,
                    results: data.results
                };
                setMessages(prev => [...prev, sqlMessage]);
            } catch (error) {
                setMessages(prev => [...prev, {
                    id: new Date().toISOString(),
                    type: 'text' as const,
                    text: "Error: Failed to execute query",
                    sender: 'bot' as const
                }]);
            }
        } else {
            await fetchAskStream(messageText);
        }
    }


    return (

        <div className="flex flex-col h-full items-center px-4 lg:px-40 relative">

            {showIntroMessage &&
                (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 text-center shrink-0 mb-4">
                        <h1 className="scroll-m-10 text-center text-2xl font-bold tracking-tight text-balance">
                            Query
                        </h1>
                        <p className="text-muted-foreground text-center text-lg m-5">
                            Talk to the FRDR
                        </p>
                    </div>
                )
            }

            <div className="flex-1 w-full overflow-hidden min-h-0 max-w-4xl">
                <ScrollArea className="h-[calc(100vh-150px)] w-full">
                    <div className="p-4 space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex w-full ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {message.type === 'text' ? (
                                    <div
                                        className={`text-sm rounded-3xl px-4 py-2 max-w-[70%] break-words
                                            ${message.sender === "user"
                                                ? "bg-slate-500 text-white"
                                                : "bg-slate-200 text-black"
                                            }`}
                                    >
                                        {message.text}
                                    </div>
                                ) : (
                                    <ChatSqlResult
                                        rationale={message.rationale}
                                        sql={message.sql}
                                        results={message.results}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            <div className="flex w-1/2 min-w-80 shrink-0 my-4">
                <QueryInput onSendMessage={handleSendMessage} />
            </div>

            <div className="flex items-center space-x-2">
            <Popup open={open} onOpenChange={setOpen}>
    <Button
      variant="outline"
      onClick={togglePopup}
    >
      Download Session Files
    </Button>

    <PopupContent>
      <PopupHeader>
        <PopupTitle> Download Session Files
        </PopupTitle>
        <PopupDescription>
          The download action will download files related to every session
          queried in your previous search. If you would like to refine your search before downloading,
          please cancel.
        </PopupDescription>

        <br></br>
        
      </PopupHeader>

      <PopupTitle>Select Desired File Extensions:</PopupTitle>
      
      <Checkbox id="downloadCsv" checked={CsvChecked} onCheckedChange={(val) => SetCsvChecked(val === true)}/>
            <label htmlFor="downloadCsv" className="text-sm font-medium leading-none"> CSV </label>
    <br></br>
      <Checkbox id="downloadEwb" checked={EwbChecked} onCheckedChange={(val) => SetEwbChecked(val === true)}/>
            <label htmlFor="downloadEwb" className="text-sm font-medium leading-none"> EWB </label>
      <br></br>
      <Checkbox id="downloadGif" checked={GifChecked} onCheckedChange={(val) => SetGifChecked(val === true)}/>
            <label htmlFor="downloadGif" className="text-sm font-medium leading-none"> GIF </label>
        <br></br>
        <Checkbox id="downloadJpg" checked={JpgChecked} onCheckedChange={(val) => SetJpgChecked(val === true)}/>
            <label htmlFor="downloadJpg" className="text-sm font-medium leading-none"> JPG </label>
        <br></br>
        <Checkbox id="downloadMpg" checked={MpgChecked} onCheckedChange={(val) => SetMpgChecked(val === true)}/>
            <label htmlFor="downloadMpg" className="text-sm font-medium leading-none"> MPG </label>
        <br></br>
        <a href="http://0.0.0.0:8000/app/app.py" download="test.py">Download File</a>

      
      <PopupFooter>
        <Button
          variant="secondary"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
        <Button onClick={() => { fetchFiles(String(CsvChecked),String(EwbChecked), String(JpgChecked),String(MpgChecked),String(GifChecked));
                                setOpen(false);
                                }}>Download</Button>
      </PopupFooter>
    </PopupContent>
  </Popup>
          </div>
        </div>

        
    );
}
