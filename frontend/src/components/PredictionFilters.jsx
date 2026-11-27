/**
 * TerraSpectra — PredictionFilters Component
 *
 * Week 3 Day 3 Deliverable
 *
 * Interactive filter panel for geospatial predictions:
 *   • Filter by Class (Healthy, Stressed Alert, NoData)
 *   • Filter by Scene (dynamically derived from API response)
 *   • Filter by Acquisition Date
 *   • Keyword search by Tile ID or label
 *   • Quick toggle for Stress Alerts Only
 *   • Real-time visible vs total count pill
 *   • One-click reset action
 */

import { Filter, RotateCcw, Search, AlertTriangle, X } from "lucide-react";
import { CLASS_METADATA } from "../types/prediction.js";

export default function PredictionFilters({
  sceneFilter = "all",
  classFilter = "all",
  dateFilter = "all",
  searchQuery = "",
  alertsOnly = false,
  isFiltered = false,
  availableScenes = [],
  availableClasses = [],
  availableDates = [],
  counts = { total: 0, visible: 0, healthy: 0, stressed: 0 },
  onSceneChange,
  onClassChange,
  onDateChange,
  onSearchChange,
  onAlertsOnlyToggle,
  onResetFilters,
}) {
  return (
    <div
      className="prediction-filters-card"
      role="search"
      aria-label="Filter Map Predictions"
    >
      <div className="filters-header">
        <div className="filters-title">
          <Filter size={16} />
          <h4>Spatial & Scene Filters</h4>
        </div>

        <div className="filters-badge-group">
          <span className="count-pill">
            {counts.visible} of {counts.total} visible
          </span>

          {isFiltered && (
            <button
              type="button"
              className="reset-filters-btn"
              onClick={onResetFilters}
              title="Reset all active filters"
              aria-label="Reset all active filters"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="filter-search-box">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          className="filter-search-input"
          placeholder="Filter by Tile ID or Sector..."
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          aria-label="Search by Tile ID or Sector"
        />
        {searchQuery && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={() => onSearchChange?.("")}
            aria-label="Clear search text"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="filters-row">
        {/* Class Filter */}
        <div className="filter-group">
          <label htmlFor="filter-class-select">Class</label>
          <select
            id="filter-class-select"
            className="filter-select"
            value={classFilter}
            onChange={(e) => onClassChange?.(e.target.value)}
          >
            <option value="all">All Classes</option>
            {availableClasses.map((cls) => {
              const meta = CLASS_METADATA[cls.toLowerCase()];
              const label = meta ? meta.name : cls;
              return (
                <option key={cls} value={cls}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Scene Filter (shown if multiple scenes or explicit scene exists) */}
        {availableScenes.length > 0 && (
          <div className="filter-group">
            <label htmlFor="filter-scene-select">Scene</label>
            <select
              id="filter-scene-select"
              className="filter-select"
              value={sceneFilter}
              onChange={(e) => onSceneChange?.(e.target.value)}
            >
              <option value="all">All Scenes ({availableScenes.length})</option>
              {availableScenes.map((scene) => (
                <option key={scene} value={scene}>
                  {scene}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Filter (shown if dates are available) */}
        {availableDates.length > 1 && (
          <div className="filter-group">
            <label htmlFor="filter-date-select">Acquisition Date</label>
            <select
              id="filter-date-select"
              className="filter-select"
              value={dateFilter}
              onChange={(e) => onDateChange?.(e.target.value)}
            >
              <option value="all">All Dates ({availableDates.length})</option>
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Quick Alert Toggle */}
      <div className="filter-quick-toggles">
        <button
          type="button"
          className={`quick-toggle-btn ${alertsOnly ? "active-alert-toggle" : ""}`}
          onClick={() => onAlertsOnlyToggle?.(!alertsOnly)}
          aria-pressed={alertsOnly}
        >
          <AlertTriangle size={13} />
          <span>Stress Alerts Only</span>
          {counts.stressed > 0 && (
            <span className="toggle-count-pill">{counts.stressed}</span>
          )}
        </button>
      </div>
    </div>
  );
}
