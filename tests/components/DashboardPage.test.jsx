import {AppProvider} from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const routerMocks = vi.hoisted(() => ({
  loaderData: {},
  submit: vi.fn(),
}));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useFetcher: () => ({
      data: null,
      formData: null,
      state: 'idle',
      submit: routerMocks.submit,
    }),
    useLoaderData: () => routerMocks.loaderData,
    useLocation: () => ({pathname: '/app/dashboard', search: ''}),
  };
});

const {default: DashboardPage} = await import('../../src/pages/DashboardPage');

function renderDashboard(loaderData = {}) {
  routerMocks.loaderData = {
    shop: 'test-shop.myshopify.com',
    appHandle: 'reply-pilot',
    appEnv: 'development',
    isDevelopment: false,
    connections: [],
    judgeMeApiSettingsUrl: 'https://judge.me/settings?jump_to=judge.me+api',
    judgeMeApiDocsUrl: 'https://judge.me/help/en/articles/8409180-judge-me-api',
    yotpoApiSettingsUrl: 'https://support.yotpo.com/docs/finding-your-yotpo-app-key-and-secret-key',
    yotpoApiDocsUrl: 'https://apidocs.yotpo.com/reference/retrieve-all-reviews',
    yotpoCommentDocsUrl: 'https://develop.yotpo.com/reference/comment-on-a-review',
    ...loaderData,
  };

  return render(
    <AppProvider i18n={enTranslations}>
      <DashboardPage />
    </AppProvider>,
  );
}

describe('DashboardPage provider connection form', () => {
  beforeEach(() => {
    routerMocks.submit.mockReset();
  });

  it('switches to Yotpo credentials and submits the Yotpo provider payload', () => {
    renderDashboard();

    const yotpoTile = screen.getByText('Yotpo').closest('.rp-connect-provider-tile');
    fireEvent.click(yotpoTile);

    expect(screen.getByText('2. Enter your Yotpo credentials')).toBeInTheDocument();
    expect(screen.getByText(/App Developer API access token to publish review comments/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Yotpo Store ID / App Key'), {
      target: {value: 'store-123'},
    });
    fireEvent.change(screen.getByLabelText('API secret'), {
      target: {value: 'secret-123'},
    });
    fireEvent.change(screen.getByLabelText('App Developer API access token'), {
      target: {value: 'developer-token-123'},
    });
    fireEvent.click(screen.getByRole('button', {name: 'Test and add Yotpo'}));

    expect(routerMocks.submit).toHaveBeenCalledTimes(1);
    const [formData, options] = routerMocks.submit.mock.calls[0];
    expect(formData.get('intent')).toBe('connect-token');
    expect(formData.get('provider')).toBe('yotpo');
    expect(formData.get('storeId')).toBe('store-123');
    expect(formData.get('apiSecret')).toBe('secret-123');
    expect(formData.get('developerAccessToken')).toBe('developer-token-123');
    expect(options).toMatchObject({method: 'post', action: '/app/dashboard'});
  });
});
