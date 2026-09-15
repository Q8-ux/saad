"use client";
import { createContext, useContext, type ReactNode } from "react";
import { guestRequest } from "../lib/guest-data";

const demo = { request: guestRequest, guest: true };
const OfficeRequestContext = createContext(demo);

export function OfficeRequestProvider({ children }: { guest: boolean; children: ReactNode }) {
  // GitHub Pages serves an isolated public preview, with no production API fallback.
  return <OfficeRequestContext.Provider value={demo}>{children}</OfficeRequestContext.Provider>;
}
export function useOfficeRequest() { return useContext(OfficeRequestContext); }
