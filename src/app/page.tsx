"use client";
import Dashboard from "@/views/Dashboard";
import SpaRoot from "@/views/SpaRoot";
import { SPA } from "@/lib/nav";

export default function Page() {
  return SPA ? <SpaRoot /> : <Dashboard />;
}
