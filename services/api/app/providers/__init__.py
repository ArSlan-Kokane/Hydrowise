"""providers package — server-side external data adapters.

Currently contains:
    weather  — WeatherProvider protocol and adapter implementations.

Future adapters (soil-NPK sensor arrays, satellite NDVI feeds, etc.) should
each live in their own module and expose a matching Protocol so they can be
swapped without touching business logic.
"""

from .weather import (
    HttpWeatherProvider,
    MockWeatherProvider,
    WeatherProvider,
    get_weather_provider,
)

__all__ = [
    "WeatherProvider",
    "MockWeatherProvider",
    "HttpWeatherProvider",
    "get_weather_provider",
]
