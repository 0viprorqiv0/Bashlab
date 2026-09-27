import ErrorPage from '@/components/shared/ErrorPage';

export const metadata = { title: '403: Access Denied — BashLab' };

export default function Forbidden() {
  return <ErrorPage code="403" message="You do not have permission to access this page." />;
}
