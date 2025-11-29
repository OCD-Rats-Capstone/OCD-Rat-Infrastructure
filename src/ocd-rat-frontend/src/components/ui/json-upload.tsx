import * as React from 'react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function JsonUpload() {
    const [data, setData] = useState<any>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0]; // only one file allowed
        setFileName(file.name);

        if (file.type !== "application/json") {
            alert("Please upload a .json file.");
            setData(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            if (!e.target) return;

            try {
                const jsonData = JSON.parse(e.target.result as string);
                setData(jsonData);
            } catch (err) {
                alert("Invalid JSON file.");
                setData(null);
            }
        };
        reader.readAsText(file);
        event.target.value = "";
    };

    return (
        <div className="mt-6 flex flex-col items-center gap-2">
            <input
                id="json-upload"
                type="file"
                accept="application/json"
                onChange={handleFileUpload}
                className="hidden"
            />

            <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => document.getElementById("json-upload")?.click()}
            >
                Choose JSON File
            </Button>

            {fileName && <p className="mt-2 text-sm text-gray-600">Uploaded: {fileName}</p>}

            {data && (
                <pre className="mt-4 bg-gray-100 p-4 rounded">
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}
        </div>
    );
}
