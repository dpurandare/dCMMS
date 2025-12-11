import * as React from "react"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
    <label className="relative inline-flex cursor-pointer items-center">
        <input
            type="checkbox"
            className="peer sr-only"
            ref={ref}
            {...props}
        />
        <div className={cn(
            "peer h-6 w-11 rounded-full bg-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background peer-checked:bg-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            "after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-background after:shadow-lg after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white",
            className
        )}></div>
    </label>
))
Switch.displayName = "Switch"

export { Switch }
