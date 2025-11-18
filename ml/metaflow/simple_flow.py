#!/usr/bin/env python3
"""
Simple Metaflow Example: Hello World Flow
Demonstrates basic Metaflow concepts
"""

from metaflow import FlowSpec, step, Parameter


class HelloFlow(FlowSpec):
    """
    A simple flow that demonstrates Metaflow basics

    Steps:
    1. start - Initialize flow
    2. process - Process data (parallel branching)
    3. join - Join parallel branches
    4. end - Finalize flow
    """

    # Parameters can be passed via CLI
    name = Parameter(
        'name',
        default='dCMMS',
        help='Name to greet'
    )

    count = Parameter(
        'count',
        default=3,
        type=int,
        help='Number of times to greet'
    )

    @step
    def start(self):
        """
        Start of the flow
        """
        print(f"Hello from {self.name}!")
        print(f"Will greet {self.count} times")

        self.greetings = []
        self.next(self.process, num_parallel=self.count)

    @step
    def process(self):
        """
        Process step - runs in parallel
        """
        import time
        from datetime import datetime

        # Simulate some work
        time.sleep(1)

        greeting = f"Greeting #{self.index} at {datetime.now().strftime('%H:%M:%S')}"
        self.greetings.append(greeting)

        print(f"  {greeting}")

        self.next(self.join)

    @step
    def join(self, inputs):
        """
        Join parallel branches
        """
        # Merge all greetings from parallel branches
        all_greetings = []
        for input in inputs:
            all_greetings.extend(input.greetings)

        self.all_greetings = all_greetings

        print(f"\nJoined {len(inputs)} parallel branches")
        print(f"Total greetings: {len(all_greetings)}")

        self.next(self.end)

    @step
    def end(self):
        """
        End of the flow
        """
        print("\n" + "=" * 60)
        print("Flow Complete!")
        print("=" * 60)
        print("\nAll Greetings:")
        for greeting in self.all_greetings:
            print(f"  • {greeting}")


if __name__ == '__main__':
    HelloFlow()
