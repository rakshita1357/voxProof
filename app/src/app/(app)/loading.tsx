export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse space-y-4">
      <div className="h-6 w-48 rounded bg-line" />
      <div className="h-28 rounded-lg bg-line/60" />
      <div className="h-64 rounded-lg bg-line/60" />
    </div>
  );
}
