"use client";
import { usePathname } from "@/lib/nav";
import Dashboard from "./Dashboard";
import Training from "./Training";
import Summary from "./Summary";
import Schemas from "./Schemas";
import TemplateEditor from "./TemplateEditor";
import Exercises from "./Exercises";
import Progress from "./Progress";
import History from "./History";
import HistoryDetail from "./HistoryDetail";
import Settings from "./Settings";

// Routetabel voor de single-page build (NEXT_PUBLIC_SPA=1).
const ROUTES: Record<string, () => React.ReactNode> = {
  "/": Dashboard,
  "/training": Training,
  "/training/samenvatting": Summary,
  "/schemas": Schemas,
  "/schemas/bewerken": TemplateEditor,
  "/oefeningen": Exercises,
  "/progressie": Progress,
  "/historie": History,
  "/historie/detail": HistoryDetail,
  "/instellingen": Settings,
};

export default function SpaRoot() {
  const path = usePathname();
  const View = ROUTES[path] ?? Dashboard;
  return <View key={path} />;
}
