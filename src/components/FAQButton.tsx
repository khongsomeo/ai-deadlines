import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, Star } from "lucide-react";

const SCROLL_THRESHOLD = 300;

const FAQButton = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Run once on mount to get initial scroll state
    onScroll();
    
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          id="faq-button"
          aria-label="FAQ"
          title="FAQ"
          className={[
            "fixed right-4 sm:right-6 z-50",
            "h-9 w-9 sm:h-10 sm:w-10",
            "flex items-center justify-center rounded-full",
            "bg-primary/80 dark:bg-iris/70 text-primary-foreground dark:text-white",
            "backdrop-blur-sm",
            "border border-primary/20 dark:border-iris/30",
            "shadow-lg",
            "hover:bg-primary dark:hover:bg-iris/90",
            "hover:opacity-100 active:scale-95",
            "transition-all duration-300 ease-in-out",
            "opacity-70 pointer-events-auto",
            scrolled ? "bottom-[4.25rem] sm:bottom-[5rem]" : "bottom-6 sm:bottom-8",
          ].join(" ")}
        >
          <span className="font-bold text-sm sm:text-base">?</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">FAQ</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Is all information on this website reliable?</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              All deadlines are automatically crawled and double-checked by humans. However, users are expected to re-check the conference information carefully before submitting.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">How can I report inaccurate information?</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Reach out to us at <em className="italic">ksm (at) trhgquan (dot) xyz</em>.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Credits</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-2">
              Credit goes to <a href="https://github.com/huggingface/ai-deadlines" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">huggingface/ai-deadlines</a> (following their original <a href="https://github.com/huggingface/ai-deadlines/LICENSE" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">MIT License</a>). You can visit <a href="https://huggingface.co/spaces/huggingface/ai-deadlines" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">the original Hugging Face Space of ai-deadlines</a>, and don't forget to give them a <Heart className="inline h-4 w-4 mx-0.5 text-red-500 fill-red-500" /> like (Space) and a <Star className="inline h-4 w-4 mx-0.5 text-yellow-500 fill-yellow-500" /> star (repository) for their awesome creation 😉
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              This website is maintained by <a href="https://github.com/trhgquan" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">trhgquan</a> and <a href="https://github.com/khongsomeo" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">khongsomeo</a>, with huge unofficial support from Google (Gemini Pro 3.1) and Anthropic (Claude Sonnet 4.6).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FAQButton;
