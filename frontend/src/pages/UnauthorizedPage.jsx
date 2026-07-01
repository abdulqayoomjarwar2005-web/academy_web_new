import { Link } from 'react-router-dom';

const UnauthorizedPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <p className="font-display text-6xl text-ink">403</p>
      <h1 className="mt-4 font-display text-2xl text-ink">Access denied</h1>
      <p className="mt-2 max-w-sm text-sm text-ink/60">
        Your account role does not have permission to view this page.
      </p>
      <Link
        to="/login"
        className="mt-6 rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/90"
      >
        Back to sign in
      </Link>
    </div>
  );
};

export default UnauthorizedPage;
