import Link from "next/link";
import { Card, CardContent } from "../components/ui/Card";
import ThemeSwitcher from "../components/ThemeSwitcher";

export default function Home() {
  return (
    <div className="min-h-screen p-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">OppTrack Tools</h1>
        <ThemeSwitcher />
      </div>
      <div className="grid gap-3 max-w-lg">
        <Link href="/notebook">
          <Card className="hover:bg-gray-50">
            <CardContent>
              <div className="font-medium">Notebook</div>
              <div className="text-sm text-gray-600">Compose request cells like a lightweight Jupyter, run against your backend, and persist results locally.</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/endpoints">
          <Card className="hover:bg-gray-50">
            <CardContent>
              <div className="font-medium">Endpoint Explorer</div>
              <div className="text-sm text-gray-600">Load your OpenAPI spec to browse available endpoints.</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
