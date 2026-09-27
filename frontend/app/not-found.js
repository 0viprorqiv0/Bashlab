import ErrorPage from '@/components/shared/ErrorPage';

export const metadata = { title: '404: Page Not Found — BashLab' };

export default function NotFound() {
  return <ErrorPage code="404" message="This page could not be found." />;
}
