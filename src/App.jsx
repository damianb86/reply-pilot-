import {useEffect, useState} from 'react';
import {BlockStack, Button, Icon, InlineStack, Page, ProgressBar, Text} from '@shopify/polaris';
import {
  AutomationIcon,
  ChartVerticalIcon,
  ChatIcon,
  HomeIcon,
  PageIcon,
  QuestionCircleIcon,
  SettingsIcon,
} from '@shopify/polaris-icons';
import BrandVoicePage from './pages/BrandVoicePage';
import DashboardPage from './pages/DashboardPage';
import HelpPage from './pages/HelpPage';
import LogsPage from './pages/LogsPage';
import ReviewsPage from './pages/ReviewsPage';
import SettingsPage from './pages/SettingsPage';

const navigationItems = [
  {key: 'dashboard', label: 'Dashboard', icon: 'home', path: '/dashboard'},
  {key: 'reviews', label: 'Reviews', icon: 'reviews', path: '/reviews'},
  {key: 'brand-voice', label: 'Brand voice', icon: 'voice', path: '/brand-voice'},
  {key: 'analytics', label: 'Analytics', icon: 'analytics'},
  {key: 'logs', label: 'Logs', icon: 'logs', path: '/logs'},
  {key: 'settings', label: 'Settings', icon: 'settings', path: '/settings'},
  {key: 'help', label: 'Help', icon: 'help', path: '/help'},
];

const iconMap = {
  home: HomeIcon,
  reviews: ChatIcon,
  voice: AutomationIcon,
  analytics: ChartVerticalIcon,
  logs: PageIcon,
  settings: SettingsIcon,
  help: QuestionCircleIcon,
};

function routeKeyFromPath(pathname) {
  if (pathname === '/dashboard') return 'dashboard';
  if (pathname === '/brand-voice') return 'brand-voice';
  if (pathname === '/logs') return 'logs';
  if (pathname === '/settings') return 'settings';
  if (pathname === '/help') return 'help';
  return 'reviews';
}

function NavigationIcon({name}) {
  return <Icon source={iconMap[name]} tone="base" />;
}

function SidebarCard({children}) {
  return <div className="sidebar-support-card">{children}</div>;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState(() => routeKeyFromPath(window.location.pathname));

  useEffect(() => {
    if (window.location.pathname === '/' || window.location.pathname === '') {
      window.history.replaceState({}, '', '/reviews');
      setCurrentPage('reviews');
    }

    function handlePopState() {
      setCurrentPage(routeKeyFromPath(window.location.pathname));
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function navigateTo(path) {
    if (!path || window.location.pathname === path) return;
    window.history.pushState({}, '', path);
    setCurrentPage(routeKeyFromPath(path));
  }

  return (
    <div className="embedded-shell">
      <div className="workspace-shell">
        <aside className="sidebar">
          <div className="sidebar-panel">
            <div className="app-mark">
              <div className="app-mark-badge">
                <Icon source={ChatIcon} tone="base" />
              </div>
              <Text as="span" variant="headingLg">
                Igu
              </Text>
            </div>

            <nav className="sidebar-nav" aria-label="Igu sections">
              {navigationItems.map((item) => {
                const isActive = item.key === currentPage;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`nav-item ${isActive ? 'is-active' : ''}`}
                    onClick={() => navigateTo(item.path)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <NavigationIcon name={item.icon} />
                    <span className="nav-item-label">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="sidebar-support">
              <SidebarCard>
                <BlockStack gap="300">
                  <InlineStack gap="200" blockAlign="center">
                    <div className="status-dot" />
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      Connected to Judge.me
                    </Text>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Connect a review source
                  </Text>
                  <Button fullWidth>View connection</Button>
                </BlockStack>
              </SidebarCard>

              <SidebarCard>
                <BlockStack gap="300">
                  <div>
                    <Text as="p" variant="headingMd">
                      Plan
                    </Text>
                    <Text as="p" variant="bodyMd">
                      Production mode
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Real activity only
                    </Text>
                  </div>
                  <ProgressBar progress={0} size="small" />
                  <Text as="p" variant="bodySm" tone="subdued">
                    No replies sent yet
                  </Text>
                  <Button fullWidth>Manage plan</Button>
                </BlockStack>
              </SidebarCard>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <Page fullWidth>
            {currentPage === 'dashboard' ? <DashboardPage /> : null}
            {currentPage === 'reviews' ? <ReviewsPage /> : null}
            {currentPage === 'brand-voice' ? <BrandVoicePage /> : null}
            {currentPage === 'logs' ? <LogsPage /> : null}
            {currentPage === 'settings' ? <SettingsPage /> : null}
            {currentPage === 'help' ? <HelpPage /> : null}
          </Page>
        </main>
      </div>
    </div>
  );
}
