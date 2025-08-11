import { themes } from "../lib/themes";
import { useTheme } from "../hooks/useTheme";
import Select from "./ui/Select";

export function ThemeSwitcher() {
  const { themeName, setThemeName } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Theme</span>
      <Select value={themeName} onChange={(e) => setThemeName(e.target.value as any)}>
        {Object.keys(themes).map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </Select>
    </div>
  );
}

export default ThemeSwitcher;

