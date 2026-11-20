import React, { useState } from 'react';
import { Button, Modal } from 'antd';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <Button
        type="primary"
        onClick={install}
        icon={<Download className="w-4 h-4" />}
        className="min-h-[44px] whitespace-nowrap shrink-0"
      >
        {compact ? 'Install' : 'Install App on Phone'}
      </Button>
    );
  }

  return (
    <>
      <Button
        type={compact ? 'default' : 'primary'}
        onClick={() => setShowGuide(true)}
        icon={<Smartphone className="w-4 h-4" />}
        className="min-h-[44px] whitespace-nowrap shrink-0"
      >
        {compact ? 'Install' : 'Install Offline App'}
      </Button>

      <Modal
        open={showGuide}
        onCancel={() => setShowGuide(false)}
        footer={
          <Button type="primary" block onClick={() => setShowGuide(false)} className="min-h-[44px]">
            Got it
          </Button>
        }
        title={isIOS ? 'Install Daymark on iPhone / iPad' : 'Install Daymark on Android'}
        centered
      >
        <div className="space-y-3 py-2 text-sm text-[#525B6B] dark:text-[#94A3B8]">
          {isIOS ? (
            <>
              <p>1. Tap the <strong className="text-[#111827] dark:text-[#F3F6FA]">Share</strong> button in Safari.</p>
              <p>2. Scroll down and tap <strong className="text-[#111827] dark:text-[#F3F6FA]">Add to Home Screen</strong>.</p>
              <p>3. Launch Daymark offline anytime from your home screen.</p>
            </>
          ) : (
            <>
              <p>
                {isAndroid
                  ? 'Open the Chrome menu (three dots) in the top right corner and tap '
                  : 'Open this URL in Chrome on your Android phone, tap the menu (three dots), and choose '}
                <strong className="text-[#111827] dark:text-[#F3F6FA]">Install app</strong> or{' '}
                <strong className="text-[#111827] dark:text-[#F3F6FA]">Add to Home screen</strong>.
              </p>
              <p>
                Daymark caches all assets via its Service Worker and stores goals, work sessions, and
                expenses locally in IndexedDB for 100% offline use.
              </p>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};
