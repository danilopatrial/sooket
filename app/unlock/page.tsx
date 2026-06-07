import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UnlockForm } from "@/components/unlock/UnlockForm";

/**
 * Unlock screen shown when SOOKET_AUTH_TOKEN is set and the browser has no valid
 * cookie. Lives outside the (main) route group so it renders without the
 * dashboard chrome while the user is locked out.
 */
export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Only honor same-origin relative paths to avoid open-redirect.
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/workflow";

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">Sooket is locked</CardTitle>
          <CardDescription>Enter the instance access token to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <UnlockForm next={dest} />
        </CardContent>
      </Card>
    </div>
  );
}
