import type { AnalyticsFeature } from '../../../shared/analytics';

/** Never block an action or expose its data/errors to analytics. */
export function recordFeatureUsage(feature: AnalyticsFeature): void {
  void window.api.analyticsFeatureUsed(feature).catch(() => {});
}
