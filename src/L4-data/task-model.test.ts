import { describe, expect, it } from "vitest";
import {
  createSteps,
  migrateTask,
  normalizeHours,
  taskDuration,
  taskProgress,
  toggleAllSteps,
  toggleStep,
  updateStep,
} from "./task-model";

describe("task step model", () => {
  it("creates hour-based steps in 0.25 hour increments", () => {
    const steps = createSteps(3, 2, (index) => `s${index}`);
    expect(steps).toEqual([
      { id: "s1", title: "步骤 1", hours: 0.75, completed: false },
      { id: "s2", title: "步骤 2", hours: 0.75, completed: false },
      { id: "s3", title: "步骤 3", hours: 0.5, completed: false },
    ]);
    expect(taskDuration(steps)).toBe(2);
  });
  it("normalizes hours to quarter-hour increments", () => {
    expect(normalizeHours(0)).toBe(0.25);
    expect(normalizeHours(0.62)).toBe(0.5);
    expect(normalizeHours(0.88)).toBe(1);
    expect(normalizeHours(6.37)).toBe(6.25);
    expect(normalizeHours(6.4)).toBe(6.5);
    expect(normalizeHours(-1)).toBe(0.25);
  });
  it("migrates legacy minute tasks and preserves stable ids", () => {
    let id = 0;
    const migrated = migrateTask(
      {
        id: "t",
        title: "旧任务",
        description: "",
        completed: false,
        priority: "medium",
        durationMinutes: 90,
        steps: [
          { id: "kept", title: "阅读", minutes: 30, completed: true },
          { id: "", title: "练习", minutes: 60, completed: false },
        ],
      },
      () => `m${++id}`,
    );
    expect(migrated.durationHours).toBe(1.5);
    expect(migrated.goal).toBe("");
    expect(migrated.steps).toEqual([
      { id: "kept", title: "阅读", hours: 0.5, completed: true },
      { id: "m1", title: "练习", hours: 1, completed: false },
    ]);
  });
  it("preserves a completion goal", () => {
    const task = migrateTask({ id: "g", title: "目标任务", description: "", goal: "完成验收", completed: false, priority: "high", durationHours: 1, steps: 1 });
    expect(task.goal).toBe("完成验收");
  });
  it("migrates legacy numeric steps using the old total duration", () => {
    const migrated = migrateTask(
      {
        id: "t",
        title: "旧任务",
        description: "",
        completed: false,
        priority: "medium",
        durationMinutes: 60,
        steps: 2,
      },
      (index) => `m${index}`,
    );
    expect(migrated.durationHours).toBe(1);
    expect(migrated.steps.map((step) => step.hours)).toEqual([0.5, 0.5]);
  });
  it("updates one step and derives progress", () => {
    const steps = createSteps(2, 1, (index) => `s${index}`);
    const toggled = toggleStep(steps, steps[0].id);
    expect(toggled[0].completed).toBe(true);
    expect(toggled[1].completed).toBe(false);
    expect(taskProgress(toggled)).toEqual({
      completed: 1,
      total: 2,
      percent: 50,
      done: false,
    });
    expect(taskProgress(toggleAllSteps(toggled, true)).done).toBe(true);
    expect(
      updateStep(steps, steps[0].id, { title: "", hours: 0 })[0],
    ).toMatchObject({ title: "步骤 1", hours: 0.25 });
  });
});
