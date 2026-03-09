import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl gradient-teal-subtle flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-primary/50" />
      </div>
      <h1 className="text-3xl font-bold mb-2">Page Not Found</h1>
      <p className="text-muted-foreground mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/">
        <Button className="rounded-xl gradient-teal text-white" data-testid="button-go-home">
          Go to Dashboard
        </Button>
      </Link>
    </div>
  );
}
