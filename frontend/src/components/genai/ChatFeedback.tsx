import { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";

interface ChatFeedbackProps {
    query: string;
    answer: string;
    contextIds: string[];
    onSubmitFeedback: (
        rating: "positive" | "negative",
        comment?: string,
    ) => Promise<void>;
}

export const ChatFeedback: React.FC<ChatFeedbackProps> = ({
    query,
    answer,
    contextIds,
    onSubmitFeedback,
}) => {
    const [selectedRating, setSelectedRating] = useState<
        "positive" | "negative" | null
    >(null);
    const [showCommentBox, setShowCommentBox] = useState(false);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleRatingClick = async (rating: "positive" | "negative") => {
        if (isSubmitted) return;

        setSelectedRating(rating);

        // For positive feedback, submit immediately without comment
        if (rating === "positive") {
            setIsSubmitting(true);
            try {
                await onSubmitFeedback(rating);
                setIsSubmitted(true);
            } catch (error) {
                console.error("Failed to submit feedback:", error);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            // For negative feedback, show comment box
            setShowCommentBox(true);
        }
    };

    const handleSubmitWithComment = async () => {
        if (!selectedRating || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSubmitFeedback(selectedRating, comment.trim() || undefined);
            setIsSubmitted(true);
            setShowCommentBox(false);
        } catch (error) {
            console.error("Failed to submit feedback:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <span>✓ Thank you for your feedback!</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                    Was this helpful?
                </span>
                <button
                    onClick={() => handleRatingClick("positive")}
                    disabled={isSubmitting || isSubmitted}
                    className={`p-1.5 rounded-md transition-colors ${selectedRating === "positive"
                            ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                        } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                    title="Helpful"
                >
                    <ThumbsUp size={16} />
                </button>
                <button
                    onClick={() => handleRatingClick("negative")}
                    disabled={isSubmitting || isSubmitted}
                    className={`p-1.5 rounded-md transition-colors ${selectedRating === "negative"
                            ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                        } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                    title="Not helpful"
                >
                    <ThumbsDown size={16} />
                </button>
            </div>

            {showCommentBox && selectedRating === "negative" && (
                <div className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <MessageSquare size={14} />
                        <span>What could be improved?</span>
                    </div>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Optional: Tell us how we can improve this answer..."
                        className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={3}
                    />
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => {
                                setShowCommentBox(false);
                                setSelectedRating(null);
                                setComment("");
                            }}
                            className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 
                       hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmitWithComment}
                            disabled={isSubmitting}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md 
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? "Submitting..." : "Submit"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
