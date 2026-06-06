import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4 py-16 text-center">
      <span className="text-5xl font-bold text-muted-foreground/30">404</span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Page not found</h2>
        <p className="text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <Link href="/workflow" className={cn(buttonVariants({ variant: "outline" }))}>
        Go to workflows
      </Link>
    </div>
  );
}
