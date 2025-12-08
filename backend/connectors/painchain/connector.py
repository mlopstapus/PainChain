from typing import Dict, Any, Optional
from datetime import datetime
import sys
sys.path.insert(0, '/app')

from shared import ChangeEvent, SessionLocal


class PainChainConnector:
    """PainChain connector that logs frontend configuration changes and user actions"""

    def __init__(self):
        """Initialize PainChain connector"""
        pass

    def test_connection(self) -> bool:
        """Test PainChain connection"""
        return True

    def log_event(
        self,
        db_session,
        connection_id: int,
        event_type: str,
        title: str,
        description: Dict[str, Any],
        author: str = "system",
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Log a PainChain event to the database"""
        try:
            # Create unique event ID based on timestamp and event type
            event_id = f"painchain-{event_type}-{datetime.utcnow().timestamp()}"

            # Check if event already exists (shouldn't happen, but safety check)
            existing = db_session.query(ChangeEvent).filter(
                ChangeEvent.source == "painchain",
                ChangeEvent.event_id == event_id
            ).first()

            if existing:
                print(f"Duplicate PainChain event ID: {event_id}")
                return False

            # Create the change event
            change_event = ChangeEvent(
                connection_id=connection_id,
                source="painchain",
                event_id=event_id,
                title=title,
                description=description,
                author=author,
                timestamp=datetime.utcnow(),
                url=f"/settings",  # Link to settings page
                status="completed",
                event_metadata=metadata or {}
            )

            db_session.add(change_event)
            db_session.commit()

            print(f"Logged PainChain event: {event_type} - {title}")
            return True

        except Exception as e:
            print(f"Failed to log PainChain event: {e}")
            db_session.rollback()
            return False

    def log_connector_created(
        self,
        db_session,
        connection_id: int,
        connector_name: str,
        connector_type: str,
        author: str = "system"
    ):
        """Log connector creation event"""
        return self.log_event(
            db_session=db_session,
            connection_id=connection_id,
            event_type="connector_created",
            title=f"[Connector Created] {connector_name}",
            description={
                "text": f"Created new {connector_type} connector: {connector_name}",
                "connector_type": connector_type,
                "connector_name": connector_name
            },
            author=author,
            metadata={"action": "create", "connector_type": connector_type}
        )

    def log_connector_updated(
        self,
        db_session,
        connection_id: int,
        connector_name: str,
        connector_type: str,
        changes: Dict[str, Any],
        author: str = "system"
    ):
        """Log connector update event"""
        change_summary = ", ".join([f"{k}: {v}" for k, v in changes.items()])
        return self.log_event(
            db_session=db_session,
            connection_id=connection_id,
            event_type="connector_updated",
            title=f"[Connector Updated] {connector_name}",
            description={
                "text": f"Updated {connector_type} connector: {connector_name}",
                "changes": changes,
                "connector_type": connector_type,
                "connector_name": connector_name
            },
            author=author,
            metadata={"action": "update", "connector_type": connector_type, "changes": changes}
        )

    def log_connector_deleted(
        self,
        db_session,
        connection_id: int,
        connector_name: str,
        connector_type: str,
        author: str = "system"
    ):
        """Log connector deletion event"""
        return self.log_event(
            db_session=db_session,
            connection_id=connection_id,
            event_type="connector_deleted",
            title=f"[Connector Deleted] {connector_name}",
            description={
                "text": f"Deleted {connector_type} connector: {connector_name}",
                "connector_type": connector_type,
                "connector_name": connector_name
            },
            author=author,
            metadata={"action": "delete", "connector_type": connector_type}
        )

    def log_connector_enabled(
        self,
        db_session,
        connection_id: int,
        connector_name: str,
        connector_type: str,
        author: str = "system"
    ):
        """Log connector enabled event"""
        return self.log_event(
            db_session=db_session,
            connection_id=connection_id,
            event_type="connector_enabled",
            title=f"[Connector Enabled] {connector_name}",
            description={
                "text": f"Enabled {connector_type} connector: {connector_name}",
                "connector_type": connector_type,
                "connector_name": connector_name
            },
            author=author,
            metadata={"action": "enable", "connector_type": connector_type}
        )

    def log_connector_disabled(
        self,
        db_session,
        connection_id: int,
        connector_name: str,
        connector_type: str,
        author: str = "system"
    ):
        """Log connector disabled event"""
        return self.log_event(
            db_session=db_session,
            connection_id=connection_id,
            event_type="connector_disabled",
            title=f"[Connector Disabled] {connector_name}",
            description={
                "text": f"Disabled {connector_type} connector: {connector_name}",
                "connector_type": connector_type,
                "connector_name": connector_name
            },
            author=author,
            metadata={"action": "disable", "connector_type": connector_type}
        )

    def log_config_changed(
        self,
        db_session,
        connection_id: int,
        connector_name: str,
        field: str,
        old_value: Any,
        new_value: Any,
        author: str = "system"
    ):
        """Log configuration field change event"""
        return self.log_event(
            db_session=db_session,
            connection_id=connection_id,
            event_type="config_changed",
            title=f"[Config Changed] {connector_name} - {field}",
            description={
                "text": f"Changed {field} in {connector_name}",
                "field": field,
                "old_value": str(old_value) if not isinstance(old_value, (str, int, bool, list, dict)) else old_value,
                "new_value": str(new_value) if not isinstance(new_value, (str, int, bool, list, dict)) else new_value,
                "connector_name": connector_name
            },
            author=author,
            metadata={"action": "config_change", "field": field}
        )

    def log_field_visibility_changed(
        self,
        db_session,
        connection_id: int,
        event_type: str,
        field_key: str,
        visible: bool,
        author: str = "system"
    ):
        """Log field visibility change event"""
        return self.log_event(
            db_session=db_session,
            connection_id=connection_id,
            event_type="field_visibility_changed",
            title=f"[Field Visibility Changed] {event_type}",
            description={
                "text": f"Changed field visibility for {event_type}",
                "event_type": event_type,
                "field": field_key,
                "visible": visible
            },
            author=author,
            metadata={"action": "field_visibility_change", "event_type": event_type, "field": field_key, "visible": visible}
        )


def sync_painchain(db_session, config: Dict[str, Any], connection_id: int) -> Dict[str, Any]:
    """
    Sync PainChain connector (called by Celery tasks)

    PainChain doesn't poll external sources - events are logged in real-time.
    This function exists for consistency with other connectors.

    Args:
        db_session: SQLAlchemy database session
        config: Configuration dict
        connection_id: ID of the connection this sync belongs to

    Returns:
        Dict with sync results
    """
    connector = PainChainConnector()

    # Test connection (always succeeds for internal connector)
    if not connector.test_connection():
        return {"error": "PainChain connection test failed"}

    print(f"PainChain connector sync completed for connection {connection_id}")

    return {
        "status": "success",
        "message": "PainChain connector is active and logging events"
    }
