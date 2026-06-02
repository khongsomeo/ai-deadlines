import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

const SCROLL_THRESHOLD = 300; // px scrolled before button appears

const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      id="back-to-top"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      className={[
        // Position – clear of mobile browser chrome (extra bottom safe-area)
        "fixed bottom-6 right-4 sm:bottom-8 sm:right-6 z-50",
        // Size – compact on mobile, slightly larger on sm+
        "h-9 w-9 sm:h-10 sm:w-10",
        // Shape & base colours (theme-aware)
        "flex items-center justify-center rounded-full",
        "bg-primary/80 dark:bg-iris/70 text-primary-foreground dark:text-white",
        // Backdrop blur for the frosted-glass feel
        "backdrop-blur-sm",
        // Border
        "border border-primary/20 dark:border-iris/30",
        // Shadow
        "shadow-lg",
        // Hover / active states
        "hover:bg-primary dark:hover:bg-iris/90",
        "hover:opacity-100 active:scale-95",
        // Smooth transitions
        "transition-all duration-300 ease-in-out",
        // Visibility animation
        visible
          ? "opacity-70 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none",
      ].join(" ")}
    >
      <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
    </button>
  );
};

export default BackToTop;
