import { Check } from "lucide-react";
import { taskProgress, toggleStep, type TaskStep } from "../../../L4-data/task-model";

export function TaskSteps({
  steps,
  onChange,
}: {
  steps: TaskStep[];
  onChange: (steps: TaskStep[]) => void;
}) {
  const progress = taskProgress(steps);
  return (
    <div className="task-step-section">
      <div className="task-progress-label">
        <span>
          {progress.completed}/{progress.total} 步骤完成
        </span>
        <b>{progress.percent}%</b>
      </div>
      <div className="task-progress-track">
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="task-step-bubbles">
        {steps.map((step, index) => (
          <button
            type="button"
            aria-label={`完成步骤：${step.title}`}
            aria-pressed={step.completed}
            className={`task-step-bubble ${step.completed ? "completed" : ""}`}
            key={step.id}
            onClick={() => onChange(toggleStep(steps, step.id))}
          >
            <span className="step-check" aria-hidden="true">{step.completed && <Check />}</span>
            <span className="step-order">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="step-bubble-title">{step.title}</span>
            <span className="step-hours">{step.hours} 小时</span>
          </button>
        ))}
      </div>
    </div>
  );
}
