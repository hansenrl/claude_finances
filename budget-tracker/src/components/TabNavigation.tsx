import type { ReactNode } from 'react';

export type TabId = 'overview' | 'transactions' | 'settings' | 'data-management';

interface Tab {
  id: TabId;
  label: string;
  icon?: string;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'settings', label: 'Settings' },
  { id: 'data-management', label: 'Data Management' },
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex -mb-px" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              px-6 py-3 text-sm font-medium border-b-2 transition-colors
              ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

interface TabPanelProps {
  activeTab: TabId;
  tabId: TabId;
  children: ReactNode;
}

export function TabPanel({ activeTab, tabId, children }: TabPanelProps) {
  if (activeTab !== tabId) {
    return null;
  }

  return <div className="py-6">{children}</div>;
}
