class AnalysisStepError(Exception):
    def __init__(self, step: str, message: str, *, cause: Exception | None = None):
        super().__init__(message)
        self.step = step
        self.message = message
        self.cause = cause

    def to_detail(self) -> dict:
        return {
            "error_type": "ANALYSIS_STEP_ERROR",
            "step": self.step,
            "message": self.message,
            "cause": str(self.cause) if self.cause else None,
        }
