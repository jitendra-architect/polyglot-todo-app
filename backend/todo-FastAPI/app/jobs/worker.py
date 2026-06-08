"""ARQ worker entry point.

Run with:
    python -m app.jobs.worker
or in Docker Compose via the ``worker`` service.
"""

from __future__ import annotations

import logging

from arq import run_worker

from app.jobs.tasks import WorkerSettings

logging.basicConfig(level=logging.INFO)


def main() -> None:
    run_worker(WorkerSettings)  # type: ignore[arg-type]


if __name__ == "__main__":
    main()
