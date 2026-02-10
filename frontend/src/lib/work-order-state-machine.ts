/**
 * Work Order State Machine (Frontend)
 * Matches backend/src/services/work-order-state.ts
 */

import type { WorkOrderStatus } from "@/types/api";

interface TransitionConfig {
  from: WorkOrderStatus[];
  to: WorkOrderStatus;
}

/**
 * Work Order State Machine
 * Defines valid state transitions
 */
export class WorkOrderStateMachine {
  private static transitions: TransitionConfig[] = [
    // Draft -> Open (Ready for assignment)
    { from: ["draft"], to: "open" },

    // Open -> Scheduled (Assigned)
    { from: ["open"], to: "scheduled" },

    // Scheduled -> In Progress (Work started)
    { from: ["scheduled", "open"], to: "in_progress" },

    // In Progress -> Completed (Work done)
    { from: ["in_progress"], to: "completed" },

    // Completed -> Closed (Finalized)
    { from: ["completed"], to: "closed" },

    // Hold handling
    { from: ["open", "scheduled", "in_progress"], to: "on_hold" },
    { from: ["on_hold"], to: "in_progress" },
    { from: ["on_hold"], to: "scheduled" },
    { from: ["on_hold"], to: "open" },

    // Cancellation
    {
      from: ["draft", "open", "scheduled", "in_progress", "on_hold"],
      to: "cancelled",
    },
  ];

  /**
   * Check if a state transition is valid
   */
  static isValidTransition(
    current: WorkOrderStatus,
    next: WorkOrderStatus
  ): boolean {
    return this.transitions.some(
      (t) => t.from.includes(current) && t.to === next
    );
  }

  /**
   * Get all allowed transitions from current state
   */
  static getAllowedTransitions(
    current: WorkOrderStatus
  ): WorkOrderStatus[] {
    return this.transitions
      .filter((t) => t.from.includes(current))
      .map((t) => t.to);
  }

  /**
   * Get human-readable transition description
   */
  static getTransitionDescription(status: WorkOrderStatus): string {
    const descriptions: Record<WorkOrderStatus, string> = {
      draft: "Save as draft",
      open: "Mark as open",
      scheduled: "Schedule work",
      in_progress: "Start work",
      on_hold: "Put on hold",
      completed: "Mark as completed",
      closed: "Close work order",
      cancelled: "Cancel work order",
    };
    return descriptions[status] || status;
  }

  /**
   * Get status badge color
   */
  static getStatusColor(status: WorkOrderStatus): string {
    const colors: Record<WorkOrderStatus, string> = {
      draft: "bg-gray-100 text-gray-800",
      open: "bg-blue-100 text-blue-800",
      scheduled: "bg-purple-100 text-purple-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      on_hold: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      closed: "bg-gray-100 text-gray-600",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  }

  /**
   * Get error message for invalid transition
   */
  static getInvalidTransitionMessage(
    current: WorkOrderStatus,
    next: WorkOrderStatus
  ): string {
    const allowed = this.getAllowedTransitions(current);
    return `Cannot transition from '${current}' to '${next}'. Allowed transitions: ${allowed.join(", ")}`;
  }
}
