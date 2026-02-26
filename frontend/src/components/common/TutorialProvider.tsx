
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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

    const startTour = async (tourId: string) => {
        if (activeTour) {
            activeTour.cancel();
        }

        const config = toursConfig[tourId];
        if (!config) {
            console.warn(`Tour ${tourId} not found`);
            return;
        }

        // Dynamically import shepherd.js so it only loads in the browser
        const Shepherd = (await import('shepherd.js')).default;

        const tour = new Shepherd.Tour({
            ...config,
            defaultStepOptions: {
                ...config.defaultStepOptions,
                cancelIcon: { enabled: true },
            }
        });

        // Add steps from config
        config.steps.forEach((step: any) => {
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

    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('dcmms_seen_welcome_tour');
        if (!hasSeenWelcome && pathname === '/dashboard') {
            setTimeout(() => {
                startTour('first-login');
                localStorage.setItem('dcmms_seen_welcome_tour', 'true');
            }, 1000);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Return a no-op fallback instead of throwing so that components using
        // useTutorial() do not crash the entire app if the provider is absent
        // (e.g. during certain Next.js App Router streaming/hydration edge cases).
        return {
            startTour: (_tourId: string) => {},
            activeTour: null,
        } as TutorialContextType;
    }
    return context;
};
