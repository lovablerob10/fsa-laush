import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function ThemeToggle({ className, isCollapsed }: { className?: string, isCollapsed?: boolean }) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className={cn("w-8 h-8 opacity-0", className)} />;
    }

    return (
        <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-colors",
                "hover:bg-slate-200 dark:hover:bg-slate-800/60 text-slate-500 hover:text-slate-900 dark:hover:text-slate-300",
                className
            )}
            title={theme === "light" ? "Alternar para Modo Escuro" : "Alternar para Modo Claro"}
        >
            {theme === "light" ? (
                <Moon className="w-4 h-4" />
            ) : (
                <Sun className="w-4 h-4" />
            )}
            {!isCollapsed && <span className="ml-2 text-xs font-medium">Tema</span>}
        </button>
    );
}
