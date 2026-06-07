import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Heart, Star, HelpCircle, Sparkles, Mail, AlertTriangle } from "lucide-react";

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
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold"><HelpCircle className="h-6 w-6 text-primary" /> FAQ</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-800 dark:text-amber-500 mb-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Service Disclaimer
            </h3>
            <p className="text-sm text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
              As this is a hobby project (and the maintainers don't make a dime, literally spending their weekly spare LLM tokens to keep this running!), the automated crawling still requires manual triggering and individual human review. Consequently, you may experience occasional latency in deadline updates or service disruptions, as our backend is hosted on Render.com's free tier with limited bandwidth.
            </p>
            <p className="text-sm text-amber-800/90 dark:text-amber-200/90 leading-relaxed mt-3">
              Since the original authors provided their work for free, we firmly believe this project should remain completely free of charge. Therefore, we ask that you use the service responsibly and refrain from overloading or abusing the servers.
            </p>
          </div>
          <Accordion type="multiple" className="w-full space-y-4">
            <AccordionItem value="item-1" className="border-none">
              <AccordionTrigger className="text-base font-semibold hover:no-underline text-left py-0">What timezone are the deadlines displayed in?</AccordionTrigger>
              <AccordionContent className="pt-2 pb-0">
                <blockquote className="border-l-2 border-primary/30 pl-3 text-muted-foreground text-sm leading-relaxed">
                  By default, all deadlines are automatically converted to your local browser's timezone. You can check the large countdown clock for the exact time. Additionally, we display the conference's original timezone in the details dialog that appears when you click on a deadline.
                </blockquote>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-rankings" className="border-none">
              <AccordionTrigger className="text-base font-semibold hover:no-underline text-left py-0">I found a different rank for a conference elsewhere. Why doesn't it match your dashboard?</AccordionTrigger>
              <AccordionContent className="pt-2 pb-0">
                <blockquote className="border-l-2 border-primary/30 pl-3 text-muted-foreground text-sm leading-relaxed">
                  We use the latest <strong>ICORE Rankings</strong> from the <a href="https://portal.core.edu.au/conf-ranks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ICORE Conference Portal</a> (currently ICORE2026 for the year 2026) as our primary reference. If you happen to check your conference's rank somewhere else, please double-check it against the official ICORE Conference Portal.
                </blockquote>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-none">
              <AccordionTrigger className="text-base font-semibold hover:no-underline text-left py-0">Is all information on this website reliable?</AccordionTrigger>
              <AccordionContent className="pt-2 pb-0">
                <blockquote className="border-l-2 border-primary/30 pl-3 text-muted-foreground text-sm leading-relaxed">
                  All deadlines are automatically crawled and double-checked by humans. However, users are expected to re-check the conference information carefully before submitting.
                </blockquote>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-none">
              <AccordionTrigger className="text-base font-semibold hover:no-underline text-left py-0">How can I report inaccurate information, request a new feature, or track a new conference?</AccordionTrigger>
              <AccordionContent className="pt-2 pb-0">
                <blockquote className="border-l-2 border-primary/30 pl-3 text-muted-foreground text-sm leading-relaxed">
                  Reach out to us at <Mail className="inline h-4 w-4 mx-1" /><em className="italic">ksm (at) trhgquan (dot) xyz</em>.
                </blockquote>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-none">
              <AccordionTrigger className="text-base font-semibold hover:no-underline text-left py-0">I'm subscribed to AI Conference Deadlines on Google Calendar, but it doesn't seem to be syncing in real-time with the main dashboard</AccordionTrigger>
              <AccordionContent className="pt-2 pb-0">
                <blockquote className="border-l-2 border-primary/30 pl-3 text-muted-foreground text-sm leading-relaxed">
                  As discussed in <a href="https://support.google.com/calendar/thread/392574281/calendar-feed-refresh-rate?hl=en" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">this thread from Google Calendar's Help</a>, the <strong>expected</strong> calendar feed refresh rate ranges from <strong>2 hours up to several days</strong>. While our APIs are updated in real-time and we know this delay can be frustrating, it all depends on Google Calendar's servers. We recommend double-checking the dashboard to keep things on track.
                </blockquote>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border-none">
              <AccordionTrigger className="text-base font-semibold hover:no-underline text-left py-0">Can I export this data to use in my own spreadsheets or tools?</AccordionTrigger>
              <AccordionContent className="pt-2 pb-0">
                <blockquote className="border-l-2 border-primary/30 pl-3 text-muted-foreground text-sm leading-relaxed">
                  Short answer: <strong>Yes</strong>. To save time (and to prevent our API servers from being overwhelmed), visit our <a href="https://github.com/khongsomeo/ai-deadlines/tree/main/src/data/conferences" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">conference data folder</a>, where we store all conference data in YAML format. You are welcome to use it, just make sure to follow the MIT License.
                </blockquote>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-2"><Sparkles className="h-5 w-5 text-primary" /> Credits</h3>
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
