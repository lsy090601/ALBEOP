interface StatusStepperProps {
  steps: readonly string[];
  currentIndex: number;
}

export default function StatusStepper({ steps, currentIndex }: StatusStepperProps) {
  return (
    <div className="flex w-full items-start">
      {steps.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isReached = isDone || isCurrent;

        return (
          <div key={step} className="flex flex-1 flex-col items-center gap-1.5 last:flex-none">
            <span
              className={`rounded-full ${isReached ? 'bg-navy' : 'bg-faint'} ${
                isCurrent ? 'size-3' : 'size-2'
              }`}
            />
            <span
              className={`whitespace-nowrap text-[10px] ${isReached ? 'text-navy' : 'text-faint'} ${
                isCurrent ? 'font-bold' : 'font-normal'
              }`}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
