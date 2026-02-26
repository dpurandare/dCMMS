
// Define the First Login Tour
export const firstLoginTour = {
    defaultStepOptions: {
        classes: 'shadow-md bg-purple-dark text-white',
        scrollTo: true,
        cancelIcon: {
            enabled: true
        }
    },
    useModalOverlay: true,
    steps: [
        {
            id: 'welcome',
            title: 'Welcome to dCMMS! 👋',
            text: 'This is your dashboard—your command center for monitoring and managing your non-conventional energy plant. Let\'s take a quick tour!',
            attachTo: { element: 'body', on: 'bottom' }, // Centered roughly
            buttons: [
                { text: 'Skip Tour', action: () => { }, classes: 'shepherd-button-secondary' }, // Handled by manager
                { text: 'Start Tour', action: () => { }, classes: 'shepherd-button-primary' }
            ]
        },
        {
            id: 'work-orders',
            title: 'Work Orders',
            text: 'Create, assign, and track maintenance work orders. Field technicians complete work orders via mobile app.',
            attachTo: { element: '#nav-work-orders', on: 'right' },
            buttons: [{ text: 'Next', classes: 'shepherd-button-primary' }]
        },
        {
            id: 'assets',
            title: 'Assets & Sites',
            text: 'Manage your equipment inventory, view health scores, and schedule preventive maintenance.',
            attachTo: { element: '#nav-assets', on: 'right' },
            buttons: [{ text: 'Next', classes: 'shepherd-button-primary' }]
        },
        {
            id: 'anomaly',
            title: '🚀 NEW: Anomaly Detection',
            text: 'ML-powered anomaly detection flags equipment issues before they cause failures. Click here to investigate anomalies!',
            attachTo: { element: '#anomaly-widget', on: 'bottom' },
            buttons: [{ text: 'Next', classes: 'shepherd-button-primary' }]
        },
        {
            id: 'help',
            title: 'Get Help Anytime',
            text: 'Need help? Click here for documentation, videos, and live support. You can also replay this tour from the Help menu.',
            attachTo: { element: '#help-menu', on: 'left' },
            buttons: [{ text: 'Got it!', classes: 'shepherd-button-primary' }]
        }
    ]
};

// Define Create Work Order Tour
export const createWorkOrderTour = {
    defaultStepOptions: {
        classes: 'shadow-md bg-purple-dark text-white',
        scrollTo: true,
        cancelIcon: { enabled: true }
    },
    useModalOverlay: true,
    steps: [
        {
            id: 'wo-start',
            text: 'Let\'s create your first work order!',
            attachTo: { element: '#create-wo-btn', on: 'bottom' },
            buttons: [{ text: 'Next', classes: 'shepherd-button-primary' }]
        },
        // More steps would go here, requiring specific UI selectors we need to verify exist
    ]
};
