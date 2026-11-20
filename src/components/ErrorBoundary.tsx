import React from 'react';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from '../firebase/firebase';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isQuotaExceeded: boolean;
  isDailyReadQuota: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      isQuotaExceeded: false,
      isDailyReadQuota: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error?.message || 'Unexpected error occurred.';
    let readable = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.error === 'string') {
        readable = `${parsed.error}${parsed.path ? ` (${parsed.operationType} on ${parsed.path})` : ''}`;
      }
    } catch {
      // Plain error message
    }
    return {
      hasError: true,
      errorMessage: readable,
      isQuotaExceeded: readable.toLowerCase().includes('quota exceeded'),
      isDailyReadQuota: readable.includes(
        "Quota exceeded for quota metric 'Free daily read units per project (free tier database)'"
      ),
    };
  }

  componentDidCatch(error: Error) {
    console.error('Daymark ErrorBoundary caught:', error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const upgradeUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${FIRESTORE_DATABASE_ID}/data?openUpgradeDialog=true`;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F6F8FC] dark:bg-[#111318] text-[#191C20] dark:text-[#E3E5EC]">
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1A1D24] border border-[#DDE3EE] dark:border-[#2B313E] p-6 space-y-4">
          <div className="flex items-center gap-3 text-[#BA1A1A] dark:text-[#FFB4AB]">
            <WarningAmberRoundedIcon />
            <h1 className="font-display text-lg font-bold">Something went wrong</h1>
          </div>

          <p className="text-sm text-[#515864] dark:text-[#9EA6B6] break-words">
            {this.state.errorMessage}
          </p>

          {this.state.isQuotaExceeded && (
            <div className="p-3.5 rounded-2xl bg-[#FFE6C4] dark:bg-[#472B00] text-xs text-[#703F00] dark:text-[#FFE6C4] space-y-1.5">
              <p>
                Your Firestore free-tier daily quota has been reached and resets tomorrow.
              </p>
              {this.state.isDailyReadQuota && (
                <a
                  href={upgradeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold block"
                >
                  Open Firestore database upgrade console
                </a>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full min-h-[46px] rounded-full bg-[#00639B] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshRoundedIcon sx={{ fontSize: 18 }} />
            Reload Daymark
          </button>
        </div>
      </div>
    );
  }
}
