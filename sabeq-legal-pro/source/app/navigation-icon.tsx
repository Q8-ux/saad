const paths: Record<string, string> = {
 dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
 search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
 library: "M3 4h5v16H3z M10 4h5v16h-5z M17 5l4-1 3 15-4 1z",
 clients: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M17 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-4",
 cases: "M3 7h18v14H3z M8 7V3h8v4 M3 12h18 M10 12v3h4v-3",
 hearings: "M3 5h18v16H3z M7 2v6 M17 2v6 M3 10h18 M7 14h3 M14 14h3 M7 17h3",
 invoices: "M5 2h14v20l-3-2-4 2-4-2-3 2z M8 7h8 M8 11h8 M8 15h5",
 memos: "M14 2H4v20h16V8z M14 2v6h6 M8 12h8 M8 16h6",
 settings: "M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6",
 admin: "M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6z M8 12l3 3 5-6",
};
export default function NavigationIcon({name}: {name: string}) {
 return <svg viewBox="0 0 26 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name] || paths.memos}/></svg>;
}
