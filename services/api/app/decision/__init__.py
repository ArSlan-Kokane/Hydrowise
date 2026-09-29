"""decision package — weather gate, ML adapter, and safety layer.

Sub-modules (each independently replaceable):
    gate        — rain-probability threshold check.
    ml_adapter  — ML inference protocol + mock/sklearn implementations.
    safety      — final actuation safety check.
    engine      — orchestrates the above into a complete decision pipeline.
"""

from .engine import DecisionEngine
from .gate import GateResult
from .ml_adapter import MLAdapter, MockMLAdapter, SklearnMLAdapter, get_ml_adapter
from .safety import apply_safety

__all__ = [
    "DecisionEngine",
    "GateResult",
    "MLAdapter",
    "MockMLAdapter",
    "SklearnMLAdapter",
    "get_ml_adapter",
    "apply_safety",
]
