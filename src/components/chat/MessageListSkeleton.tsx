import { Skeleton } from "@/components/ui/skeleton";

export const MessageListSkeleton = () => {
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Incoming message */}
      <div className="flex gap-2 items-start">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-16 w-[250px] rounded-2xl" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      
      {/* Outgoing message */}
      <div className="flex gap-2 items-start justify-end">
        <div className="space-y-2 flex flex-col items-end">
          <Skeleton className="h-12 w-[200px] rounded-2xl" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Incoming message */}
      <div className="flex gap-2 items-start">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-20 w-[280px] rounded-2xl" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
};
