export const helpContent = {
    '/': {
        title: 'Main Dashboard',
        description: 'Your central hub for monitoring system activity and key metrics.',
        sections: [
            { title: 'Stats Cards', text: 'Quick glance at total counts for projects, tasks, and employees.' },
            { title: 'Attendance Status', text: 'Real-time monitoring of who is currently checked in.' },
            { title: 'Recent Activity', text: 'A live feed of updates to keep you informed of project progress.' }
        ]
    },
    '/dashboard': {
        title: 'Main Dashboard',
        description: 'Your central hub for monitoring system activity and key metrics.',
        sections: [
            { title: 'Stats Cards', text: 'Quick glance at total counts for projects, tasks, and employees.' },
            { title: 'Attendance Status', text: 'Real-time monitoring of who is currently checked in.' },
            { title: 'Recent Activity', text: 'A live feed of updates to keep you informed of project progress.' }
        ]
    },
    '/login': {
        title: 'Portal Access',
        description: 'Secure gateway to the Appnity ERP and Client Ecosystem.',
        sections: [
            { title: 'Employee Sign-In', text: 'Managers and staff can use their work email to access the core CRM.' },
            { title: 'Client Portals', text: 'Clients and Leads should use their respective login links for a tailored experience.' }
        ]
    },
    '/register': {
        title: 'Account Creation',
        description: 'Join the Appnity ecosystem as an associate or partner.',
        sections: [
            { title: 'Email Verification', text: 'Ensure you use a valid work email to receive updates.' },
            { title: 'Role Assignment', text: 'Self-registration usually puts you in the Prospect queue for review.' }
        ]
    },
    '/lead-login': {
        title: 'Lead Portal Login',
        description: 'Track your project proposals and initial consultations.',
        sections: [
            { title: 'Credentials', text: 'Use the email and password provided during your initial registration.' }
        ]
    },
    '/client-login': {
        title: 'Client Portal Login',
        description: 'Access your active project dashboard and team communications.',
        sections: [
            { title: 'Email Sign-In', text: 'Secure access for verified clients to monitor progress.' }
        ]
    },
    '/portal/': {
        title: 'Project & Invoice Portal',
        description: 'Secure external access to your specific project and billing details.',
        sections: [
            { title: 'Project Progress', text: 'Real-time look at how far along the development is.' },
            { title: 'Manage Invoices', text: 'Securely pay outstanding invoices using our integrated payment gateway.' },
            { title: 'Support Tickets', text: 'Raise issues directly from this portal to get priority assistance.' }
        ]
    },
    '/dashboard': {
        title: 'Main Dashboard',
        description: 'Your central hub for monitoring system activity and key metrics.',
        sections: [
            { title: 'Stats Cards', text: 'Quick glance at total counts for projects, tasks, and employees.' },
            { title: 'Attendance Status', text: 'Real-time monitoring of who is currently checked in.' },
            { title: 'Recent Activity', text: 'A live feed of updates to keep you informed of project progress.' }
        ]
    },
    '/projects': {
        title: 'Project Management',
        description: 'Create, monitor, and manage all your active projects and client assignments.',
        sections: [
            { title: 'Project Grid', text: 'Overview of all your projects including their status and progress.' },
            { title: 'Client Assignment', text: 'Link projects to clients to enable communication and billing.' },
            { title: 'Convert Lead', text: 'Easily transition a prospect into a client with full data transfer.' }
        ]
    },
    '/leads': {
        title: 'Lead Pipeline',
        description: 'Track potential customers from initial contact to winning the deal.',
        sections: [
            { title: 'Qualification Stages', text: 'Status labels (In Review, Negotiation, etc.) help manage the sales funnel.' },
            { title: 'Convert Button', text: 'Promptly promote a refined lead to a client once advance payment is received.' }
        ]
    },
    '/finance-analytics': {
        title: 'Financial Insights',
        description: 'Advanced analytics of income, expenses, and overall company profitability.',
        sections: [
            { title: 'Revenue Charts', text: 'Visual representations of income trends over months.' },
            { title: 'Balance Summary', text: 'Current total balance after all expenses and income are logged.' }
        ]
    },
    '/prospect-dashboard': {
        title: 'Prospect Portal',
        description: 'Your dedicated space to track initial requirements and project status.',
        sections: [
            { title: 'Submit Requirements', text: 'A direct way to communicate your project needs to our team.' },
            { title: 'Timeline', text: 'See exactly where your proposal stands in our qualification pipeline.' }
        ]
    },
    '/client-dashboard': {
        title: 'Client Project Portal',
        description: 'Monitor your active projects and communicate with the team.',
        sections: [
            { title: 'Active Projects', text: 'Check the health and progress (percentage) of your projects.' },
            { title: 'Timeline Updates', text: 'Read detailed progress reports and access shared links from managers.' }
        ]
    },
    '/attendance': {
        title: 'Attendance Tracking',
        description: 'Log and monitor work hours and daily presence.',
        sections: [
            { title: 'Check In/Out', text: 'Employees can record their start and end times for the workday.' },
            { title: 'QR Attendance', text: 'A touchless way to mark presence via mobile scanning.' },
            { title: 'Monthly Summary', text: 'View total hours worked and identify attendance patterns.' }
        ]
    },
    '/employees': {
        title: 'Employee Directory',
        description: 'Manage staff profiles, designations, and performance metrics.',
        sections: [
            { title: 'Staff List', text: 'View all active and inactive employees in the organization.' },
            { title: 'Employee Details', text: 'Edit personal information, roles, and assigned departments.' }
        ]
    },
    '/invoices': {
        title: 'Invoice Management',
        description: 'Handle project billing and track payment status.',
        sections: [
            { title: 'Draft Invoices', text: 'Automatically generated milestone invoices waiting for review.' },
            { title: 'Sent/Paid Tracking', text: 'Mark invoices as sent to clients and record when payments are cleared.' }
        ]
    },
    '/expenses': {
        title: 'Expense Tracker',
        description: 'Log and categorize business outgoings.',
        sections: [
            { title: 'Add Expense', text: 'Record new purchases with category and project association.' },
            { title: 'Expense History', text: 'Review past spending to audit project costs.' }
        ]
    },
    '/reports': {
        title: 'Daily Reports',
        description: 'Review end-of-day summaries from all team members.',
        sections: [
            { title: 'Status Feed', text: 'See what each employee accomplished today and any blockers they faced.' },
            { title: 'Feedback', text: 'Admins can leave comments or reviews on specific task reports.' }
        ]
    },
    '/chat': {
        title: 'Internal Messenger',
        description: 'Real-time communication bridge between employees and clients.',
        sections: [
            { title: 'Channels', text: 'Separate conversations for projects to keep discussions organized.' },
            { title: 'Permission Control', text: 'Admins manage who can initiate chats with which clients.' }
        ]
    },
    '/profile': {
        title: 'User Profile',
        description: 'Manage your personal identity and account security settings.',
        sections: [
            { title: 'Avatar & Name', text: 'Update your display name and profile picture for the organization.' },
            { title: 'Reset Password', text: 'Securely change your account password if needed.' },
            { title: 'Work History', text: 'Brief summary of your participation in various projects.' }
        ]
    },
    '/employees/': {
        title: 'Employee Profile',
        description: 'In-depth view of a specific staff member’s details and statistics.',
        sections: [
            { title: 'Performance Stats', text: 'Visual data on attendance trends and report consistency.' },
            { title: 'Account Status', text: 'Admins can activate or deactivate accounts from this page.' }
        ]
    },
    '/clients': {
        title: 'Client Database',
        description: 'A master list of all organizations and individual clients you work with.',
        sections: [
            { title: 'Client Info', text: 'Quick access to contact details and company information.' },
            { title: 'Project Counts', text: 'See how many active projects are associated with each client.' }
        ]
    },
    '/chat/permissions': {
        title: 'Chat Access Control',
        description: 'Manage the bridge between your team and your clients.',
        sections: [
            { title: 'Access Requests', text: 'Employees can request permission to talk to specific clients.' },
            { title: 'Approve/Deny', text: 'Admins grant or revoke communication rights to maintain security.' }
        ]
    },
    '/worklogs': {
        title: 'Activity Logs',
        description: 'Continuous record of specific tasks performed throughout the day.',
        sections: [
            { title: 'Log Entries', text: 'Brief descriptions of work done in blocks of time.' },
            { title: 'Time Tracking', text: 'Essential for auditing billable hours and employee throughput.' }
        ]
    },
    '/payroll': {
        title: 'Payroll Management',
        description: 'Track salary details, bonuses, and payment history.',
        sections: [
            { title: 'Salary Slips', text: 'Employees can view and download their monthly compensation records.' },
            { title: 'Status Tracking', text: 'Admins monitor which internal payments are pending or cleared.' }
        ]
    },
    '/tickets': {
        title: 'Support Desk',
        description: 'Centralized helpdesk for resolving internal and client issues.',
        sections: [
            { title: 'Tickets Feed', text: 'View all issues raised by clients from their external portal.' },
            { title: 'Status Update', text: 'Mark tickets as Open, In Progress, or Resolved.' }
        ]
    },
    '/leaves': {
        title: 'Leave Management',
        description: 'Request time off and track your balance of holidays.',
        sections: [
            { title: 'Apply for Leave', text: 'Submit requests for sick, annual, or casual leaves.' },
            { title: 'Approval Queue', text: 'Admins and Managers can review and action leave requests.' }
        ]
    },
    '/role-access': {
        title: 'System Permissions',
        description: 'Advanced role-based access control (RBAC) settings.',
        sections: [
            { title: 'Module Access', text: 'Define which departments can access Finance, HR, or Project tools.' },
            { title: 'Role Mapping', text: 'Assign users to predefined roles like Admin, Manager, or Employee.' }
        ]
    },
    '/projects/': {
        title: 'Project Insights',
        description: 'A comprehensive view of a project’s lifecycle, team, and financials.',
        sections: [
            { title: 'Timeline & Comments', text: 'Follow the progress and engage in active feedback with clients.' },
            { title: 'Kanban Tasks', text: 'Manage the granular flow of work from To-Do to Done.' },
            { title: 'Financial Summary', text: 'Monitor contract value, payments received, and milestone invoicing.' }
        ]
    }
};
