import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PhoneAndroidRoundedIcon from '@mui/icons-material/PhoneAndroidRounded';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
  fullWidth?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  fullWidth = false,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <Button
        variant="contained"
        fullWidth={fullWidth}
        onClick={install}
        startIcon={<DownloadRoundedIcon />}
      >
        {compact ? 'Install' : 'Install App on Phone'}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={compact ? 'outlined' : 'contained'}
        fullWidth={fullWidth}
        onClick={() => setShowGuide(true)}
        startIcon={<PhoneAndroidRoundedIcon />}
      >
        {compact ? 'Install' : 'Install Offline App'}
      </Button>

      <Dialog open={showGuide} onClose={() => setShowGuide(false)} maxWidth="xs" fullWidth>
        <DialogTitle className="font-display font-bold">
          {isIOS ? 'Install Daymark on iPhone' : 'Install Daymark on Android'}
        </DialogTitle>
        <DialogContent>
          <div className="space-y-3 pt-1 text-sm text-[#515864] dark:text-[#9EA6B6]">
            {isIOS ? (
              <>
                <p>
                  1. Tap <strong className="text-[#191C20] dark:text-[#E3E5EC]">Share</strong> in Safari.
                </p>
                <p>
                  2. Tap <strong className="text-[#191C20] dark:text-[#E3E5EC]">Add to Home Screen</strong>.
                </p>
                <p>3. Launch Daymark offline anytime from your home screen.</p>
              </>
            ) : (
              <>
                <p>
                  {isAndroid
                    ? 'Open the Chrome menu (three dots) at the top right and tap '
                    : 'Open this URL in Chrome on Android, tap the menu (three dots), and choose '}
                  <strong className="text-[#191C20] dark:text-[#E3E5EC]">Install app</strong> or{' '}
                  <strong className="text-[#191C20] dark:text-[#E3E5EC]">Add to Home screen</strong>.
                </p>
                <p>
                  Daymark caches assets offline and saves your goals, focus time, and expenses locally on your device.
                </p>
              </>
            )}
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="contained" fullWidth onClick={() => setShowGuide(false)}>
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
