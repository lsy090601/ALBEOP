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
      <div className="flex items-start gap-2.5">
        {steps.map((step) => (
          <div
            key={step.number}
            className="flex flex-col gap-1.5 rounded-lg bg-surface px-3.5 py-3"
          >
            <p className="text-[10px] font-bold text-navy">{step.number}</p>
            <p className="text-[11px] font-medium text-ink">{step.title}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-full items-start gap-3">
      {steps.map((step) => (
        <div key={step.number} className="flex flex-1 flex-col gap-1.5 rounded-xl bg-surface p-4">
          <p className="text-[11px] font-bold text-navy">{step.number}</p>
          <p className="text-[14px] font-bold text-ink">{step.title}</p>
          {step.description && (
            <p className="w-[210px] text-[11px] leading-[1.55] text-muted">{step.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
