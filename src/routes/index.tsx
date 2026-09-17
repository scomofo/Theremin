import { createFileRoute } from "@tanstack/react-router";
import { EtherphoneApp } from "@/components/etherphone/etherphone-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <EtherphoneApp />;
}
