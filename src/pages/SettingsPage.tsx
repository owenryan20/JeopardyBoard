import { BuzzInIntegration } from '../components/buzzin/BuzzInIntegration';
import './SettingsPage.css';

export function SettingsPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-subtitle">App preferences and integrations</p>
        </div>
      </header>
      <div className="settings-buzzin-wrap">
        <BuzzInIntegration />
      </div>
    </div>
  );
}
