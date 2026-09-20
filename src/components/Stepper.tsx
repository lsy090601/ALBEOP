interface Step {
  number: number;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  variant?: 'default' | 'compact';
}

export default function Stepper({ steps, variant = 'default' }: StepperProps) {
  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-start justify-center gap-2.5">
        {steps.map((step) => (
          <div key={step.number} className="flex flex-col gap-1.5 rounded-box bg-surface px-4 py-3">
            <p className="text-[11px] font-bold text-navy">{step.number}</p>
            <p className="text-[12px] font-medium text-ink">{step.title}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-full items-stretch gap-4">
      {steps.map((step) => (
        <div key={step.number} className="flex flex-1 flex-col gap-2 rounded-box bg-surface p-5">
          <p className="text-[12px] font-bold text-navy">{step.number}</p>
          <p className="text-[15px] font-bold text-ink">{step.title}</p>
          {step.description && (
            <p className="text-[12px] leading-[1.6] text-muted">{step.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
