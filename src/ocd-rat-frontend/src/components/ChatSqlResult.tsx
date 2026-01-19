import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface ChatSqlResultProps {
    rationale: string;
    sql: string;
    results: Record<string, unknown>[];
}

/**
 * Component that renders a SQL query response inline in the chat.
 * Displays: rationale, SQL query (monospace), and results table.
 */
export function ChatSqlResult({ rationale, sql, results }: ChatSqlResultProps) {
    const columns = results.length > 0 ? Object.keys(results[0]) : [];

    return (
        <div className="w-full max-w-2xl space-y-4 bg-slate-100 rounded-2xl p-4">
            {/* Rationale Section */}
            <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Query Plan
                </h4>
                <p className="text-sm text-slate-700">{rationale}</p>
            </div>

            {/* SQL Query Section */}
            <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    SQL Query
                </h4>
                <pre className="bg-slate-800 text-slate-100 text-xs p-3 rounded-lg overflow-x-auto font-mono">
                    <code>{sql}</code>
                </pre>
            </div>

            {/* Results Table Section */}
            <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Results ({results.length} rows)
                </h4>
                {results.length > 0 ? (
                    <div className="rounded-lg border bg-white overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    {columns.map((col) => (
                                        <TableHead key={col} className="text-xs font-semibold">
                                            {col}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.slice(0, 50).map((row, idx) => (
                                    <TableRow key={idx}>
                                        {columns.map((col) => (
                                            <TableCell key={col} className="text-xs">
                                                {String(row[col] ?? "")}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {results.length > 50 && (
                            <div className="text-xs text-slate-500 text-center py-2 bg-slate-50 border-t">
                                Showing first 50 of {results.length} rows
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-sm text-slate-500 italic bg-white rounded-lg border p-4 text-center">
                        No results found
                    </div>
                )}
            </div>
        </div>
    );
}
