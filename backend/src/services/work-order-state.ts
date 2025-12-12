
export type WorkOrderStatus =
    | "draft"
    | "open"
    | "scheduled"
    | "in_progress"
    | "on_hold"
    | "completed"
    | "closed"
    | "cancelled";

interface TransitionConfig {
    from: WorkOrderStatus[];
    to: WorkOrderStatus;
    validate?: (context: any) => Promise<boolean>;
}

export class WorkOrderStateMachine {
    private static transitions: TransitionConfig[] = [
        // Draft -> Open (Ready for assignment)
        { from: ["draft"], to: "open" },

        // Open -> Scheduled (Assigned)
        { from: ["open"], to: "scheduled" },

        // Scheduled -> In Progress (Work started)
        { from: ["scheduled", "open"], to: "in_progress" }, // Allow Open -> In Progress if skipping formal schedule

        // In Progress -> Completed (Work done)
        { from: ["in_progress"], to: "completed" },

        // Completed -> Closed (Finalized)
        { from: ["completed"], to: "closed" },

        // Hold handling
        {
            from: ["open", "scheduled", "in_progress"],
            to: "on_hold"
        },
        // Resume from Hold (returns to Open, Scheduled or In Progress - specialized logic might be needed to remember prev state, 
        // but here we allow resuming to any valid active state usually. For simplicity, we might just allow resuming to In Progress or Scheduled)
        { from: ["on_hold"], to: "in_progress" },
        { from: ["on_hold"], to: "scheduled" },
        { from: ["on_hold"], to: "open" },

        // Cancellation
        {
            from: ["draft", "open", "scheduled", "in_progress", "on_hold"],
            to: "cancelled"
        },
    ];

    static isValidTransition(current: WorkOrderStatus, next: WorkOrderStatus): boolean {
        return this.transitions.some(
            (t) => t.from.includes(current) && t.to === next
        );
    }

    static getAllowedTransitions(current: WorkOrderStatus): WorkOrderStatus[] {
        return this.transitions
            .filter((t) => t.from.includes(current))
            .map((t) => t.to);
    }
}
