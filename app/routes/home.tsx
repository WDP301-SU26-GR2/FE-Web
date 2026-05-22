import { WelcomePage } from "~/features/welcome";

import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mangaka" },
    { name: "description", content: "Welcome to Mangaka" },
  ];
}

export default function Home() {
  return <WelcomePage />;
}
