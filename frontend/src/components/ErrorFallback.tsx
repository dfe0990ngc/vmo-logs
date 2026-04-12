

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  return (
    <div className="flex justify-center items-center bg-gray-50 px-4 min-h-screen">
      <div className="bg-white shadow-lg p-6 rounded-lg w-full max-w-md text-center">
        <div className="mb-4 text-6xl">😵</div>
        <h2 className="mb-2 font-bold text-gray-900 text-2xl">Oops! Something went wrong</h2>
        <p className="mb-6 text-gray-600">
          We encountered an unexpected error. Please try refreshing the page.
        </p>
        <button
          onClick={resetErrorBoundary}
          className="bg-primary hover:bg-primary/90 px-6 py-3 rounded-lg min-h-[44px] font-medium text-primary-foreground transition-colors"
        >
          Try Again
        </button>
        <details className="mt-4 text-left">
          <summary className="text-gray-500 hover:text-gray-700 text-sm cursor-pointer">
            Technical Details
          </summary>
          <pre className="bg-gray-50 mt-2 p-2 rounded overflow-auto text-gray-600 text-xs">
            {error.message}
          </pre>
        </details>
      </div>
    </div>
  );
}

export default ErrorFallback;