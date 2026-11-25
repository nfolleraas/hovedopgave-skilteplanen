UPDATE "Application"
SET "trafficChanges" =
    array_remove("trafficChanges", 'SpeedLimitWorkZoneAndTrafficSafety')
    || ARRAY(
        SELECT change
        FROM unnest(ARRAY['SpeedLimitWorkZone', 'SpeedLimitTrafficSafety']::"TrafficChange"[]) AS component(change)
        WHERE change <> ALL("trafficChanges")
    )
WHERE 'SpeedLimitWorkZoneAndTrafficSafety' = ANY("trafficChanges");
