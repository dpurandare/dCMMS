
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import { firstLoginTour, createWorkOrderTour } from '@/tutorial/tours';
import { usePathname } from 'next/navigation';

type TutorialContextType = {
    startTour: (tourId: string) => void;
    activeTour: any | null;
};

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeTour, setActiveTour] = useState<any | null>(null);
    const pathname = usePathname();

    // Initialize tours map
    const toursConfig: Record<string, any> = {
        'first-login': firstLoginTour,
        'create-wo': createWorkOrderTour,
    };

    const startTour = (tourId: string) => {
        if (activeTour) {
            activeTour.cancel();
        }

        const config = toursConfig[tourId];
        if (!config) {
            console.warn(`Tour ${tourId} not found`);
            return;
        }

        const tour = new Shepherd.Tour({
            ...config,
            defaultStepOptions: {
                ...config.defaultStepOptions,
                cancelIcon: { enabled: true },
            }
        });

        // Add steps from config
        config.steps.forEach((step: any) => {
            // We act on the buttons to bind the Next/Back actions if they are strings/defaults
            // For simplicity in this implementation, we assume steps are well-formed or we enhance them here
            const enhancedButtons = step.buttons?.map((btn: any) => {
                if (btn.text === 'Next' && !btn.action) {
                    return { ...btn, action: tour.next };
                }
                if (btn.text === 'Back' && !btn.action) {
                    return { ...btn, action: tour.back };
                }
                if (btn.text === 'Skip Tour' && !btn.action) {
                    return { ...btn, action: tour.cancel };
                }
                if (btn.text === 'Start Tour' && !btn.action) {
                    return { ...btn, action: tour.next };
                }
                if (btn.text === 'Got it!' && !btn.action) {
                    return { ...btn, action: tour.complete };
                }
                return btn;
            });

            tour.addStep({
                ...step,
                buttons: enhancedButtons
            });
        });

        tour.start();
        setActiveTour(tour);

        // Cleanup on complete/cancel
        const cleanup = () => setActiveTour(null);
        tour.on('complete', cleanup);
        tour.on('cancel', cleanup);
    };

    // Example: Check for first login trigger (could be from user metadata or localstorage)
    useEffect(() => {
        // This is a simplified check. In real app, check user profile "hasSeenWelcomeTour"
        const hasSeenWelcome = localStorage.getItem('dcmms_seen_welcome_tour');
        // Only trigger on dashboard
        if (!hasSeenWelcome && pathname === '/dashboard') {
            // Small delay to let UI load
            setTimeout(() => {
                startTour('first-login');
                localStorage.setItem('dcmms_seen_welcome_tour', 'true');
            }, 1000);
        }
    }, [pathname]);

    return (
        <TutorialContext.Provider value={{ startTour, activeTour }}>
            {children}
        </TutorialContext.Provider>
    );
};

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    if (context === undefined) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
};
