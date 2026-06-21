import type { RouteObject } from 'react-router-dom';
import MeetingImport from '../src/pages/MeetingImport';
import SmartSummary from '../src/pages/SmartSummary';
import TaskPriority from '../src/pages/TaskPriority';
import ReportOptimize from '../src/pages/ReportOptimize';
import TaskCenter from '../src/pages/TaskCenter';
import App from '../src/App';

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <MeetingImport /> },
      { path: 'import', element: <MeetingImport /> },
      { path: 'smart-summary', element: <SmartSummary /> },
      { path: 'summary', element: <SmartSummary /> },
      { path: 'priority', element: <TaskPriority /> },
      { path: 'report', element: <ReportOptimize /> },
      { path: 'tasks', element: <TaskCenter /> },
    ],
  },
];

export default appRoutes;
