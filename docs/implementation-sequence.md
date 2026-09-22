# Implementation sequence

The first implementation pass should be delivered as small vertical slices in this order:

1. Prepare and validate the existing synthetic dataset, explicitly documenting its limitations.
2. Compare candidate classifiers using only the three sensor features and record evaluation results.
3. Add a server-side weather adapter and the fixed six-hour, 30% gate.
4. Add validated ESP32 telemetry ingestion and freshness checks.
5. Add the ML inference adapter behind the weather gate.
6. Add the final safety/decision layer and recommendation API.
7. Add dashboard reads and visualizations.
8. Add hardware relay integration only after safe actuation rules and manual override behavior are specified.

Do not combine the weather API and ML feature set into one predictive model. Do not treat synthetic labels as field observations.
