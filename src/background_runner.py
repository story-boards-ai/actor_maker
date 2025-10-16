"""
Background runner for long-running tasks.
Allows scripts to continue running even when terminal/tab is closed.
"""

import os
import sys
import logging
import signal
import atexit
from pathlib import Path
from typing import Callable, Any, Optional
import json
from datetime import datetime

logger = logging.getLogger(__name__)


class BackgroundRunner:
    """Runs tasks in the background with status tracking."""
    
    def __init__(self, task_name: str, status_dir: str = "status"):
        """
        Initialize background runner.
        
        Args:
            task_name: Name of the task (used for status file)
            status_dir: Directory to store status files
        """
        self.task_name = task_name
        self.status_dir = Path(status_dir)
        self.status_dir.mkdir(parents=True, exist_ok=True)
        
        self.status_file = self.status_dir / f"{task_name}.json"
        self.pid_file = self.status_dir / f"{task_name}.pid"
        
        # Register cleanup handlers
        atexit.register(self._cleanup)
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)
    
    def run(
        self,
        task_func: Callable,
        *args,
        **kwargs
    ) -> Any:
        """
        Run a task in the background with status tracking.
        
        Args:
            task_func: Function to run
            *args: Positional arguments for task_func
            **kwargs: Keyword arguments for task_func
            
        Returns:
            Result from task_func
        """
        # Write PID file
        self._write_pid()
        
        # Update status: running
        self._update_status("running", progress=0)
        
        try:
            logger.info(f"Starting background task: {self.task_name}")
            
            # Run the task
            result = task_func(*args, **kwargs)
            
            # Update status: completed
            self._update_status("completed", progress=100, result=result)
            logger.info(f"Background task completed: {self.task_name}")
            
            return result
            
        except Exception as e:
            # Update status: failed
            error_msg = str(e)
            self._update_status("failed", error=error_msg)
            logger.error(f"Background task failed: {self.task_name} - {error_msg}")
            raise
    
    def update_progress(self, progress: int, message: str = None):
        """
        Update task progress.
        
        Args:
            progress: Progress percentage (0-100)
            message: Optional progress message
        """
        self._update_status("running", progress=progress, message=message)
    
    def _write_pid(self):
        """Write current process ID to file."""
        pid = os.getpid()
        self.pid_file.write_text(str(pid))
        logger.info(f"Process ID: {pid}")
    
    def _update_status(
        self,
        status: str,
        progress: int = None,
        message: str = None,
        result: Any = None,
        error: str = None
    ):
        """Update status file with current task state."""
        status_data = {
            "task_name": self.task_name,
            "status": status,
            "updated_at": datetime.now().isoformat(),
            "pid": os.getpid(),
        }
        
        if progress is not None:
            status_data["progress"] = progress
        
        if message:
            status_data["message"] = message
        
        if result is not None:
            # Convert result to JSON-serializable format
            if isinstance(result, dict):
                status_data["result"] = result
            else:
                status_data["result"] = str(result)
        
        if error:
            status_data["error"] = error
        
        self.status_file.write_text(json.dumps(status_data, indent=2))
    
    def _cleanup(self):
        """Cleanup PID file on exit."""
        if self.pid_file.exists():
            self.pid_file.unlink()
    
    def _signal_handler(self, signum, frame):
        """Handle termination signals."""
        logger.info(f"Received signal {signum}, cleaning up...")
        self._update_status("cancelled")
        self._cleanup()
        sys.exit(0)
    
    @classmethod
    def get_status(cls, task_name: str, status_dir: str = "status") -> Optional[dict]:
        """
        Get status of a background task.
        
        Args:
            task_name: Name of the task
            status_dir: Directory where status files are stored
            
        Returns:
            Status dictionary or None if not found
        """
        status_file = Path(status_dir) / f"{task_name}.json"
        
        if not status_file.exists():
            return None
        
        try:
            return json.loads(status_file.read_text())
        except Exception as e:
            logger.error(f"Failed to read status file: {e}")
            return None
    
    @classmethod
    def is_running(cls, task_name: str, status_dir: str = "status") -> bool:
        """
        Check if a background task is currently running.
        
        Args:
            task_name: Name of the task
            status_dir: Directory where status files are stored
            
        Returns:
            True if task is running, False otherwise
        """
        status = cls.get_status(task_name, status_dir)
        
        if not status:
            return False
        
        if status.get("status") != "running":
            return False
        
        # Check if process is actually running
        pid = status.get("pid")
        if pid:
            try:
                os.kill(pid, 0)  # Check if process exists
                return True
            except OSError:
                return False
        
        return False


def run_detached(
    script_path: str,
    args: list = None,
    log_file: str = None
):
    """
    Run a Python script detached from the current terminal.
    
    Args:
        script_path: Path to the Python script to run
        args: Command-line arguments for the script
        log_file: Path to log file (default: script_name.log)
    """
    import subprocess
    
    script_path = Path(script_path)
    
    if not script_path.exists():
        raise FileNotFoundError(f"Script not found: {script_path}")
    
    # Default log file
    if not log_file:
        log_file = script_path.parent / f"{script_path.stem}.log"
    
    # Build command
    cmd = [sys.executable, str(script_path)]
    if args:
        cmd.extend(args)
    
    # Run detached
    with open(log_file, 'w') as log:
        process = subprocess.Popen(
            cmd,
            stdout=log,
            stderr=subprocess.STDOUT,
            start_new_session=True,  # Detach from terminal
            cwd=script_path.parent
        )
    
    logger.info(f"Started detached process: PID {process.pid}")
    logger.info(f"Logs: {log_file}")
    
    return process.pid
