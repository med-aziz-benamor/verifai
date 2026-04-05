import { Sun, Moon } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";

const ThemeToggle = () => {
  const [dark, setDark] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleTheme = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const newDark = !dark;

    // Get click position for the wave origin
    const rect = buttonRef.current!.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // Calculate the max radius needed to cover the entire screen
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Check for View Transition API support
    if (document.startViewTransition) {
      document.documentElement.style.setProperty("--wave-x", `${x}px`);
      document.documentElement.style.setProperty("--wave-y", `${y}px`);
      document.documentElement.style.setProperty("--wave-r", `${maxRadius}px`);

      const transition = document.startViewTransition(() => {
        document.documentElement.classList.toggle("dark", newDark);
      });

      setDark(newDark);
    } else {
      // Fallback: manual overlay approach
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 99999; pointer-events: none;
        background: ${newDark ? "hsl(220 25% 10%)" : "hsl(220 20% 97%)"};
        clip-path: circle(0px at ${x}px ${y}px);
        transition: clip-path 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      `;
      document.body.appendChild(overlay);

      requestAnimationFrame(() => {
        overlay.style.clipPath = `circle(${maxRadius}px at ${x}px ${y}px)`;
      });

      setTimeout(() => {
        document.documentElement.classList.toggle("dark", newDark);
        overlay.remove();
      }, 600);

      setDark(newDark);
    }
  }, [dark]);

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative z-[100000]"
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
};

export default ThemeToggle;
