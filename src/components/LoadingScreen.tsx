import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <img 
          src="/image.jpg" 
          alt="Logo" 
          className="h-16 w-16 mb-2 animate-pulse"
        />
        <div className="text-xl font-medium animate-pulse">Loading conferences...</div>
        <Loader2 className="h-8 w-8 animate-spin text-primary mt-2" />
      </div>
    </div>
  );
}
