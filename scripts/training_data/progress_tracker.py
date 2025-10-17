"""
Progress tracker for training data evaluation and balancing.
Saves state to disk so processing can be resumed after interruption.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)


class ProgressTracker:
    """Tracks progress of training data evaluation and balancing."""
    
    def __init__(self, progress_file: str = "debug/training_data_evaluation/progress.json"):
        """
        Initialize progress tracker.
        
        Args:
            progress_file: Path to progress file
        """
        self.progress_file = Path(progress_file)
        self.progress_file.parent.mkdir(parents=True, exist_ok=True)
        
        self.state = self._load_state()
        logger.info(f"Progress tracker initialized: {self.progress_file}")
    
    def _load_state(self) -> Dict[str, Any]:
        """Load progress state from disk."""
        if self.progress_file.exists():
            try:
                data = json.loads(self.progress_file.read_text())
                logger.info(f"Loaded existing progress: {data.get('completed_count', 0)}/{data.get('total_count', 0)} actors")
                return data
            except Exception as e:
                logger.error(f"Failed to load progress file: {e}")
        
        # Return empty state
        return {
            "started_at": None,
            "last_updated": None,
            "total_count": 0,
            "completed_count": 0,
            "failed_count": 0,
            "skipped_count": 0,
            "completed_actors": [],
            "failed_actors": [],
            "skipped_actors": [],
            "current_actor": None
        }
    
    def _save_state(self) -> None:
        """Save progress state to disk."""
        try:
            self.state["last_updated"] = datetime.now().isoformat()
            self.progress_file.write_text(json.dumps(self.state, indent=2))
            logger.debug(f"Progress saved: {self.state['completed_count']}/{self.state['total_count']}")
        except Exception as e:
            logger.error(f"Failed to save progress: {e}")
    
    def start(self, total_count: int) -> None:
        """
        Start tracking progress.
        
        Args:
            total_count: Total number of actors to process
        """
        if self.state["started_at"] is None:
            self.state["started_at"] = datetime.now().isoformat()
        
        self.state["total_count"] = total_count
        self._save_state()
        
        logger.info(f"Progress tracking started: {total_count} actors to process")
    
    def mark_processing(self, actor_id: str) -> None:
        """
        Mark an actor as currently being processed.
        
        Args:
            actor_id: Actor ID being processed
        """
        self.state["current_actor"] = actor_id
        self._save_state()
    
    def mark_completed(self, actor_id: str, result: Dict[str, Any]) -> None:
        """
        Mark an actor as completed.
        
        Args:
            actor_id: Actor ID
            result: Processing result
        """
        if actor_id not in self.state["completed_actors"]:
            self.state["completed_actors"].append(actor_id)
            self.state["completed_count"] = len(self.state["completed_actors"])
        
        self.state["current_actor"] = None
        self._save_state()
        
        logger.info(f"✅ Completed {actor_id} ({self.state['completed_count']}/{self.state['total_count']})")
    
    def mark_failed(self, actor_id: str, error: str) -> None:
        """
        Mark an actor as failed.
        
        Args:
            actor_id: Actor ID
            error: Error message
        """
        if actor_id not in self.state["failed_actors"]:
            self.state["failed_actors"].append({
                "actor_id": actor_id,
                "error": error,
                "timestamp": datetime.now().isoformat()
            })
            self.state["failed_count"] = len(self.state["failed_actors"])
        
        self.state["current_actor"] = None
        self._save_state()
        
        logger.warning(f"❌ Failed {actor_id}: {error}")
    
    def mark_skipped(self, actor_id: str, reason: str) -> None:
        """
        Mark an actor as skipped.
        
        Args:
            actor_id: Actor ID
            reason: Reason for skipping
        """
        if actor_id not in self.state["skipped_actors"]:
            self.state["skipped_actors"].append({
                "actor_id": actor_id,
                "reason": reason,
                "timestamp": datetime.now().isoformat()
            })
            self.state["skipped_count"] = len(self.state["skipped_actors"])
        
        self.state["current_actor"] = None
        self._save_state()
        
        logger.info(f"⏭️  Skipped {actor_id}: {reason}")
    
    def is_completed(self, actor_id: str) -> bool:
        """
        Check if an actor has been completed.
        
        Args:
            actor_id: Actor ID
            
        Returns:
            True if completed
        """
        return actor_id in self.state["completed_actors"]
    
    def is_failed(self, actor_id: str) -> bool:
        """
        Check if an actor has failed.
        
        Args:
            actor_id: Actor ID
            
        Returns:
            True if failed
        """
        return any(f["actor_id"] == actor_id for f in self.state["failed_actors"])
    
    def get_remaining_actors(self, all_actors: List[str]) -> List[str]:
        """
        Get list of actors that still need processing.
        
        Args:
            all_actors: List of all actor IDs
            
        Returns:
            List of actor IDs that haven't been completed
        """
        completed_set = set(self.state["completed_actors"])
        return [actor_id for actor_id in all_actors if actor_id not in completed_set]
    
    def get_progress_percentage(self) -> float:
        """Get progress as percentage."""
        if self.state["total_count"] == 0:
            return 0.0
        return (self.state["completed_count"] / self.state["total_count"]) * 100
    
    def get_summary(self) -> Dict[str, Any]:
        """Get progress summary."""
        return {
            "started_at": self.state["started_at"],
            "last_updated": self.state["last_updated"],
            "total": self.state["total_count"],
            "completed": self.state["completed_count"],
            "failed": self.state["failed_count"],
            "skipped": self.state["skipped_count"],
            "remaining": self.state["total_count"] - self.state["completed_count"],
            "progress_percentage": self.get_progress_percentage(),
            "current_actor": self.state["current_actor"]
        }
    
    def print_summary(self) -> None:
        """Print progress summary."""
        summary = self.get_summary()
        
        print("\n" + "="*70)
        print("PROGRESS SUMMARY")
        print("="*70)
        print(f"Started:     {summary['started_at']}")
        print(f"Last update: {summary['last_updated']}")
        print(f"")
        print(f"Total:       {summary['total']} actors")
        print(f"Completed:   {summary['completed']} ({summary['progress_percentage']:.1f}%)")
        print(f"Failed:      {summary['failed']}")
        print(f"Skipped:     {summary['skipped']}")
        print(f"Remaining:   {summary['remaining']}")
        
        if summary['current_actor']:
            print(f"")
            print(f"Currently processing: {summary['current_actor']}")
        
        print("="*70 + "\n")
    
    def reset(self) -> None:
        """Reset progress (start fresh)."""
        self.state = {
            "started_at": None,
            "last_updated": None,
            "total_count": 0,
            "completed_count": 0,
            "failed_count": 0,
            "skipped_count": 0,
            "completed_actors": [],
            "failed_actors": [],
            "skipped_actors": [],
            "current_actor": None
        }
        self._save_state()
        logger.info("Progress reset")
    
    def can_resume(self) -> bool:
        """Check if there's progress to resume."""
        return (
            self.state["started_at"] is not None and
            self.state["completed_count"] > 0 and
            self.state["completed_count"] < self.state["total_count"]
        )
