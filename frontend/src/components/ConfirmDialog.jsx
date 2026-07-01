const ConfirmDialog = ({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, isLoading }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-sm rounded-sm bg-white p-6 shadow-lg">
        <h2 className="font-display text-lg text-ink">{title}</h2>
        <p className="mt-2 text-sm text-ink/60">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-sm border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink/5 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-sm bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
