export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 px-4 py-16">
      <div className="h-6 w-6 rounded-full border-2 border-muted border-t-foreground animate-spin" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
