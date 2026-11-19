import { useState } from "react";
import {
  User,
  Bell,
  Shield,
  Leaf,
  ChevronRight,
  CheckCircle2,
  Save,
} from "lucide-react";

function ToggleSwitch({ value, onChange, label }) {
  return (
    <button
      type="button"
      className={`stg-toggle ${value ? "stg-toggle-on" : ""}`}
      onClick={() => onChange(!value)}
      aria-label={label}
      aria-checked={value}
      role="switch"
    >
      <span className="stg-toggle-knob" />
    </button>
  );
}

function SettingsPage() {
  const [notifications, setNotifications]  = useState(true);
  const [autoAnalysis, setAutoAnalysis]    = useState(false);
  const [highQualityCam, setHighQualityCam] = useState(true);
  const [language, setLanguage]            = useState("en");

  const [emailAlerts, setEmailAlerts]      = useState(true);
  const [weeklySummary, setWeeklySummary]  = useState(false);
  const [systemUpdates, setSystemUpdates]  = useState(true);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TERRASPECTRA WORKSPACE</p>
          <h1>Settings</h1>
          <p className="subtitle">
            Manage your profile and application preferences.
          </p>
        </div>
      </div>

      <div className="stg-layout">

        {/* ── Profile ── */}
        <section className="stg-card">
          <div className="stg-card-header">
            <User size={20} />
            <h3>Profile Information</h3>
          </div>

          <div className="stg-form">
            <div className="stg-field">
              <label htmlFor="stg-name">Full Name</label>
              <input
                id="stg-name"
                type="text"
                defaultValue="Ritik"
                className="stg-input"
              />
            </div>

            <div className="stg-field">
              <label htmlFor="stg-role">Role</label>
              <input
                id="stg-role"
                type="text"
                defaultValue="Frontend Developer"
                className="stg-input"
                disabled
              />
            </div>

            <div className="stg-field">
              <label htmlFor="stg-email">Email Address</label>
              <input
                id="stg-email"
                type="email"
                placeholder="Enter your email"
                className="stg-input"
              />
            </div>

            <div className="stg-field">
              <label htmlFor="stg-org">Farm / Organization</label>
              <input
                id="stg-org"
                type="text"
                placeholder="Enter your farm or organization name"
                className="stg-input"
              />
            </div>

            <button
              type="button"
              className="primary-button"
              style={{ width: "fit-content" }}
              onClick={() =>
                alert(
                  "Profile update will be enabled after backend integration."
                )
              }
            >
              <Save size={16} /> Save Profile
            </button>
          </div>
        </section>

        {/* ── App Preferences ── */}
        <section className="stg-card">
          <div className="stg-card-header">
            <Leaf size={20} />
            <h3>App Preferences</h3>
          </div>

          <div className="stg-toggles">
            <div className="stg-toggle-row">
              <div className="stg-toggle-info">
                <strong>Push Notifications</strong>
                <p>Get alerts when disease analysis is complete</p>
              </div>
              <ToggleSwitch
                value={notifications}
                onChange={setNotifications}
                label="Toggle push notifications"
              />
            </div>

            <div className="stg-toggle-row">
              <div className="stg-toggle-info">
                <strong>Auto-Analyse on Upload</strong>
                <p>
                  Automatically submit images for detection after upload
                </p>
              </div>
              <ToggleSwitch
                value={autoAnalysis}
                onChange={setAutoAnalysis}
                label="Toggle auto-analysis"
              />
            </div>

            <div className="stg-toggle-row">
              <div className="stg-toggle-info">
                <strong>High Quality Camera</strong>
                <p>Use maximum resolution when scanning with camera</p>
              </div>
              <ToggleSwitch
                value={highQualityCam}
                onChange={setHighQualityCam}
                label="Toggle camera quality"
              />
            </div>

            <div className="stg-toggle-row">
              <div className="stg-toggle-info">
                <strong>Language</strong>
                <p>Select your preferred display language</p>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="stg-select"
                aria-label="Language selection"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="bn">বাংলা (Bengali)</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── Notification Preferences ── */}
        <section className="stg-card">
          <div className="stg-card-header">
            <Bell size={20} />
            <h3>Notification Preferences</h3>
          </div>

          <div className="stg-toggles">
            <div className="stg-toggle-row">
              <div className="stg-toggle-info">
                <strong>Disease Alert Emails</strong>
                <p>
                  Receive email when high-severity disease is detected
                </p>
              </div>
              <ToggleSwitch
                value={emailAlerts}
                onChange={setEmailAlerts}
                label="Toggle disease alert emails"
              />
            </div>

            <div className="stg-toggle-row">
              <div className="stg-toggle-info">
                <strong>Weekly Scan Summary</strong>
                <p>Get a digest of all your scans every Monday</p>
              </div>
              <ToggleSwitch
                value={weeklySummary}
                onChange={setWeeklySummary}
                label="Toggle weekly summary"
              />
            </div>

            <div className="stg-toggle-row">
              <div className="stg-toggle-info">
                <strong>System Update Alerts</strong>
                <p>
                  Be notified when new model versions are deployed
                </p>
              </div>
              <ToggleSwitch
                value={systemUpdates}
                onChange={setSystemUpdates}
                label="Toggle system update alerts"
              />
            </div>
          </div>
        </section>

        {/* ── About App ── */}
        <section className="stg-card">
          <div className="stg-card-header">
            <Shield size={20} />
            <h3>About TerraSpectra</h3>
          </div>

          <div className="stg-about-block">
            {[
              { label: "Version",   value: "2.0.0 · Week 2 Build" },
              { label: "Frontend",  value: "React 19 + Vite 8" },
              { label: "Developer", value: "Ritik" },
              { label: "Dataset",   value: "Authentic Agricultural Rice Dataset" },
            ].map(({ label, value }) => (
              <div className="stg-about-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}

            <div className="stg-about-row">
              <span>Status</span>
              <span className="development-tag" style={{ padding: "4px 12px", fontSize: 12 }}>
                <CheckCircle2 size={12} /> Active Development
              </span>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}

export default SettingsPage;
